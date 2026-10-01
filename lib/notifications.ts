import type { Business, Expense, Member } from './model';
import { sendSms, smsConfigStatus } from './sms';

const smsEligible = (member: Member) =>
  member.accountStatus !== 'disabled' && Boolean(member.smsNotifications && member.phone);

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount / 100);

export async function notifyExpenseSubmitted(business: Business, expense: Expense) {
  const recipients = business.members.filter((member) =>
    smsEligible(member) &&
    member.email !== expense.submittedBy &&
    (member.role === 'admin' || member.role === 'manager')
  );

  if (!recipients.length) {
    console.warn('ExpenseIQ SMS skipped: no eligible approval recipients', {
      businessId: business.id,
      members: business.members.map((member) => ({
        email: member.email,
        role: member.role,
        accountStatus: member.accountStatus,
        hasPhone: Boolean(member.phone),
        smsNotifications: Boolean(member.smsNotifications),
      })),
    });
    return;
  }

  console.info('ExpenseIQ SMS approval notification requested', {
    businessId: business.id,
    recipientCount: recipients.length,
    smsConfig: smsConfigStatus(),
  });

  const body = `ExpenseIQ: ${expense.submittedBy} submitted ${money(expense.amount, business.currency)} at ${expense.merchant}. Open ${business.name} to approve or reject it.`;
  const results = await Promise.allSettled(recipients.map((member) => sendSms(member.phone, body)));
  const failures = results.filter((result) => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error));
  if (failures.length) console.warn('Some SMS approval notifications failed', failures);
}

export async function notifyExpenseReviewed(business: Business, expense: Expense) {
  const submitter = business.members.find((member) => member.email === expense.submittedBy);
  if (!submitter || !smsEligible(submitter)) {
    console.warn('ExpenseIQ SMS skipped: submitter is not eligible for review notification', {
      businessId: business.id,
      submitterEmail: expense.submittedBy,
      hasSubmitter: Boolean(submitter),
      hasPhone: Boolean(submitter?.phone),
      smsNotifications: Boolean(submitter?.smsNotifications),
    });
    return;
  }

  console.info('ExpenseIQ SMS review notification requested', {
    businessId: business.id,
    smsConfig: smsConfigStatus(),
  });

  const decision = expense.status === 'approved' ? 'approved' : 'rejected';
  const reason = expense.reason ? ` Reason: ${expense.reason}` : '';
  const body = `ExpenseIQ: Your ${money(expense.amount, business.currency)} expense at ${expense.merchant} was ${decision}.${reason}`;
  const result = await sendSms(submitter.phone, body);
  if (result.error) console.warn('SMS review notification failed', result.error);
}
