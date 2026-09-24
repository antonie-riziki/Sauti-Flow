import {toolRegistry} from '../lib/tool-registry.js';

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({error: 'Method not allowed'});
  return response.status(200).json({
    pwa: {available: true, offline_shell: true},
    native_android_bridge: {available: null, status: 'device_local_handshake', source: 'SautiFlowBridge.getStatus()', browser_fallback: {available: false, status: 'web'}},
    tools: Object.entries(toolRegistry).map(([name, definition]) => ({name, ...definition})),
    privacy: {private_message_cloud_forwarding: 'not required by the PWA planner', financial_actions_require_confirmation: true}
  });
}
