export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed'});
  const configured = Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_USSD_SERVICE_CODE);
  return response.status(configured ? 501 : 503).json({
    ok: false,
    status: configured ? 'integration_not_implemented' : 'not_configured',
    message: "Africa's Talking USSD is intentionally not called until its current API contract and callback requirements are configured.",
    required_environment: ['AFRICASTALKING_API_KEY', 'AFRICASTALKING_USERNAME', 'AFRICASTALKING_USSD_SERVICE_CODE', 'AFRICASTALKING_CALLBACK_URL']
  });
}
