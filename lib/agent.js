import {isRegisteredTool, toolRegistry} from './tool-registry.js';

function operatorFromText(text) {
  const value = text.toLowerCase();
  if (value.includes('safaricom') || value.includes('m-pesa') || value.includes('mpesa')) return 'Safaricom';
  if (value.includes('airtel')) return 'Airtel Kenya';
  if (value.includes('telkom')) return 'Telkom Kenya';
  return null;
}

function messageFromText(text, marker) {
  const match = text.match(new RegExp(`(?:${marker})\\s+(.+?)(?:\\s+(?:and\\s+)?(?:saying|that|tell(?:\\s+(?:him|her|them))?))\\s+(.+)$`, 'i'));
  return {contact: match?.[1]?.trim() || null, message: match?.[2]?.trim() || null};
}

function smsFromText(text) {
  const direct = text.match(/^(?:send\s+(?:an?\s+)?(?:sms|text)\s+to|(?:sms|text))\s*(\+?\d[\d\s-]{6,}\d)(?:\s+(?:saying|that))?\s+(.+)$/i);
  if (direct) return {contact: direct[1].replace(/[\s-]/g, ''), phoneNumber: direct[1].replace(/[\s-]/g, ''), message: direct[2].trim()};
  const match = text.match(/^(?:send|text|sms)\s+(.+?)(?:\s+(?:an?\s+)?(?:sms|text))?(?:\s+(?:saying|that))?\s+(.+)$/i);
  return {contact: match?.[1]?.trim() || null, message: match?.[2]?.trim() || null};
}

export function plan(intent, tool, entities, requiresConfirmation, assistantMessage, confidence = 0.78) {
  return {intent, entities, target: tool ? tool.split('.')[0].toUpperCase() : 'GENERAL', requires_confirmation: requiresConfirmation, tool, confidence, assistant_message: assistantMessage};
}

export function localPlan(text) {
  const input = String(text || '').trim();
  const value = input.toLowerCase();
  const operator = operatorFromText(input);
  const number = input.match(/(?:^|\s)(\+?\d[\d\s-]{6,}\d)(?:$|\s)/)?.[1]?.replace(/[\s-]/g, '');

  if (/open\s+(my\s+)?(phone|dialer)/i.test(input)) return plan('OPEN_DIALER', 'phone.open_dialer', {}, false, 'I can open the phone dialer through the Android bridge.');
  if (/open\s+(my\s+)?whatsapp/i.test(input)) return plan('OPEN_WHATSAPP', 'whatsapp.open', {}, false, 'I can open WhatsApp through the Android bridge.');
  if (/open\s+(my\s+)?messenger/i.test(input)) return plan('OPEN_MESSENGER', 'messenger.open', {}, false, 'I can open Messenger through the Android bridge.');
  if (/open\s+(my\s+)?(messages?|sms)/i.test(input)) return plan('OPEN_MESSAGES', 'messages.open', {}, false, 'I can open Android Messages through the native bridge.');
  if (/^(dial|call)\s+/i.test(input) && number) return plan('DIAL_NUMBER', 'phone.dial_number', {phone_number: number}, false, `I can prepare ${number} in the Android dialer.`);
  if (/^call\s+/i.test(input)) return plan('MAKE_CALL', 'contacts.resolve', {contact_name: input.replace(/^call\s+/i, '').trim()}, false, 'I can resolve that contact locally, then open the Android dialer.');
  if (/whatsapp/i.test(input)) {
    const {contact, message} = messageFromText(input, 'whatsapp');
    return plan('SEND_MESSAGE', 'whatsapp.compose', {platform: 'WHATSAPP', contact_name: contact, message}, true, 'I can prepare the WhatsApp message, but the Android bridge must confirm the recipient before sending.');
  }
  if (/messenger/i.test(input)) {
    const {contact, message} = messageFromText(input, 'messenger');
    return plan('SEND_MESSAGE', 'messenger.compose', {platform: 'MESSENGER', contact_name: contact, message}, true, 'I can prepare the Messenger message for your review through the Android bridge.');
  }
  if (/^(send|text|sms)\s+/i.test(input)) {
    const {contact, phoneNumber, message} = smsFromText(input);
    return plan('SEND_MESSAGE', 'sms.compose', {platform: 'SMS', recipient: contact, phone_number: phoneNumber, message}, true, 'I can prepare the SMS for your review before sending.');
  }
  if (/buy|purchase|send\s+airtime|pay|mobile\s+money|m-pesa|mpesa/i.test(input)) return plan('FINANCIAL_ACTION', 'ussd.lookup', {country: 'KE', operator, service: 'data'}, true, 'This may change your account or spend money, so I need your confirmation before continuing.');
  if (/balance|ussd|data|airtime/i.test(input)) {
    if (!operator) return plan('CLARIFY_OPERATOR', 'ussd.lookup', {country: 'KE'}, false, 'Which network should I use: Safaricom, Airtel Kenya, or Telkom Kenya?');
    return plan('CHECK_BALANCE', 'ussd.lookup', {country: 'KE', operator, service: value.includes('data') ? 'data' : 'data_balance'}, false, `I can look up the verified ${operator} service and prepare the dialer hand-off.`);
  }
  if (/settings/i.test(input)) return plan('OPEN_SETTINGS', 'system.open_settings', {screen: 'app'}, false, 'I can open the relevant Android settings screen.');
  return plan('UNKNOWN', null, {}, false, 'I did not understand that. Try “Call Mum”, “Open WhatsApp”, or “Check my Airtel data balance.”', 0.2);
}

