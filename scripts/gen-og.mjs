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
const archivoBlack = fs.readFileSync(path.join(__dirname, 'fonts', 'ArchivoBlack-Regular.ttf'));

const div = (children, style) => React.createElement('div', { style }, children);

const content = div(
  [
    div('Kotree', {
      fontSize: 120,
      fontFamily: 'Archivo Black',
      fontWeight: 400,
      color: '#14110f',
      letterSpacing: '-0.02em',
      lineHeight: 1,
      textShadow: '8px 8px 0 #ff7c47',
    }),
    div('All social links of Deo Subarno (Kochan) — Software & Game Developer', {
      fontSize: 40,
      color: '#6f6257',
      marginTop: 24,
      textAlign: 'center',
      maxWidth: '80%',
      fontWeight: 700,
    }),
    div('Deo Subarno • Software and Game Developer', {
      fontSize: 32,
      color: '#a08a76',
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
    backgroundColor: '#fff7e9',
    backgroundImage: 'linear-gradient(135deg, rgba(255,217,61,0.35) 0%, rgba(255,144,232,0.25) 50%, rgba(76,201,240,0.3) 100%)',
  }
);

const img = await new ImageResponse(content, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Archivo Black', data: archivoBlack, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    { name: 'Inter', data: extrabold, weight: 800, style: 'normal' },
  ],
});

const buffer = Buffer.from(await img.arrayBuffer());
const out = path.join(__dirname, '..', 'public', 'og.png');
fs.writeFileSync(out, buffer);
console.log(`og.png generated: ${buffer.length} bytes`);
