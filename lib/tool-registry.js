const permissions = {
  contacts: ['READ_CONTACTS'],
  call: ['READ_CONTACTS', 'CALL_PHONE'],
  sms: ['READ_CONTACTS', 'SEND_SMS'],
  messages: ['READ_SMS', 'SEND_SMS'],
  accessibility: ['ACCESSIBILITY_SERVICE'],
  none: []
};

export const toolRegistry = {
  'phone.open_dialer': {description: 'Open the Android phone dialer.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open the Phone app.'},
  'phone.dial_number': {description: 'Prepare a phone number in the Android dialer.', parameters: ['phone_number'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Show the number and ask the user to dial it.'},
  'phone.make_call': {description: 'Start a call after contact or number resolution.', parameters: ['phone_number'], permissions: permissions.call, requiresConfirmation: false, fallback: 'Open ACTION_DIAL with the resolved number.'},
  'contacts.search': {description: 'Search the local Android contacts database.', parameters: ['contact_name'], permissions: permissions.contacts, requiresConfirmation: false, fallback: 'Ask the user for a phone number.'},
  'contacts.resolve': {description: 'Resolve one unambiguous contact, never guessing between matches.', parameters: ['contact_name'], permissions: permissions.contacts, requiresConfirmation: false, fallback: 'Ask the user which matching contact they mean.'},
  'contacts.list': {description: 'List local contacts after explicit permission.', parameters: [], permissions: permissions.contacts, requiresConfirmation: false, fallback: 'Ask the user to grant contacts access.'},
  'sms.open': {description: 'Open the Android messaging application.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Open the Messages app manually.'},
  'sms.compose': {description: 'Prepare an SMS for user review.', parameters: ['recipient', 'message'], permissions: permissions.sms, requiresConfirmation: true, fallback: 'Open the SMS composer with the recipient and message.'},
  'sms.send': {description: 'Send an SMS after explicit user confirmation.', parameters: ['recipient', 'message'], permissions: permissions.sms, requiresConfirmation: true, fallback: 'Leave the SMS prepared for the user to tap Send.'},
  'whatsapp.open': {description: 'Open the installed WhatsApp application.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open WhatsApp.'},
  'whatsapp.compose': {description: 'Prepare a WhatsApp message using a supported deep link or native bridge.', parameters: ['contact_name', 'message'], permissions: permissions.accessibility, requiresConfirmation: true, fallback: 'Open WhatsApp with the message prepared when supported.'},
  'whatsapp.send': {description: 'Send a WhatsApp message only when the native bridge confirms it is allowed.', parameters: ['contact_name', 'message'], permissions: permissions.accessibility, requiresConfirmation: true, fallback: 'Leave the message ready for the user to tap Send.'},
  'messenger.open': {description: 'Open Facebook Messenger.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open Messenger.'},
  'messenger.compose': {description: 'Prepare a Messenger message for review.', parameters: ['contact_name', 'message'], permissions: permissions.accessibility, requiresConfirmation: true, fallback: 'Open Messenger and leave the message prepared.'},
  'messenger.send': {description: 'Send a Messenger message only after native confirmation.', parameters: ['contact_name', 'message'], permissions: permissions.accessibility, requiresConfirmation: true, fallback: 'Leave the message ready for the user to tap Send.'},
  'messages.open': {description: 'Open the Android Messages application.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open Messages.'},
  'messages.read': {description: 'Read an available message through an approved native capability.', parameters: ['contact_name'], permissions: permissions.messages, requiresConfirmation: false, fallback: 'Ask for notification or SMS access.'},
  'messages.compose': {description: 'Prepare an Android message for review.', parameters: ['recipient', 'message'], permissions: permissions.sms, requiresConfirmation: true, fallback: 'Open the native message composer.'},
  'messages.send': {description: 'Send an Android message after explicit confirmation.', parameters: ['recipient', 'message'], permissions: permissions.sms, requiresConfirmation: true, fallback: 'Leave the message prepared for the user.'},
  'ussd.lookup': {description: 'Look up a verified telecom service code.', parameters: ['country', 'operator', 'service'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to provide the network or code.'},
  'ussd.validate': {description: 'Validate a USSD code against the trusted registry.', parameters: ['code', 'source'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Do not execute an unverified code.'},
  'ussd.open_dialer': {description: 'Open the dialer with a verified USSD code.', parameters: ['code'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Show the verified code and ask the user to dial it.'},
  'ussd.execute': {description: 'Attempt native USSD execution where the Android device supports it.', parameters: ['code'], permissions: permissions.none, requiresConfirmation: true, fallback: 'Open the dialer with the code; never claim completion.'},
  'app.open': {description: 'Open an installed Android application.', parameters: ['package_name'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open the application.'},
  'app.detect_installed': {description: 'Check whether an Android application is installed.', parameters: ['package_name'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to install the application.'},
  'system.open_settings': {description: 'Open Android settings for a contextual permission flow.', parameters: ['screen'], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to open Android settings.'},
  'system.back': {description: 'Navigate back through the Android native bridge.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to press Back.'},
  'system.home': {description: 'Navigate to the Android home screen through the native bridge.', parameters: [], permissions: permissions.none, requiresConfirmation: false, fallback: 'Ask the user to press Home.'}
};

export function isRegisteredTool(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(toolRegistry, name);
}