function cleanModelPlan(candidate) {
  const data = candidate && typeof candidate === 'object' ? candidate : {};
  const tool = isRegisteredTool(data.tool) ? data.tool : null;
  if (!tool) return null;
  const definition = toolRegistry[tool];
  const entities = data.entities && typeof data.entities === 'object' ? data.entities : {};
  const missing = definition.parameters.filter((parameter) => entities[parameter] === undefined || entities[parameter] === null || entities[parameter] === '');
  return {
    intent: typeof data.intent === 'string' ? data.intent.slice(0, 80) : 'UNKNOWN',
    entities,
    target: typeof data.target === 'string' ? data.target.slice(0, 40) : tool.split('.')[0].toUpperCase(),
    requires_confirmation: Boolean(data.requires_confirmation) || definition.requiresConfirmation,
    tool,
    confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.7,
    missing_parameters: missing,
    assistant_message: typeof data.assistant_message === 'string' ? data.assistant_message.slice(0, 500) : definition.description
  };
}

export function parseModelPlan(text) {
  const raw = String(text || '').replace(/```json|```/gi, '').trim();
  try { return cleanModelPlan(JSON.parse(raw)); } catch {
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) { try { return cleanModelPlan(JSON.parse(raw.slice(start, end + 1))); } catch { return null; } }
    return null;
  }
}

export async function understandWithQwen(text, context = {}) {
  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL;
  const model = process.env.QWEN_MODEL;
  if (!apiKey || !apiUrl || !model) return {plan: localPlan(text), provider: 'local-fallback', warning: 'Qwen is not configured; using the offline-safe planner.'};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(apiUrl, {method: 'POST', signal: controller.signal, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`}, body: JSON.stringify({model, temperature: 0, messages: [
      {role: 'system', content: `You are SautiFlow's intent planner. Return JSON only. Never return code, shell commands, or arbitrary tools. Choose exactly one registered tool from: ${Object.keys(toolRegistry).join(', ')}. Preserve private message content only in entities.message. Financial, subscription, message-send, and account-changing actions require confirmation. If the request is ambiguous, choose a clarification-safe plan with missing_parameters.`},
      {role: 'user', content: JSON.stringify({text, context})}
    ]})});
    if (!response.ok) throw new Error(`Qwen returned ${response.status}`);
    const payload = await response.json();
    const parsed = parseModelPlan(payload?.choices?.[0]?.message?.content);
    if (!parsed) throw new Error('Qwen returned an invalid tool plan');
    return {plan: parsed, provider: 'qwen'};
  } catch (error) {
    return {plan: localPlan(text), provider: 'local-fallback', warning: `Qwen unavailable: ${error.name === 'AbortError' ? 'request timed out' : 'request failed'}.`};
  } finally { clearTimeout(timeout); }
}
