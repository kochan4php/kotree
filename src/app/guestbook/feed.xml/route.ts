import { getGuestbookEntries } from '@/connections/mongodb';
import { rssDocument } from '@/lib/feed';
import { weakEtag } from '@/lib/http-cache';
import { site } from '@/lib/site';
import { NextResponse } from 'next/server';

// The wall is private-by-default in the sense that messages are obfuscated at
// rest. The feed deliberately carries no message body — only a permalink and
// the admin reply, which is already public — so subscribing never decrypts
// anyone's secret.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await getGuestbookEntries(30);
    const { xml, latest } = rssDocument({
      title: `${site.title} — guestbook`,
      description: 'New secrets on the Kotree guestbook. Open one to reveal it on the wall.',
      homeUrl: `${site.baseUrl}/guestbook`,
      selfUrl: `${site.baseUrl}/guestbook/feed.xml`,
      items: entries.map((entry) => ({
        title: `A secret from ${entry.createdAt.toISOString().slice(0, 10)}`,
        link: `${site.baseUrl}/guestbook#secret-${entry.id}`,
        guid: `${site.baseUrl}/guestbook#secret-${entry.id}`,
        date: entry.createdAt,
        html: `<p>A new secret was left on the wall.</p>${
          entry.reply ? `<p><strong>Reply:</strong> ${entry.reply.message.replace(/[<>&]/g, '')}</p>` : ''
        }<p><a href="${site.baseUrl}/guestbook#secret-${entry.id}">Reveal it on the guestbook</a></p>`,
      })),
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        ETag: weakEtag(xml),
        'Last-Modified': latest.toUTCString(),
      },
    });
  } catch {
    return new NextResponse('Guestbook feed is temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '120' },
    });
  }
}
