import {Capacitor} from '@capacitor/core';

const APP_PACKAGES = {whatsapp: 'com.whatsapp', messenger: 'com.facebook.orca', messages: 'com.google.android.apps.messaging'};

function plugin() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('SautiFlowBridge')) return null;
  return Capacitor.Plugins.SautiFlowBridge;
}

function unavailable() {
  return {success: false, connected: false, platform: Capacitor.getPlatform(), errorCode: 'NATIVE_BRIDGE_UNAVAILABLE', message: "I'm running in the browser, so I can't control Android apps yet."};
}

export function isNativeAndroid() { return Capacitor.getPlatform() === 'android' && Boolean(plugin()); }
export async function getBridgeStatus() { const bridge = plugin(); return bridge ? bridge.getStatus() : {connected: false, platform: Capacitor.getPlatform(), errorCode: 'NATIVE_BRIDGE_UNAVAILABLE'}; }
export async function openApp(packageName) { const bridge = plugin(); return bridge ? bridge.openApp({packageName}) : unavailable(); }
export async function openWhatsApp() { return openApp(APP_PACKAGES.whatsapp); }
export async function openMessenger() { return openApp(APP_PACKAGES.messenger); }
export async function openMessages() { return openApp(APP_PACKAGES.messages); }
export async function openDialer(value = '') { const bridge = plugin(); return bridge ? bridge.openDialer({value}) : unavailable(); }
export async function makeCall(phoneNumber) { const bridge = plugin(); return bridge ? bridge.makeCall({phoneNumber}) : unavailable(); }
export async function composeSms(recipient, message) { const bridge = plugin(); return bridge ? bridge.composeSms({recipient, message}) : unavailable(); }
export async function composeWhatsApp(phoneNumber, message) { const bridge = plugin(); return bridge ? bridge.composeWhatsApp({phoneNumber, message}) : unavailable(); }
export async function executeUssd(code) { const bridge = plugin(); return bridge ? bridge.executeUssd({code}) : unavailable(); }
export async function searchContacts(name) { const bridge = plugin(); return bridge ? bridge.searchContacts({name}) : unavailable(); }
export async function getAccessibilityStatus() { const bridge = plugin(); return bridge ? bridge.getAccessibilityStatus() : {success: false, enabled: false, errorCode: 'NATIVE_BRIDGE_UNAVAILABLE'}; }

export async function executeNativeTool(plan) {
  const entities = plan?.entities || {};
  switch (plan?.tool) {
    case 'whatsapp.open': return openWhatsApp();
    case 'messenger.open': return openMessenger();
    case 'messages.open':
    case 'sms.open': return openMessages();
    case 'phone.open_dialer': return openDialer(entities.value || '');
    case 'phone.dial_number': return openDialer(entities.phone_number || entities.value || '');
    case 'phone.make_call': return makeCall(entities.phone_number || '');
    case 'contacts.search':
    case 'contacts.resolve': {
      const result = await searchContacts(entities.contact_name || entities.name || '');
      if (!result.success || plan.intent !== 'MAKE_CALL') return result;
      if (result.ambiguous) return {...result, errorCode: 'AMBIGUOUS_CONTACT', message: 'I found multiple matching contacts. Which one do you mean?'};
      if (!result.matches?.length) return {...result, errorCode: 'CONTACT_NOT_FOUND', message: 'I could not find that contact.'};
      return makeCall(result.matches[0].phoneNumber);
    }
    case 'sms.compose':
    case 'messages.compose': return composeSms(entities.recipient || entities.phone_number || '', entities.message || '');
    case 'whatsapp.compose': {
      const phone = entities.phone_number || entities.contact_name;
      if (!/^\+?[0-9][0-9\s-]{6,}$/.test(String(phone || ''))) return {success: false, errorCode: 'CONTACT_LOOKUP_REQUIRED', message: 'WhatsApp needs a phone number or a native contact resolver.'};
      return composeWhatsApp(String(phone).replace(/[\s-]/g, ''), entities.message || '');
    }
    case 'ussd.open_dialer': return openDialer(entities.code || '');
    case 'ussd.execute': return executeUssd(entities.code || '');
    default: return {success: false, errorCode: 'NATIVE_TOOL_UNSUPPORTED', message: `The Android bridge does not implement ${plan?.tool || 'this tool'} yet.`};
  }
}
