import {validateRegistryEntry} from '../../lib/ussd-registry.js';

export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed'});
  const result = validateRegistryEntry(request.body || {});
  return response.status(result.valid ? 200 : 422).json(result);
}
