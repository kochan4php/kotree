import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';

// P13: receiving webmentions without a dependency. The only part that needs
// care is the fetch: an unauthenticated source URL is a server-side request
// forgery target, so only public http(s) addresses are allowed and redirects
// are re-checked one hop at a time. The custom lookup pins the address that
// was checked, closing the DNS-rebinding window between check and connect.
const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 8_000;

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(address: string): boolean {
  if (address.includes(':')) {
    const lower = address.toLowerCase();
    // IPv4-mapped IPv6 can hide loopback/RFC1918 as either dotted text or
    // two hex groups; unwrap both before the IPv4 check.
    const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIpv4(dotted[1]);
    const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const high = Number.parseInt(hex[1], 16);
      const low = Number.parseInt(hex[2], 16);
      return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    const compatible = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compatible) return isPrivateIpv4(compatible[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    );
  }
  return isPrivateIpv4(address);
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  if (url.username || url.password) throw new Error('credentials in URL');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('local host');
  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('private address');
  }
}

// The resolver handed to the socket, not just a pre-flight check: the request
// can only connect to an address that passed the same test. Node asks for
// either one address or an array, depending on the socket options.
const publicLookup = ((hostname: string, options: { all?: boolean }, callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void) => {
  lookup(hostname.replace(/^\[|\]$/g, ''), { all: true })
    .then((addresses) => {
      if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
        callback(new Error('private address'), '', 4);
        return;
      }
      const [first] = addresses;
      if (options?.all) callback(null, [first]);
      else callback(null, first.address, first.family);
    })
    .catch((err: Error) => callback(err, '', 4));
}) as LookupFunction;

function requestOnce(url: URL): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = send(
      url,
      {
        method: 'GET',
        lookup: publicLookup,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'KotreeWebmention/1.0 (+https://kotree.fly.dev)',
        },
      },
      resolve,
    );
    request.on('error', reject);
    request.end();
  });
}

async function readLimited(response: IncomingMessage): Promise<string> {
  const type = String(response.headers['content-type'] ?? '');
  if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) {
    response.resume();
    throw new Error('not html');
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buffer);
    total += buffer.byteLength;
    if (total >= MAX_BYTES) {
      response.destroy();
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

// Fetch a public HTML page with manual redirects so every hop is checked.
export async function fetchWebmentionSource(source: string): Promise<string> {
  let current = new URL(source);
  for (let hop = 0; hop < 4; hop += 1) {
    await assertPublicUrl(current);
    const response = await requestOnce(current);
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.headers.location;
      response.resume();
      if (!location) throw new Error('redirect without location');
      current = new URL(location, current);
      continue;
    }
    if (!response.statusCode || response.statusCode >= 400) {
      response.resume();
      throw new Error(`source returned ${response.statusCode ?? 0}`);
    }
    return readLimited(response);
  }
  throw new Error('too many redirects');
}

const decode = (value: string) =>
  value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalise = (value: string) => {
  const url = new URL(value);
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

export interface ParsedWebmention {
  source: string;
  target: string;
  title: string;
  author: string;
  excerpt: string;
}

// Verify that the source actually links to the target, then pull just enough
// metadata to make the inbox readable. Microformats are optional, not required.
export function parseWebmention(html: string, source: string, target: string): ParsedWebmention | null {
  const sourceUrl = new URL(source);
  const wanted = normalise(target);
  let linked = false;
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    try {
      if (normalise(new URL(decode(match[1]), sourceUrl).toString()) === wanted) {
        linked = true;
        break;
      }
    } catch {
      // A malformed href is not a link to us.
    }
  }
  if (!linked) return null;

  const title =
    decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') ||
    decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? '') ||
    new URL(source).hostname;
  const author =
    decode(html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? '') ||
    decode(html.match(/class=["'][^"']*\bp-author\b[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? '') ||
    '';
  const body =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
    '';

  return {
    source: sourceUrl.toString(),
    target: wanted,
    title: title.slice(0, 160),
    author: author.slice(0, 80),
    excerpt: decode(body).slice(0, 320),
  };
}
