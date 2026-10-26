export type Role = 'admin' | 'manager' | 'accountant' | 'employee';
export type AccountStatus = 'invited' | 'active' | 'disabled';
export type BusinessStatus = 'pending' | 'approved' | 'rejected';
export type Permission =
  | 'submit_expenses'
  | 'track_own_expenses'
  | 'review_expenses'
  | 'view_company_wallet'
  | 'manage_wallet'
  | 'manage_team'
  | 'manage_team_members'
  | 'manage_categories'
  | 'view_all_expenses'
  | 'export_reports'
  | 'view_audit_trail';
export type Member = { email: string; name: string; role: Role; walletLimit?: number; accountStatus?: AccountStatus; walletVisible?: boolean; walletVisibilityRequested?: boolean };
export type Expense = { id: string; merchant: string; description: string; amount: number; category: string; date: string; submittedBy: string; status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; reason?: string; reviewNote?: string; payeeName?: string; payeePhone?: string; payeeDetails?: string };
export type Entry = { id: string; amount: number; note: string; actor: string; date: string; expenseId?: string };
export type Audit = { id: string; actor: string; action: string; date: string };
export type Business = { id: string; name: string; currency: string; suspended: boolean; demo: boolean; approvalStatus?: BusinessStatus; rejectionReason?: string; members: Member[]; categories: string[]; expenses: Expense[]; ledger: Entry[]; audit: Audit[] };
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
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'submit_expenses', 'track_own_expenses', 'review_expenses',
    'view_company_wallet', 'manage_wallet', 'manage_team',
    'manage_team_members', 'manage_categories', 'view_all_expenses',
    'export_reports', 'view_audit_trail'
  ],
  manager: [
    'submit_expenses', 'track_own_expenses', 'review_expenses',
    'view_company_wallet', 'manage_team_members', 'view_all_expenses',
    'export_reports', 'view_audit_trail'
  ],
  accountant: [
    'submit_expenses', 'track_own_expenses', 'review_expenses',
    'view_company_wallet', 'view_all_expenses', 'export_reports',
    'view_audit_trail'
  ],
  employee: [
    'submit_expenses', 'track_own_expenses'
  ],
};
export const can = (role: Role | undefined, permission: Permission) => Boolean(role && rolePermissions[role].includes(permission));
export function canManageMemberRole(actorRole: Role | undefined, targetRole: Role): boolean {
  if (actorRole === 'admin') return true;
  if (actorRole === 'manager') return targetRole === 'employee';
  return false;
}
export function newBusiness(name: string, currency: string, email: string, approvalStatus: BusinessStatus = 'approved'): Business {
  return { id: crypto.randomUUID(), name, currency, suspended: false, demo: false, approvalStatus, members: [{email, name: email.split('@')[0], role:'admin', walletLimit: 100000000, accountStatus:'active', walletVisible: true}], categories: [...categories], expenses: [], ledger: [], audit: [] };
}
export type PlatformStats = {
  totalBusinesses: number;
  activeBusinesses: number;
  pendingBusinesses: number;
  suspendedBusinesses: number;
  totalMembers: number;
  totalExpenses: number;
  approvedExpenses: number;
  pendingExpenses: number;
  rejectedExpenses: number;
  approvalRate: number;
  spendByCurrency: Record<string, number>;
  volumeByCurrency: Record<string, number>;
};
export function platformStats(businesses: Business[]): PlatformStats {
  let active = 0, pending = 0, suspended = 0, totalMembers = 0;
  let totalExpenses = 0, approvedExpenses = 0, pendingExpenses = 0, rejectedExpenses = 0;
  const spendByCurrency: Record<string, number> = {};
  const volumeByCurrency: Record<string, number> = {};

  for (const b of businesses) {
    const isPending = (b.approvalStatus || 'approved') === 'pending';
    if (b.suspended) suspended++;
    else if (isPending) pending++;
    else active++;

    totalMembers += (b.members || []).length;
    const curr = b.currency || 'KES';
    spendByCurrency[curr] = (spendByCurrency[curr] || 0);
    volumeByCurrency[curr] = (volumeByCurrency[curr] || 0);

    for (const e of (b.expenses || [])) {
      totalExpenses++;
      volumeByCurrency[curr] = (volumeByCurrency[curr] || 0) + e.amount;
      if (e.status === 'approved') {
        approvedExpenses++;
        spendByCurrency[curr] = (spendByCurrency[curr] || 0) + e.amount;
      } else if (e.status === 'pending') {
        pendingExpenses++;
      } else if (e.status === 'rejected') {
        rejectedExpenses++;
      }
    }
  }

  const decided = approvedExpenses + rejectedExpenses;
  const approvalRate = decided > 0 ? Math.round((approvedExpenses / decided) * 100) : 100;

  return {
    totalBusinesses: businesses.length,
    activeBusinesses: active,
    pendingBusinesses: pending,
    suspendedBusinesses: suspended,
    totalMembers,
    totalExpenses,
    approvedExpenses,
    pendingExpenses,
    rejectedExpenses,
    approvalRate,
    spendByCurrency,
    volumeByCurrency,
  };
}
