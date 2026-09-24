export const trustedSourceHosts = ['safaricom.co.ke', 'airtelkenya.com', 'telkom.co.ke'];

// These entries are intentionally narrow and source-backed. The app must not
// invent codes; adding a service requires a trusted operator source and review.
export const telecomRegistry = [
  {
    country: 'KE',
    operator: 'Safaricom',
    aliases: ['safaricom', 'mpesa', 'm-pesa'],
    services: [
      {name: 'data', aliases: ['bundle', 'bundles', 'data balance'], code: '*544#', source: 'https://www.safaricom.co.ke/media-center-landing/terms-and-conditions/terms-and-conditions-for-safaricom-prepay-and-postpay-data-bundles?tmpl=component', confidence: 'high', notes: 'Opens the Safaricom data menu; the user may need to select the balance option.'}
    ]
  },
  {
    country: 'KE',
    operator: 'Airtel Kenya',
    aliases: ['airtel', 'airtel kenya'],
    services: [
      {name: 'data', aliases: ['bundle', 'bundles', 'data balance'], code: '*544#', source: 'https://www.airtelkenya.com/ke/personal/bazuu-bundles', confidence: 'high', notes: 'Opens Airtel data services; the menu may require a final balance selection.'},
      {name: 'bazuu_balance', aliases: ['bazuu', 'bazuu balance'], code: '*544*3#', source: 'https://www.airtelkenya.com/ke/personal/bazuu-bundles', confidence: 'high', notes: 'Airtel identifies this code for checking Bazuu bundle balance.'}
    ]
  },
  {
    country: 'KE',
    operator: 'Telkom Kenya',
    aliases: ['telkom', 'telkom kenya'],
    services: [
      {name: 'data', aliases: ['bundle', 'bundles', 'buy data'], code: '*544#', source: 'https://telkom.co.ke/personal/data-bundles/freedom-bundles/', confidence: 'high', notes: 'Opens Telkom data bundles menu.'},
      {name: 'data_balance', aliases: ['balance', 'bundle balance'], code: '*131#', source: 'https://telkom.co.ke/personal/data-bundles/freedom-bundles/', confidence: 'high', notes: 'Telkom identifies this code for checking bundle balance.'}
    ]
  }
];

export function findOperator(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return telecomRegistry.find((operator) => operator.aliases.includes(normalized));
}

export function findService(operator, value) {
  const normalized = String(value || '').trim().toLowerCase();
  return operator?.services.find((service) => service.name === normalized || service.aliases.includes(normalized));
}

export function validateRegistryEntry(entry) {
  if (!entry?.code || !/^\*[0-9*]+#$/.test(entry.code)) return {valid: false, reason: 'Invalid USSD code format.'};
  let hostname;
  try { hostname = new URL(entry.source).hostname.replace(/^www\./, ''); } catch { return {valid: false, reason: 'Invalid source URL.'}; }
  const validHost = trustedSourceHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  return validHost ? {valid: true, reason: 'Source host is on the trusted operator allow-list.'} : {valid: false, reason: 'Source host is not trusted.'};
}
