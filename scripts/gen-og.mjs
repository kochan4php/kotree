// Pre-renders the social share image at build time (public/og.png).
// Replaces the old runtime /api/og route (satori + Mongo per request,
// which 500'd in production when it couldn't reach Google Fonts).
// Fonts are committed locally so this never touches the network.
import { ImageResponse } from 'next/og.js';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bold = fs.readFileSync(path.join(__dirname, 'fonts', 'inter-bold.ttf'));
const extrabold = fs.readFileSync(path.join(__dirname, 'fonts', 'inter-extrabold.ttf'));

const div = (children, style) => React.createElement('div', { style }, children);

const content = div(
  [
    div('Kotree', {
      fontSize: 120,
      fontWeight: 800,
      color: '#e05a47',
      letterSpacing: '-0.05em',
      lineHeight: 1,
    }),
    div('All social links of Deo Subarno (Kochan) — Software & Game Developer', {
      fontSize: 40,
      color: '#d6bbaa',
      marginTop: 24,
      textAlign: 'center',
      maxWidth: '80%',
      fontWeight: 700,
    }),
    div('Deo Subarno • Software and Game Developer', {
      fontSize: 32,
      color: '#a1a1aa',
      marginTop: 24,
    }),
  ],
  {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16100c',
    backgroundImage: 'linear-gradient(135deg, rgba(224,90,71,0.15) 0%, rgba(22,16,12,1) 100%)',
  }
);

const img = await new ImageResponse(content, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    { name: 'Inter', data: extrabold, weight: 800, style: 'normal' },
  ],
});

const buffer = Buffer.from(await img.arrayBuffer());
const out = path.join(__dirname, '..', 'public', 'og.png');
fs.writeFileSync(out, buffer);
console.log(`og.png generated: ${buffer.length} bytes`);
