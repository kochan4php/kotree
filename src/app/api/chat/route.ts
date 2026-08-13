import { NextResponse } from 'next/server';
import { profile } from '@/data/profile';
import { socialLinks } from '@/data/social-links';
import { guardOrigin } from '@/lib/security';
import { isRateLimited, isGloballyRateLimited, getClientIp } from '@/lib/rate-limit';
import { consumeDailyBudget } from '@/connections/mongodb';

export async function POST(request: Request) {
  // Emergency kill switch: shut the AI off instantly without a redeploy
  if (process.env.CHAT_DISABLED === '1') {
    return new Response('Service Unavailable', { status: 503 });
  }

  // Same protections as the other write endpoints: this burns Gemini quota.
  const forbidden = guardOrigin(request);
  if (forbidden) return forbidden;

  // Reject oversized bodies before parsing (serverless memory protection)
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 4096) {
    return new Response('Payload Too Large', { status: 413 });
  }

  const ip = getClientIp(request);
  // Tighter per-IP cap for chat (burns Gemini quota) + a global budget so a
  // flood spread across many IPs can't drain the quota either
  if (isRateLimited(`chat:${ip}`, 10)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  if (isGloballyRateLimited('chat', 60)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  // Cross-instance daily spend cap (survives cold starts and instance recycling)
  if (!(await consumeDailyBudget('gemini', 500))) {
    return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '3600' } });
  }

  try {
    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') return new Response('Bad Request', { status: 400 });
    const cleanPrompt = prompt.trim().slice(0, 200);
    if (!cleanPrompt) return new Response('Bad Request', { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Mock fallback if no API key is provided
      return NextResponse.json({
        reply: `[MOCK AI] You asked: "${cleanPrompt}". Please add GEMINI_API_KEY to your Vercel/Netlify environment variables to unlock real AI responses.`
      });
    }

    const systemPrompt = `You are the personal AI assistant of ${profile.name} (${profile.handle}). 
Your role is to answer questions on behalf of them based on their profile:
Role: ${profile.role}
Bio: ${profile.bio}
Links: ${socialLinks.map(l => l.name).join(', ')}.
Keep answers short, witty, and in character. Limit to 2 sentences.`;

    // Make direct fetch to Gemini REST API (key via header, not query string)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemPrompt } },
        contents: [{ parts: [{ text: cleanPrompt }] }],
        // Block harmful content server-side (Google's recommended safety config)
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API Error:', err);
      return NextResponse.json({ reply: '[Error communicating with Gemini]' });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    // Type + length hygiene on the model output (defense against runaway replies)
    const reply = typeof raw === 'string' && raw.trim() ? raw.slice(0, 2000) : '[No response]';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: 'System error. Rebooting...' });
  }
}
