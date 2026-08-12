import { NextResponse } from 'next/server';
import { profile } from '@/data/profile';
import { socialLinks } from '@/data/social-links';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) return new Response('Bad Request', { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Mock fallback if no API key is provided
      return NextResponse.json({
        reply: `[MOCK AI] You asked: "${prompt}". Please add GEMINI_API_KEY to your Vercel/Netlify environment variables to unlock real AI responses.`
      });
    }

    const systemPrompt = `You are the personal AI assistant of ${profile.name} (${profile.handle}). 
Your role is to answer questions on behalf of them based on their profile:
Role: ${profile.role}
Bio: ${profile.bio}
Links: ${socialLinks.map(l => l.name).join(', ')}.
Keep answers short, witty, and in character. Limit to 2 sentences.`;

    // Make direct fetch to Gemini REST API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemPrompt } },
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API Error:', err);
      return NextResponse.json({ reply: '[Error communicating with Gemini]' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '[No response]';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: 'System error. Rebooting...' });
  }
}
