import {findOperator, findService, validateRegistryEntry} from '../../lib/ussd-registry.js';

export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed'});
  const {country, operator: operatorValue, service} = request.body || {};
  if (String(country || '').toUpperCase() !== 'KE') return response.status(400).json({error: 'Only Kenya (KE) is currently supported.'});
  const operator = findOperator(operatorValue);
  const entry = findService(operator, service);
  if (!operator || !entry) return response.status(404).json({found: false, error: 'No verified service was found for that operator and service.'});
  const validation = validateRegistryEntry(entry);
  if (!validation.valid) return response.status(409).json({found: false, error: validation.reason});
  return response.status(200).json({found: true, country: 'KE', operator: operator.operator, service: entry.name, ussd: entry.code, source: entry.source, confidence: entry.confidence, notes: entry.notes, verified_at: '2026-09-24', validation});
}
