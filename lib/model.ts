export type Role = 'admin' | 'manager' | 'employee';
export type Member = { email: string; name: string; role: Role; walletLimit?: number };
export type Expense = { id: string; merchant: string; description: string; amount: number; category: string; date: string; submittedBy: string; status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; reason?: string };
export type Entry = { id: string; amount: number; note: string; actor: string; date: string; expenseId?: string };
export type Audit = { id: string; actor: string; action: string; date: string };
export type Business = { id: string; name: string; currency: string; suspended: boolean; demo: boolean; members: Member[]; categories: string[]; expenses: Expense[]; ledger: Entry[]; audit: Audit[] };
export type State = { owner: string; businesses: Business[] };
export type View = { email: string; platform: boolean; businesses: Business[] };
export const categories = ['Travel & transport', 'Software & subscriptions', 'Office & supplies', 'Meals & entertainment', 'Marketing', 'Other'];
export const balance = (b: Business) => b.ledger.reduce((sum, e) => sum + e.amount, 0);
export const memberSpend = (b: Business, email: string) => b.expenses.filter(e => e.submittedBy === email && e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
export const memberPending = (b: Business, email: string) => b.expenses.filter(e => e.submittedBy === email && e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
export const memberRemaining = (b: Business, email: string) => {
  const limit = b.members.find(m => m.email === email)?.walletLimit;
  return typeof limit === 'number' ? Math.max(limit - memberSpend(b, email) - memberPending(b, email), 0) : null;
};
export function newBusiness(name: string, currency: string, email: string): Business {
  return { id: crypto.randomUUID(), name, currency, suspended: false, demo: false, members: [{email, name: email.split('@')[0], role:'admin', walletLimit: 100000000}], categories: [...categories], expenses: [], ledger: [], audit: [] };
}
