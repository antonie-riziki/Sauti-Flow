import {understandWithQwen} from '../lib/agent.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed'});
  const {text, context = {}} = request.body || {};
  if (typeof text !== 'string' || !text.trim()) return response.status(400).json({error: 'text is required'});
  if (text.length > 2000) return response.status(413).json({error: 'text is too long'});
  const result = await understandWithQwen(text.trim(), context);
  return response.status(200).json({ok: true, ...result, native_execution: 'not_connected_in_pwa'});
}
