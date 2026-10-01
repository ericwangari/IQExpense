type SmsResult = { sent: boolean; skipped?: boolean; error?: string };

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export function hasSmsConfig() {
  return Boolean(accountSid && authToken && fromNumber);
}

export function smsConfigStatus() {
  return {
    hasAccountSid: Boolean(accountSid),
    hasAuthToken: Boolean(authToken),
    hasFromNumber: Boolean(fromNumber),
  };
}

export async function sendSms(to: string | undefined, body: string): Promise<SmsResult> {
  if (!to) return { sent: false, skipped: true, error: 'missing_recipient_phone' };
  if (!hasSmsConfig()) return { sent: false, skipped: true, error: 'missing_twilio_environment_variables' };

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: fromNumber!, Body: body }),
  });

  const payload = await response.text().catch(() => '');

  if (!response.ok) {
    return { sent: false, error: payload || response.statusText };
  }

  console.info('ExpenseIQ SMS sent', { toLast4: to.slice(-4), providerStatus: response.status });
  return { sent: true };
}
