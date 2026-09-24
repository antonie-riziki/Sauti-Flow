/**
 * Server-side ElevenLabs proxy. Keep ELEVENLABS_API_KEY in Vercel environment
 * variables; it must never be bundled into the browser application.
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });
  const { text, voiceId } = request.body || {};
  if (!text || typeof text !== 'string') return response.status(400).json({ error: 'A text response is required.' });
  if (!process.env.ELEVENLABS_API_KEY) return response.status(503).json({ error: 'Voice service is not configured.' });

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || process.env.ELEVENLABS_VOICE_ID}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY, Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
  });
  if (!upstream.ok || !upstream.body) return response.status(upstream.status).json({ error: 'Voice generation failed.' });
  response.status(upstream.status);
  response.setHeader('Content-Type', 'audio/mpeg');
  response.setHeader('Cache-Control', 'no-store');
  const { Readable } = await import('node:stream');
  return Readable.fromWeb(upstream.body).pipe(response);
}
