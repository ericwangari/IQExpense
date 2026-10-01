type SmsResult = { sent: boolean; skipped?: boolean; error?: string };

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export function hasSmsConfig() {
  return Boolean(accountSid && authToken && fromNumber);
}

export async function sendSms(to: string | undefined, body: string): Promise<SmsResult> {
  if (!to) return { sent: false, skipped: true };
  if (!hasSmsConfig()) return { sent: false, skipped: true };

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: fromNumber!, Body: body }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { sent: false, error: detail || response.statusText };
  }

  return { sent: true };
}
