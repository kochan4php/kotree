import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../', import.meta.url); // repo root, from tests/unit/

function isFile(url) {
  try {
    return statSync(fileURLToPath(url)).isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  const base = specifier.startsWith('@/')
    ? new URL(`src/${specifier.slice(2)}`, ROOT)
    : specifier.startsWith('.')
      ? new URL(specifier, context.parentURL)
      : null;

  if (!base) {
    // The API routes only need NextResponse/after; the test shim keeps React
    // and Next internals out of the picture (see next-server-shim.mjs).
    if (specifier === 'next/server') {
      return { url: new URL('./next-server-shim.mjs', import.meta.url).href, shortCircuit: true };
    }
    return await nextResolve(specifier, context);
  }

  const candidates = [base, new URL(`${base.href}.ts`), new URL(`${base.href}.tsx`), new URL(`${base.href}/index.ts`)];
  for (const candidate of candidates) {
    if (isFile(candidate)) return { url: candidate.href, shortCircuit: true };
  }
  return await nextResolve(specifier, context);
}
