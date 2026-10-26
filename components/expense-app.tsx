"use client";

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRight, Bell, Building2, Check,
  ChevronRight, CircleHelp, Clock3, Download, LayoutDashboard, LogOut,
  Plus, Receipt, Search, ShieldCheck, Tags, Users, Wallet, X, Activity,
  Layers3, RefreshCw, Server, Gauge, Trash2, Edit3, UserCheck, UserX,
  AlertTriangle, Smartphone, CreditCard, Landmark, FileText, Paperclip
} from 'lucide-react';

import {
  Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarRail
} from '@/components/ui/sidebar';

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import {
  balance, can, rolePermissions, memberPending, memberRemaining, memberSpend,
  canManageMemberRole, platformStats, type Business, type Expense, type Member, type Role, type View
} from '@/lib/model';
import { demoState } from '@/lib/demo';
import { mutate, visibleState } from '@/lib/operations';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { MobileAppLock } from '@/components/mobile-app-lock';

const money = (n: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n / 100);

const shortDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const payeeName = (e: Expense) => e.payeeName || e.merchant;
const payeePhone = (e: Expense) => e.payeePhone || 'Not provided';
const weekKey = (date: string) => {
  const d = new Date(`${date}T00:00:00`), day = (d.getDay() + 6) % 7, monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toISOString().slice(0, 10);
};
const reportPeriod = (e: Expense, group: string) =>
  group === 'day' ? e.date : group === 'week' ? `Week of ${weekKey(e.date)}` : group === 'month' ? e.date.slice(0, 7) : 'All expenses';

const palettes = ['#3566ed', '#20a995', '#f2ac43', '#9a72df', '#e17a94', '#71839e'];

const nav = [
  ['Overview', LayoutDashboard],
  ['Expenses', Receipt],
  ['Approvals', ShieldCheck],
  ['Wallet', Wallet],
  ['Categories', Tags],
  ['Team', Users],
  ['Activity', Activity]
] as const;

const platformNav = [
  ['Overview', LayoutDashboard],
  ['Businesses', Building2],
  ['Activity', Activity]
] as const;

type HealthInfo = {
  status: 'operational' | 'degraded';
  database: 'connected' | 'standby' | 'error';
  dbLatencyMs: number;
  apiLatencyMs: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
  timestamp: string;
};

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Status({ status }: { status: string }) {
  const label = status === 'pending'
    ? 'Pending approval'
    : status === 'operational'
    ? 'Operational'
    : status === 'standby'
    ? 'Standby preview'
    : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`status ${status}`}><span />{label}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><Receipt size={28} /><p>{text}</p></div>;
}

function Stat({ label, value, detail, icon: Icon, blue = false }: { label: string; value: string; detail: string; icon: typeof Wallet; blue?: boolean }) {
  return (
    <div className={`stat ${blue ? 'stat-blue' : ''}`}>
      <div className="stat-label">{label}<Icon size={19} /></div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!hasSupabaseBrowserConfig()) return {};
  const { data } = await getSupabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ExpenseApp({ platformOnly = false }: { platformOnly?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [page, setPage] = useState(platformOnly ? 'Overview' : 'Overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [auditQuery, setAuditQuery] = useState('');
  const [reportGroup, setReportGroup] = useState('day');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState<Expense | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [accountStatus, setAccountStatus] = useState('invited');
  const [currency, setCurrency] = useState('KES');
  const [demo, setDemo] = useState<ReturnType<typeof demoState> | null>(null);

  // Enhanced Expense Submission States
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('mpesa');
  const [purpose, setPurpose] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [receiptAttachment, setReceiptAttachment] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');

  // Platform Performance & Diagnostics
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const start = performance.now();
      const r = await fetch('/api/platform/health');
      const clientLatency = Math.round(performance.now() - start);
      if (r.ok) {
        const json = await r.json() as HealthInfo;
        setHealth({ ...json, apiLatencyMs: Math.max(json.apiLatencyMs, clientLatency) });
        toast.success(`Platform health: ${json.status} (${clientLatency}ms)`);
      } else {
        toast.error('Health check returned non-200');
      }
    } catch {
      toast.error('Platform health check unavailable');
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const headers = await authHeaders();
      const r = await fetch('/api/workspace', { headers });
      let body: (View & { error?: string }) | null = null;
      try {
        body = (await r.json()) as View & { error?: string };
      } catch {
        body = null;
      }

      if (!r.ok) {
        const isPreviewEnv = typeof window !== 'undefined' && (
          ['localhost', '127.0.0.1', 'terminal.local'].includes(window.location.hostname) ||
          window.location.hostname.includes('sandbox') ||
          window.location.hostname.includes('webcontainer') ||
          window.location.hostname.includes('preview') ||
          !hasSupabaseBrowserConfig()
        );

        if (r.status === 401 && isPreviewEnv) {
          const state = demoState('you@acacia.example');
          if (live) {
            setDemo(state);
            setData(visibleState(state, state.owner));
            setPreview(true);
          }
          return;
        }
        throw new Error(body?.error || `Request failed (${r.status})`);
      }
      if (live && body) setData(body);
    })().catch(e => {
      if (live) setError(e instanceof Error ? e.message : 'Failed to load workspace');
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!platformOnly && !data?.platform) return;
    let live = true;
    fetch('/api/platform/health')
      .then(async r => {
        if (!r.ok) return null;
        return (await r.json()) as HealthInfo;
      })
      .then(json => {
        if (live && json) setHealth(json);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [platformOnly, data?.platform]);

  const business = data?.businesses.find(b => b.id === activeId) || data?.businesses[0];
  const me = business?.members.find(m => m.email === data?.email), myRole = me?.role;
  const canReview = can(myRole, 'review_expenses'),
    canAdmin = myRole === 'admin',
    canManageAccounts = can(myRole, 'manage_team') || can(myRole, 'manage_team_members'),
    canViewWallet = can(myRole, 'view_company_wallet'),
    canManageCategories = can(myRole, 'manage_categories'),
    isEmployee = myRole === 'employee';
  const walletVisibleToMe = !isEmployee || Boolean(me?.walletVisible);
  const nameOf = (email: string) => business?.members.find(m => m.email === email)?.name || email;

  const workspaceNav = nav.filter(([label]) =>
    label === 'Approvals' ? canReview :
    label === 'Wallet' ? canViewWallet :
    label === 'Categories' ? canManageCategories || canViewWallet :
    label === 'Team' ? canManageAccounts || canAdmin : true
  );

  const pending = business?.expenses.filter(e => e.status === 'pending') || [];
  const reviewable = pending.filter(e => canAdmin || e.submittedBy !== data?.email);
  const approved = business?.expenses.filter(e => e.status === 'approved') || [];

  const spend = approved.reduce((s, e) => s + e.amount, 0);
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);
  const allocated = business?.ledger.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0) || 0;
  const allowance = business ? memberRemaining(business, data?.email || '') : null;
  const mySpend = business && data ? memberSpend(business, data.email) : 0;
  const myPending = business && data ? memberPending(business, data.email) : 0;
  const currentNumAmount = parseFloat(expenseAmount) || 0;
  const currentAmountCents = Math.round(currentNumAmount * 100);

  // Platform Admin Aggregates
  const stats = platformStats(data?.businesses || []);
  const platformAuditEvents = (data?.businesses || [])
    .flatMap(b => (b.audit || []).map(a => ({ ...a, businessName: b.name })))
    .sort((a, b) => b.date.localeCompare(a.date));

  function navigate(next: string) {
    setPage(next);
    setQuery('');
    setFilter('all');
    setCategoryFilter('all');
    setMemberRoleFilter('all');
    setAuditQuery('');
  }

  function open(name: string, expense: Expense | null = null, member: Member | null = null) {
    setFormError('');
    setSelected(expense);
    setSelectedMember(member);
    if (member) {
      setRole(member.role);
      setAccountStatus(member.accountStatus || 'invited');
    } else {
      setRole('employee');
      setAccountStatus('invited');
    }
    setCategory(business?.categories[0] || '');
    if (name === 'expense') {
      setExpenseAmount('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('mpesa');
      setPurpose('');
      setReceiptNumber('');
      setReceiptAttachment('');
      setReceiptFileName('');
    }
    setModal(name);
  }

  async function signOut() {
    if (hasSupabaseBrowserConfig()) await getSupabaseBrowser().auth.signOut();
    setData(null);
    setDemo(null);
    router.push('/login');
  }

  async function act(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      if (preview && demo) {
        const next = structuredClone(demo);
        mutate(next, data!.email, { businessId: business?.id, ...payload });
        setDemo(next);
        setData(visibleState(next, data!.email));
      } else {
        const headers = await authHeaders();
        const response = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ businessId: business?.id, ...payload })
        });
        const body = await response.json() as View & { error?: string };
        if (!response.ok) throw new Error(body.error);
        setData(body);
      }
      toast.success(
        payload.action === 'review' ? 'Expense decision recorded' :
        payload.action === 'cancelExpense' ? 'Pending expense cancelled' :
        payload.action === 'deleteCategory' ? 'Category removed' :
        payload.action === 'removeMember' ? 'Team member updated' :
        payload.action === 'toggleAccountStatus' ? 'Account status updated' :
        'Changes saved'
      );
      setModal('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to save. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const amount = Number(fields.amount), cents = Math.round(amount * 100);
    const limit = Number(fields.walletLimit), limitCents = Math.round(limit * 100);

    if ('amount' in fields && (!Number.isFinite(amount) || Math.abs(amount * 100 - cents) > 0.00001)) {
      setFormError('Enter an amount with at most two decimal places.');
      return;
    }
    if ('walletLimit' in fields && fields.walletLimit !== '' && (!Number.isFinite(limit) || Math.abs(limit * 100 - limitCents) > 0.00001)) {
      setFormError('Enter a wallet limit with at most two decimal places.');
      return;
    }

    const payload =
      modal === 'expense' ? {
        action: 'submit',
        ...fields,
        amount: cents,
        category,
        date: fields.date || expenseDate,
        description: fields.description || purpose,
        paymentMethod: fields.paymentMethod || paymentMethod,
        receiptNumber: fields.merchant || fields.receiptNumber || receiptNumber || undefined,
        receiptAttachment: receiptAttachment || undefined,
        merchant: fields.merchant || fields.payeeName || 'Business Expense',
        payeeName: fields.payeeName || fields.merchant || 'Business Expense',
      } :
      modal === 'allocate' ? { action: 'allocate', ...fields, amount: cents } :
      modal === 'category' ? { action: 'category', ...fields } :
      modal === 'member' ? { action: 'member', ...fields, email: selectedMember ? selectedMember.email : fields.email, role, accountStatus, walletLimit: fields.walletLimit === '' ? undefined : limitCents } :
      modal === 'business' ? { action: 'registerBusiness', ...fields, currency } :
      modal === 'rejectBusiness' ? { action: 'reviewBusiness', businessId: activeId, status: 'rejected', ...fields } :
      modal === 'approveWithNote' ? { action: 'review', expenseId: selected?.id, status: 'approved', reviewNote: fields.reviewNote } :
      { action: 'review', expenseId: selected?.id, status: 'rejected', ...fields };

    void act(payload);
  }

  // Enhanced Expense Filtering & Search
  const filtered = (page === 'Approvals' ? (canReview ? pending : []) : business?.expenses || []).filter(e => {
    const matchesStatus = filter === 'all' || e.status === filter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const searchTarget = `${e.merchant} ${payeeName(e)} ${e.payeePhone || ''} ${e.payeeDetails || ''} ${e.category} ${e.description} ${e.submittedBy} ${(e.amount / 100).toFixed(2)}`.toLowerCase();
    const matchesQuery = query === '' || searchTarget.includes(query.toLowerCase());
    return matchesStatus && matchesCategory && matchesQuery;
  });

  // Enhanced Team Member Filtering & Search
  const filteredMembers = (business?.members || []).filter(m => {
    const matchesRole = memberRoleFilter === 'all' || m.role === memberRoleFilter;
    const searchTarget = `${m.name} ${m.email} ${m.role} ${m.accountStatus || 'invited'}`.toLowerCase();
    const matchesQuery = query === '' || searchTarget.includes(query.toLowerCase());
    return matchesRole && matchesQuery;
  });

  // Filtered Audit Events
  const filteredBusinessAudit = (business?.audit || []).filter(a => {
    const searchTarget = `${a.action} ${a.actor} ${nameOf(a.actor)}`.toLowerCase();
    return auditQuery === '' || searchTarget.includes(auditQuery.toLowerCase());
  });

  const filteredBusinesses = (data?.businesses || []).filter(b => {
    const adminEmail = b.members.find(m => m.role === 'admin')?.email || '';
    const matchesQuery = query === '' || `${b.name} ${adminEmail} ${b.currency}`.toLowerCase().includes(query.toLowerCase());
    const status = b.suspended ? 'suspended' : b.approvalStatus || 'approved';
    const matchesFilter = filter === 'all' || status === filter;
    return matchesQuery && matchesFilter;
  });

  function exportExpenses() {
    if (!business) return;
    const safe = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""')}"`;
    const csv = [
      ['Report period', 'Payee name', 'Payee contact', 'Payee details', 'Merchant / reference', 'Amount', 'Currency', 'Category', 'Date', 'Submitted by', 'Status', 'Business purpose'],
      ...filtered.map(e => [reportPeriod(e, reportGroup), payeeName(e), payeePhone(e), e.payeeDetails || '', e.merchant, (e.amount / 100).toFixed(2), business.currency, e.category, e.date, e.submittedBy, e.status, e.description])
    ].map(row => row.map(safe).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseiq-expenses-${reportGroup}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportExpensesPdf() {
    if (!business) return;
    const escapePdf = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const fit = (value: string, length: number) => value.length > length ? `${value.slice(0, length - 1)}...` : value;
    const reportTitle = page === 'Approvals' ? 'Expense approval report' : 'Expense report';
    const generated = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    const grouped = filtered.reduce((map, e) => {
      const key = reportPeriod(e, reportGroup);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
      return map;
    }, new Map<string, Expense[]>());
    const pages: string[][] = [];
    let current: string[] = [];
    const add = (line: string) => { current.push(line); if (current.length >= 32) { pages.push(current); current = []; } };
    add(`${reportTitle} - ${business.name}`);
    add(`Generated: ${generated}`);
    add(`Grouping: ${reportGroup.charAt(0).toUpperCase() + reportGroup.slice(1)}    Currency: ${business.currency}    Expenses: ${filtered.length}    Total: ${money(total, business.currency)}`);
    add('');
    if (!filtered.length) add('No expenses match the current filters.');
    [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([period, items]) => {
      const subtotal = items.reduce((sum, e) => sum + e.amount, 0);
      add(`${period}  |  ${items.length} expenses  |  ${money(subtotal, business.currency)}`);
      add('Payee / Contact                 Amount            Category              Date        Submitted by          Status');
      add('------------------------------------------------------------------------------------------------');
      items.forEach(e => {
        add(`${fit(payeeName(e), 26).padEnd(31)}${fit(money(e.amount, business.currency), 16).padEnd(18)}${fit(e.category, 18).padEnd(22)}${shortDate(e.date).padEnd(12)}${fit(nameOf(e.submittedBy), 18).padEnd(22)}${e.status}`);
        const payeeExtras = [e.payeePhone, e.payeeDetails].filter(Boolean).join(' | ');
        if (payeeExtras) add(`  Details: ${fit(payeeExtras, 86)}`);
      });
      add('');
    });
    if (current.length) pages.push(current);
    const objects: string[] = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    pages.forEach((lines, pageIndex) => {
      const content = lines.map((line, i) => `BT /F1 ${i < 1 ? 16 : 9} Tf 40 ${800 - i * 22} Td (${escapePdf(line)}) Tj ET`).join('\n') + `\nBT /F1 8 Tf 40 28 Td (${escapePdf(`ExpenseIQ Business - Page ${pageIndex + 1} of ${pages.length}`)}) Tj ET`;
      const contentObject = 5 + pageIndex * 2;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const startxref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseiq-expenses-${reportGroup}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportLedger() {
    if (!business) return;
    const safe = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""')}"`;
    const headers = ['Transaction Date', 'Type', 'Reference / Description', 'Recorded By', 'Amount', 'Currency'];
    const rows = [...business.ledger].sort((a, b) => b.date.localeCompare(a.date)).map(e => [
      shortDate(e.date),
      e.amount > 0 ? 'Budget Allocation' : 'Approved Expense Deduction',
      e.note,
      nameOf(e.actor),
      (Math.abs(e.amount) / 100).toFixed(2),
      business.currency
    ]);
    const csv = [headers, ...rows].map(row => row.map(safe).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseiq-wallet-ledger-${business.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Wallet ledger exported');
  }

  function exportPlatformReport() {
    if (!data?.businesses) return;
    const safe = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""')}"`;
    const headers = ['Business Name', 'Currency', 'Status', 'Admin Email', 'Team Seats', 'Total Expenses', 'Approved Expenses', 'Approved Volume', 'Pending Count'];
    const rows = data.businesses.map(b => {
      const admin = b.members.find(m => m.role === 'admin')?.email || 'N/A';
      const approvedExp = b.expenses.filter(e => e.status === 'approved');
      const approvedSum = approvedExp.reduce((s, e) => s + e.amount, 0);
      const pendingCount = b.expenses.filter(e => e.status === 'pending').length;
      return [
        b.name,
        b.currency,
        b.suspended ? 'suspended' : b.approvalStatus || 'approved',
        admin,
        String(b.members.length),
        String(b.expenses.length),
        String(approvedExp.length),
        (approvedSum / 100).toFixed(2),
        String(pendingCount)
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(safe).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenseiq-platform-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Platform performance summary exported');
  }

  if (!data) return (
    <main className="loading">
      <div className="brandmark"><Layers3 /></div>
      <h1>ExpenseIQ <span>Business</span></h1>
      <p>{error || 'Opening your workspace…'}</p>
      {error ? (
        <div className="auth-actions">
          <Link className="primary" href="/login">Login</Link>
          <Link className="secondary" href="/signup">Create account</Link>
        </div>
      ) : (
        <div className="loading-bar" />
      )}
    </main>
  );

  if (platformOnly && !data.platform) return (
    <main className="loading">
      <div className="brandmark"><ShieldCheck /></div>
      <h1>Platform admin login required</h1>
      <p>This dashboard is locked to the single platform admin account. Business admins, managers, and team members can only access their approved business workspace.</p>
      <div className="auth-actions">
        <Link className="primary" href="/">Go to my workspace</Link>
        <button className="secondary" onClick={() => void signOut()}>Sign in as platform admin</button>
      </div>
    </main>
  );

  if (!business && !platformOnly) return (
    <main className="loading">
      <div className="brandmark"><ShieldCheck /></div>
      <h1>{data.platform ? 'Platform ready' : 'Register your business'}</h1>
      <p>{data.platform ? 'Open the platform dashboard to review business registrations and monitor SaaS operations.' : 'Create your business registration. The platform admin will approve it before your workspace opens.'}</p>
      <div className="auth-actions">
        {data.platform ? <Link className="primary" href="/platform">Open platform dashboard</Link> : <button className="primary" onClick={() => open('business')}>Register business</button>}
        <Link className="secondary" href="/login">Use another account</Link>
      </div>
      <Dialog open={modal === 'business'} onOpenChange={v => { if (!v && !busy) setModal(''); }}>
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>Register your business</DialogTitle>
            <DialogDescription>Send your business for platform admin approval. Once approved, you can add managers and team members.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="app-form">
            <label>Business name<input name="name" required maxLength={80} placeholder="e.g. Acacia Technologies" /></label>
            <label>Wallet currency<Choice label="Currency" value={currency} onChange={setCurrency} options={['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'].map(c => ({ value: c, label: c }))} /></label>
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <div className="form-actions">
              <button className="secondary" type="button" disabled={busy} onClick={() => setModal('')}>Cancel</button>
              <button className="primary" disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit for approval'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster position="bottom-right" richColors />
    </main>
  );

  if (business && !platformOnly && (business.approvalStatus || 'approved') !== 'approved') return (
    <main className="loading">
      <div className="brandmark"><Building2 /></div>
      <h1>{business.approvalStatus === 'rejected' ? 'Registration rejected' : 'Registration pending'}</h1>
      <p>{business.approvalStatus === 'rejected' ? business.rejectionReason || 'The platform admin rejected this registration.' : 'Your business registration is waiting for platform admin approval. You can access the workspace after approval.'}</p>
      <div className="auth-actions">
        <Link className="primary" href="/login">Refresh login</Link>
        <Link className="secondary" href="/">Workspace home</Link>
      </div>
    </main>
  );

  const transactions = (items: Expense[], review = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Expense</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Submitted by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="numeric">Amount</TableHead>
          <TableHead>Status</TableHead>
          {review ? <TableHead>Review</TableHead> : <TableHead>Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(e => (
          <TableRow key={e.id}>
            <TableCell>
              <button className="merchant" onClick={() => open('details', e)}>
                <span className="merchant-icon" style={{ background: palettes[Math.max(business?.categories.indexOf(e.category) || 0, 0) % 6] + '15', color: palettes[Math.max(business?.categories.indexOf(e.category) || 0, 0) % 6] }}>{e.merchant.slice(0, 1)}</span>
                <span>{e.merchant}<small>EXP-{e.id.slice(-5).toUpperCase()}</small></span>
              </button>
            </TableCell>
            <TableCell><span className="category-label">{payeeName(e)}<small>{payeePhone(e)}</small></span></TableCell>
            <TableCell><span className="category-label">{e.category}</span></TableCell>
            <TableCell>{nameOf(e.submittedBy)}</TableCell>
            <TableCell className="muted nowrap">{shortDate(e.date)}</TableCell>
            <TableCell className="numeric amount">{money(e.amount, business?.currency)}</TableCell>
            <TableCell><Status status={e.status} /></TableCell>
            {review ? (
              <TableCell>
                {e.submittedBy === data.email && !canAdmin ? (
                  <small className="muted">Needs another reviewer</small>
                ) : canReview ? (
                  <div className="review-actions">
                    <button disabled={busy || business?.suspended} aria-label={`Approve ${e.merchant}`} title="Approve expense" onClick={() => void act({ action: 'review', expenseId: e.id, status: 'approved' })}><Check size={17} /></button>
                    <button disabled={busy || business?.suspended} aria-label={`Reject ${e.merchant}`} title="Reject expense" onClick={() => open('reject', e)}><X size={17} /></button>
                  </div>
                ) : null}
              </TableCell>
            ) : (
              <TableCell>
                {e.status === 'pending' && (e.submittedBy === data.email || canAdmin) ? (
                  <button className="text-button" disabled={busy || business?.suspended} title="Cancel pending expense" onClick={() => void act({ action: 'cancelExpense', expenseId: e.id })} style={{ color: '#dc2626' }}>
                    Cancel
                  </button>
                ) : (
                  <button className="text-button" onClick={() => open('details', e)}>
                    Details
                  </button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <MobileAppLock email={data.email} />
      <SidebarProvider>
        <Sidebar className="app-sidebar" collapsible="icon">
          <SidebarHeader>
            <Link className="brand" href={platformOnly ? '/platform' : '/'}>
              <span className="brandmark"><Layers3 size={23} /></span>
              <span>Expense<span className="brand-iq">IQ</span><small>{platformOnly ? 'PLATFORM' : 'BUSINESS'}</small></span>
            </Link>
            {!platformOnly ? (
              <div className="workspace-select">
                <span className="company-icon"><Building2 size={18} /></span>
                <div>
                  <small>WORKSPACE</small>
                  <Choice label="Business workspace" value={business?.id || ''} onChange={v => { setActiveId(v); navigate('Overview'); }} options={data.businesses.map(b => ({ value: b.id, label: b.name }))} />
                </div>
              </div>
            ) : null}
          </SidebarHeader>
          <SidebarContent>
            {platformOnly ? (
              <>
                <div className="nav-caption">PLATFORM ADMIN</div>
                <SidebarMenu>
                  {platformNav.map(([label, Icon]) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        isActive={(page === label) || (label === 'Overview' && page === 'Platform admin')}
                        onClick={() => navigate(label)}
                        className="nav-item"
                        tooltip={label}
                      >
                        <Icon />
                        <span>{label === 'Overview' ? 'Performance' : label}</span>
                        {label === 'Businesses' && stats.pendingBusinesses > 0 ? (
                          <b className="nav-count">{stats.pendingBusinesses}</b>
                        ) : label === 'Overview' ? (
                          <span className="admin-dot" />
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            ) : (
              <>
                <div className="nav-caption">WORKSPACE</div>
                <SidebarMenu>
                  {workspaceNav.map(([label, Icon]) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        isActive={page === label}
                        onClick={() => navigate(label)}
                        className="nav-item"
                        tooltip={label}
                      >
                        <Icon />
                        <span>{label}</span>
                        {label === 'Approvals' && reviewable.length > 0 ? <b className="nav-count">{reviewable.length}</b> : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>
          <SidebarRail className="sidebar-rail" />
          <SidebarFooter>
            <div className="sidebar-note">
              <ShieldCheck size={20} />
              <strong>{platformOnly ? 'Platform control room.' : 'Role-based workspace.'}</strong>
              <p>{platformOnly ? 'Monitor site performance, health, and all business accounts.' : 'Your menu only shows what your role can use.'}</p>
            </div>
            <div className="profile">
              <div className="avatar">{data.email.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{nameOf(data.email)}</strong>
                <small>{platformOnly ? 'Platform admin' : myRole === 'admin' ? 'Business admin' : myRole === 'manager' ? 'Manager' : myRole === 'accountant' ? 'Finance / Accountant' : myRole === 'employee' ? 'Employee' : 'Workspace user'}</small>
              </div>
              <button className="logout-button" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16} /></button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <SidebarTrigger />
              <span>{platformOnly ? 'Platform' : 'Workspace'}</span>
              <ChevronRight size={14} />
              <strong>{platformOnly && (page === 'Overview' || page === 'Platform admin') ? 'Performance & Operations' : page}</strong>
            </div>
            <div className="topbar-right">
              {platformOnly ? (
                <div className="notification-pill" title="Live system status">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: health?.status === 'degraded' ? '#ef4444' : '#10b981', display: 'inline-block' }} />
                  {health ? `${health.status === 'degraded' ? 'Degraded' : 'Operational'} · ${health.apiLatencyMs}ms` : 'Checking health…'}
                </div>
              ) : (
                <span className="workspace-status">{business?.suspended ? 'Account suspended' : 'Business workspace'}</span>
              )}
              {canReview && !platformOnly ? (
                <button className="notification-pill" onClick={() => navigate('Approvals')} aria-label={`${reviewable.length} pending approvals`}>
                  <Bell size={16} />{reviewable.length}
                </button>
              ) : null}
              {data.platform && !platformOnly ? (
                <Link className="secondary topbar-link" href="/platform"><Building2 size={16} />Platform dashboard</Link>
              ) : null}
              {platformOnly ? (
                <button className="secondary topbar-link" disabled={checkingHealth} onClick={() => void checkHealth()} title="Test platform API latency and database diagnostics">
                  <RefreshCw size={14} className={checkingHealth ? 'animate-spin' : ''} />
                  Diagnostics
                </button>
              ) : (
                <button className="help-button" aria-label="Approval and wallet help" onClick={() => open('help')}><CircleHelp size={20} /></button>
              )}
              <button className="secondary topbar-link" onClick={() => void signOut()}><LogOut size={16} />Sign out</button>
              <div className="avatar small">{data.email.slice(0, 2).toUpperCase()}</div>
            </div>
          </header>

          <main className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{platformOnly ? 'SAAS PLATFORM ADMIN' : business?.name || 'YOUR WORKSPACE'}</p>
                <h1>
                  {platformOnly
                    ? (page === 'Businesses' ? 'Registered Businesses' : page === 'Activity' ? 'Platform Audit Feed' : 'Platform Performance & Health')
                    : page === 'Overview' ? (isEmployee ? 'My expense dashboard' : 'Business overview')
                    : page === 'Wallet' ? 'Company wallet'
                    : page === 'Approvals' ? 'Expense approvals'
                    : page}
                </h1>
                <p className="subtitle">
                  {platformOnly
                    ? (page === 'Businesses' ? 'Approve, monitor, and manage company workspaces across your SaaS.'
                      : page === 'Activity' ? 'Cross-tenant chronological audit trail of registrations, reviews, and status changes.'
                      : 'Live site performance, system health diagnostics, and SaaS financial throughput.')
                    : {
                        Overview: isEmployee ? 'Track your allowance, submissions, and approval status.' : 'A clear picture of your company spending.',
                        Expenses: 'Track every expense, from submission to approval.',
                        Approvals: 'Keep business spending moving, with the right checks.',
                        Wallet: 'Allocate budgets and follow every movement.',
                        Categories: 'Organize spending around the way your business works.',
                        Team: canAdmin ? 'Access control, member roles, and account security for your business.' : 'Manage team member accounts, wallet limits, and access status.',
                        Activity: 'A record of the decisions and operations behind your spending.',
                        'Platform admin': 'Review registered businesses and manage platform access.'
                      }[page]}
                </p>
              </div>
              <div className="heading-actions">
                {platformOnly ? (
                  <button className="secondary" onClick={exportPlatformReport}>
                    <Download size={16} />Export SaaS report
                  </button>
                ) : page === 'Team' && canManageAccounts ? (
                  <button className="primary" disabled={business?.suspended} onClick={() => open('member')}><Plus size={18} />Add team member</button>
                ) : page === 'Categories' && canAdmin ? (
                  <button className="primary" disabled={business?.suspended} onClick={() => open('category')}><Plus size={18} />New category</button>
                ) : page === 'Wallet' && canAdmin ? (
                  <button className="primary" disabled={business?.suspended} onClick={() => open('allocate')}><Plus size={18} />Allocate budget</button>
                ) : business && myRole ? (
                  <button className="primary" disabled={business.suspended} onClick={() => open('expense')}><Plus size={18} />New expense</button>
                ) : null}
              </div>
            </div>

            {preview ? <div className="notice">Local preview · Demo data. Production starts empty and persists in Supabase.</div> : null}

            {business?.suspended && !platformOnly ? <div className="notice warning">This business is suspended. Expense submissions and changes are paused.</div> : null}
            {!business && !platformOnly ? <Empty text="You do not belong to a business yet. Ask a business admin to add your sign-in email." /> : null}

            {/* Standard Business Workspace Views */}
            {business && page === 'Overview' && !platformOnly ? (
              <>
                <div className="stats">
                  <Stat label={isEmployee ? 'Your approved expenses' : 'Approved spending'} value={money(spend, business.currency)} detail={`${approved.length} approved expenses · all time`} icon={ArrowUpRight} />
                  <Stat label="Pending approval" value={money(pendingTotal, business.currency)} detail={`${pending.length} expenses awaiting review`} icon={Clock3} />
                  <Stat label={isEmployee ? 'Your wallet balance' : 'Available budget'} value={isEmployee ? (walletVisibleToMe && allowance !== null ? money(allowance, business.currency) : me?.walletVisibilityRequested ? 'Requested' : 'Hidden') : money(balance(business), business.currency)} detail={isEmployee ? (walletVisibleToMe && me?.walletLimit ? `${money(mySpend, business.currency)} spent · ${money(myPending, business.currency)} pending` : me?.walletVisibilityRequested ? 'Waiting for manager approval' : 'Request visibility from your manager') : 'Internal wallet balance'} icon={Wallet} blue />
                  <Stat label={isEmployee ? 'Rejected expenses' : 'Team members'} value={isEmployee ? String(business.expenses.filter(e => e.status === 'rejected').length) : String(business.members.length)} detail={isEmployee ? 'Review the reason and resubmit' : `${business.members.filter(m => m.role !== 'employee').length} admins, managers & finance`} icon={Users} />
                </div>
                <div className="dashboard-grid">
                  <section className="panel spending-panel">
                    <div className="panel-title">
                      <div><h2>Spending overview</h2><p>Approved expenses over the last 30 days</p></div>
                      <span className="subtle-tag">{business.currency}</span>
                    </div>
                    <SpendingChart expenses={approved} currency={business.currency} />
                  </section>
                  <section className="panel categories-panel">
                    <div className="panel-title">
                      <h2>{isEmployee ? 'Your virtual wallet' : 'Spend by category'}</h2>
                      <button className="text-button" onClick={() => navigate(isEmployee ? 'Expenses' : 'Categories')}>View all <ArrowRight size={15} /></button>
                    </div>
                    {isEmployee ? (
                      <MemberWallet business={business} email={data.email} visible={walletVisibleToMe} requested={Boolean(me?.walletVisibilityRequested)} onRequest={() => void act({ action: 'requestWalletVisibility' })} />
                    ) : (
                      <CategoryChart business={business} />
                    )}
                  </section>
                </div>
                {reviewable.length > 0 && canReview ? (
                  <div className="approval-banner notification-banner">
                    <div className="approval-symbol"><Bell size={23} /></div>
                    <div>
                      <strong>{reviewable.length} expenses need business approval</strong>
                      <p>{money(reviewable.reduce((s, e) => s + e.amount, 0), business.currency)} is waiting for a business admin, manager, or finance decision.</p>
                    </div>
                    <button onClick={() => navigate('Approvals')}>Open approval queue <ArrowRight size={17} /></button>
                  </div>
                ) : pending.length > 0 ? (
                  <div className="approval-banner">
                    <div className="approval-symbol"><ShieldCheck size={23} /></div>
                    <div>
                      <strong>{pending.length} expenses are waiting for approval</strong>
                      <p>{money(pendingTotal, business.currency)} in pending requests.</p>
                    </div>
                    <button onClick={() => navigate('Approvals')}>Review status <ArrowRight size={17} /></button>
                  </div>
                ) : null}
                <section className="panel">
                  <div className="panel-title">
                    <div><h2>Recent expenses</h2><p>Your latest business transactions</p></div>
                    <button className="text-button" onClick={() => navigate('Expenses')}>View all expenses <ArrowRight size={16} /></button>
                  </div>
                  {business.expenses.length ? transactions(business.expenses.slice(0, 5)) : <Empty text="Your first expense starts here. Select New expense to submit it." />}
                </section>
              </>
            ) : null}

            {business && ['Expenses', 'Approvals'].includes(page) && !platformOnly ? (
              <section className="panel">
                <div className="table-toolbar">
                  <div className="searchbox">
                    <Search size={17} />
                    <input
                      aria-label="Search expenses"
                      placeholder="Search payee, merchant, category, or submitter…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="toolbar-right">
                    {page === 'Expenses' ? (
                      <Choice
                        label="Expense status"
                        value={filter}
                        onChange={setFilter}
                        options={[
                          { value: 'all', label: 'All statuses' },
                          { value: 'pending', label: 'Pending approval' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'rejected', label: 'Rejected' }
                        ]}
                      />
                    ) : (
                      <span className="muted">{reviewable.length} awaiting your review · {pending.length} total pending</span>
                    )}
                    <Choice
                      label="Category filter"
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      options={[
                        { value: 'all', label: 'All categories' },
                        ...business.categories.map(c => ({ value: c, label: c }))
                      ]}
                    />
                    <Choice
                      label="Report grouping"
                      value={reportGroup}
                      onChange={setReportGroup}
                      options={[
                        { value: 'day', label: 'Report by day' },
                        { value: 'week', label: 'Report by week' },
                        { value: 'month', label: 'Report by month' }
                      ]}
                    />
                    <button className="secondary" onClick={exportExpenses}><Download size={16} />Export CSV</button>
                    <button className="secondary" onClick={exportExpensesPdf}><Download size={16} />Export PDF</button>
                  </div>
                </div>
                {filtered.length ? transactions(filtered, page === 'Approvals') : (
                  <Empty text={query || categoryFilter !== 'all' ? 'No expenses match your search and filter criteria.' : page === 'Approvals' ? 'All caught up. No expenses are waiting for business approval.' : 'No expenses yet.'} />
                )}
              </section>
            ) : null}

            {business && page === 'Wallet' && !isEmployee && !platformOnly ? (
              <>
                {allocated > 0 && balance(business) < allocated * 0.20 ? (
                  <div className="approval-banner warning-banner">
                    <div className="approval-symbol"><AlertTriangle size={23} /></div>
                    <div>
                      <strong>Low company wallet budget</strong>
                      <p>{money(balance(business), business.currency)} remaining of {money(allocated, business.currency)} allocated budget ({Math.round(balance(business) / allocated * 100)}%). Business admins can allocate additional budget.</p>
                    </div>
                    {canAdmin ? <button onClick={() => open('allocate')}>Allocate budget <ArrowRight size={17} /></button> : null}
                  </div>
                ) : null}

                <div className="wallet-grid">
                  <section className="wallet-card">
                    <div><Layers3 size={25} /><span>EXPENSEIQ BUSINESS</span></div>
                    <p>Available budget</p>
                    <strong>{money(balance(business), business.currency)}</strong>
                    <div className="wallet-card-footer">
                      <span>{business.name}<small>INTERNAL BUDGET WALLET</small></span>
                      <Wallet size={32} />
                    </div>
                  </section>
                  <section className="panel wallet-summary">
                    <h2>Budget at a glance</h2>
                    <dl>
                      <div><dt>Total allocated</dt><dd>{money(allocated, business.currency)}</dd></div>
                      <div><dt>Approved spending</dt><dd>{money(spend, business.currency)}</dd></div>
                      <div><dt>Pending requests</dt><dd>{money(pendingTotal, business.currency)}</dd></div>
                    </dl>
                    <Progress value={allocated ? Math.min(spend / allocated * 100, 100) : 0} />
                    <p className="muted">{allocated ? Math.round(spend / allocated * 100) : 0}% used. Pending requests are not deducted.</p>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-title">
                    <div><h2>Wallet activity</h2><p>Budget allocations and approved expense deductions</p></div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button className="secondary" onClick={exportLedger} style={{ fontSize: 13, minHeight: 34 }}>
                        <Download size={14} />Export ledger
                      </button>
                      <span className="subtle-tag">Internal funds only</span>
                    </div>
                  </div>
                  {business.ledger.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction</TableHead>
                          <TableHead>Recorded by</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="numeric">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...business.ledger].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <div className="ledger-title">
                                <span className={e.amount > 0 ? 'credit-icon' : 'debit-icon'}>{e.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
                                <span>{e.note}<small>{e.amount > 0 ? 'Budget allocation' : 'Approved expense'}</small></span>
                              </div>
                            </TableCell>
                            <TableCell>{nameOf(e.actor)}</TableCell>
                            <TableCell>{shortDate(e.date)}</TableCell>
                            <TableCell className={`numeric amount ${e.amount > 0 ? 'credit' : ''}`}>{e.amount > 0 ? '+' : ''}{money(e.amount, business.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Empty text="Allocate a budget to start using your company wallet." />
                  )}
                </section>
              </>
            ) : null}

            {business && page === 'Categories' && !platformOnly ? (
              <div className="category-grid">
                {business.categories.map((c, i) => {
                  const expenses = approved.filter(e => e.category === c);
                  const total = expenses.reduce((s, e) => s + e.amount, 0);
                  const canDelete = canAdmin && expenses.length === 0 && business.categories.length > 1;
                  return (
                    <section className="panel category-card" key={c}>
                      <div className="category-header">
                        <span className="category-icon" style={{ color: palettes[i % 6], background: palettes[i % 6] + '16' }}><Tags size={21} /></span>
                        {canDelete ? (
                          <button
                            className="category-delete"
                            title={`Delete empty category "${c}"`}
                            disabled={busy}
                            onClick={() => void act({ action: 'deleteCategory', name: c })}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                      <h2>{c}</h2>
                      <strong>{money(total, business.currency)}</strong>
                      <p>{expenses.length} approved expenses</p>
                      <Progress value={spend ? total / spend * 100 : 0} />
                      <small>{spend ? Math.round(total / spend * 100) : 0}% of approved spending</small>
                    </section>
                  );
                })}
              </div>
            ) : null}

            {business && page === 'Team' && !isEmployee && !platformOnly ? (
              <>
                {/* 4 Role Definition ACL Cards */}
                <section className="acl-grid">
                  {(['admin', 'manager', 'accountant', 'employee'] as const).map(r => (
                    <article className="panel acl-card" key={r}>
                      <span className={`role-label ${r}`}>
                        {r === 'admin' ? 'Business admin' : r === 'manager' ? 'Manager' : r === 'accountant' ? 'Finance / Accountant' : 'Team member'}
                      </span>
                      <h2>
                        {r === 'admin' ? 'Full workspace control' :
                         r === 'manager' ? 'Team control & approvals' :
                         r === 'accountant' ? 'Financial oversight & approvals' :
                         'Personal expense tracking'}
                      </h2>
                      <p>{rolePermissions[r].map(p => p.replaceAll('_', ' ')).join(' · ')}</p>
                    </article>
                  ))}
                </section>

                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>Member login accounts</h2>
                      <p>{canAdmin ? 'Business admins can manage every account and role.' : 'Managers can create and control team member accounts.'} Members sign in with the same email to open their own dashboard.</p>
                    </div>
                    <span className="subtle-tag">{business.members.length} accounts</span>
                  </div>

                  <div className="table-toolbar" style={{ borderBottom: '1px solid #edf1f6', padding: '12px 20px' }}>
                    <div className="searchbox" style={{ maxWidth: 300 }}>
                      <Search size={16} />
                      <input
                        placeholder="Filter members by name or email…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </div>
                    <div className="toolbar-right">
                      <Choice
                        label="Role filter"
                        value={memberRoleFilter}
                        onChange={setMemberRoleFilter}
                        options={[
                          { value: 'all', label: 'All roles' },
                          { value: 'admin', label: 'Business admins' },
                          { value: 'manager', label: 'Managers' },
                          { value: 'accountant', label: 'Finance / Accountants' },
                          { value: 'employee', label: 'Team members' }
                        ]}
                      />
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Wallet limit</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Wallet visibility</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map(m => {
                        const canManageThisMember = canManageMemberRole(myRole, m.role);
                        const isSelf = m.email === data.email;
                        return (
                          <TableRow key={m.email}>
                            <TableCell>
                              <div className="team-name">
                                <span className="avatar">{m.name.slice(0, 2).toUpperCase()}</span>
                                <strong>{m.name}{isSelf ? ' (you)' : ''}</strong>
                              </div>
                            </TableCell>
                            <TableCell>{m.email}</TableCell>
                            <TableCell>
                              <span className={`role-label ${m.role}`}>
                                {m.role === 'admin' ? 'Business admin' : m.role === 'manager' ? 'Manager' : m.role === 'accountant' ? 'Finance' : 'Team member'}
                              </span>
                            </TableCell>
                            <TableCell><Status status={m.accountStatus || 'invited'} /></TableCell>
                            <TableCell className="amount">{m.walletLimit ? money(m.walletLimit, business.currency) : 'No limit'}</TableCell>
                            <TableCell className="amount">{m.walletLimit ? money(memberRemaining(business, m.email) ?? 0, business.currency) : 'Open'}</TableCell>
                            <TableCell>
                              {m.role === 'employee' ? (
                                <button
                                  className="text-button"
                                  disabled={busy || business.suspended}
                                  onClick={() => void act({ action: 'walletVisibility', email: m.email, visible: !m.walletVisible })}
                                >
                                  {m.walletVisible ? 'Hide balance' : m.walletVisibilityRequested ? 'Approve request' : 'Show balance'}
                                </button>
                              ) : (
                                <span className="subtle-tag">Always visible</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {canManageThisMember && (!isSelf || canAdmin) ? (
                                  <button
                                    className="text-button"
                                    disabled={busy || business.suspended}
                                    title="Edit member account"
                                    onClick={() => open('member', null, m)}
                                  >
                                    <Edit3 size={14} />
                                    Edit
                                  </button>
                                ) : null}

                                {canManageThisMember && !isSelf ? (
                                  <button
                                    className="text-button"
                                    disabled={busy || business.suspended}
                                    title={m.accountStatus === 'active' ? 'Disable access' : 'Enable access'}
                                    onClick={() => void act({ action: 'toggleAccountStatus', email: m.email })}
                                    style={{ color: m.accountStatus === 'active' ? '#b45309' : '#15803d' }}
                                  >
                                    {m.accountStatus === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                                    {m.accountStatus === 'active' ? 'Disable' : 'Enable'}
                                  </button>
                                ) : null}

                                {canAdmin && !isSelf ? (
                                  <button
                                    className="text-button"
                                    disabled={busy || business.suspended}
                                    title="Remove member"
                                    onClick={() => void act({ action: 'removeMember', email: m.email })}
                                    style={{ color: '#dc2626' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="panel-footnote">Invited accounts become active when that email signs in. Disabled accounts cannot read the workspace or submit expenses.</div>
                </section>
              </>
            ) : null}

            {business && page === 'Activity' && !platformOnly ? (
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Audit trail</h2>
                    <p>Chronological record of business expenses, budget changes, and member access events</p>
                  </div>
                  <span className="subtle-tag">{business.audit.length} events</span>
                </div>
                <div className="table-toolbar" style={{ borderBottom: '1px solid #edf1f6', padding: '12px 20px' }}>
                  <div className="searchbox" style={{ maxWidth: 320 }}>
                    <Search size={16} />
                    <input
                      placeholder="Filter audit trail by action or actor…"
                      value={auditQuery}
                      onChange={e => setAuditQuery(e.target.value)}
                    />
                  </div>
                </div>
                {filteredBusinessAudit.length === 0 ? (
                  <Empty text="No audit events match your search." />
                ) : (
                  filteredBusinessAudit.map(e => (
                    <div className="audit-row" key={e.id}>
                      <span className="audit-icon"><Activity size={18} /></span>
                      <div><strong>{e.action}</strong><p>{nameOf(e.actor)} ({e.actor})</p></div>
                      <time>{new Date(e.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                  ))
                )}
              </section>
            ) : null}

            {/* ========================================================
                PLATFORM ADMIN VIEWS (Performance, Businesses, Activity)
                ======================================================== */}
            {platformOnly && (page === 'Overview' || page === 'Platform admin') ? (
              <>
                {/* SaaS Performance & Operational Metrics */}
                <div className="stats">
                  <Stat
                    label="Active businesses"
                    value={String(stats.activeBusinesses)}
                    detail={`${stats.totalBusinesses} total · ${stats.pendingBusinesses} pending review`}
                    icon={Building2}
                    blue
                  />
                  <Stat
                    label="Platform throughput"
                    value={money(stats.spendByCurrency['KES'] || Object.values(stats.spendByCurrency)[0] || 0, 'KES')}
                    detail={`${stats.approvedExpenses} approved transactions across SaaS`}
                    icon={ArrowUpRight}
                  />
                  <Stat
                    label="Approval velocity"
                    value={`${stats.approvalRate}%`}
                    detail={`${stats.pendingExpenses} pending · ${stats.rejectedExpenses} rejected`}
                    icon={Gauge}
                  />
                  <Stat
                    label="Platform members"
                    value={String(stats.totalMembers)}
                    detail="Total user seats across all tenants"
                    icon={Users}
                  />
                </div>

                <div className="dashboard-grid">
                  {/* System Performance & Diagnostics Panel */}
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>System Performance & Diagnostics</h2>
                        <p>Real-time infrastructure health and API response performance</p>
                      </div>
                      <span className="subtle-tag">{health?.status === 'degraded' ? 'Degraded' : 'Operational'}</span>
                    </div>

                    <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                      <div className="stat" style={{ padding: 16, minWidth: 'auto', background: '#f8fafc' }}>
                        <div className="stat-label">API Response Time <Activity size={16} /></div>
                        <strong>{health ? `${health.apiLatencyMs}ms` : '—'}</strong>
                        <p>{(health?.apiLatencyMs || 0) < 150 ? 'Optimal response speed' : 'Network latency detected'}</p>
                      </div>
                      <div className="stat" style={{ padding: 16, minWidth: 'auto', background: '#f8fafc' }}>
                        <div className="stat-label">Database Connection <Server size={16} /></div>
                        <strong>{health ? (health.database === 'connected' ? 'Connected' : health.database === 'standby' ? 'Standby' : 'Error') : '—'}</strong>
                        <p>{health?.database === 'connected' ? `Postgres response: ${health.dbLatencyMs}ms` : 'Local preview engine active'}</p>
                      </div>
                      <div className="stat" style={{ padding: 16, minWidth: 'auto', background: '#f8fafc' }}>
                        <div className="stat-label">Server Memory <ShieldCheck size={16} /></div>
                        <strong>{health?.memoryUsageMb ? `${health.memoryUsageMb} MB` : 'Optimal'}</strong>
                        <p>Node.js process RSS allocation</p>
                      </div>
                      <div className="stat" style={{ padding: 16, minWidth: 'auto', background: '#f8fafc' }}>
                        <div className="stat-label">Access & Isolation <ShieldCheck size={16} /></div>
                        <strong>Protected</strong>
                        <p>Row-level & token verified</p>
                      </div>
                    </div>

                    <div style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #edf1f6', paddingTop: 14 }}>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Last diagnostic check: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString('en-GB') : 'Just now'}
                      </span>
                      <button className="secondary" disabled={checkingHealth} onClick={() => void checkHealth()} style={{ minHeight: 34, fontSize: 13 }}>
                        <RefreshCw size={14} className={checkingHealth ? 'animate-spin' : ''} />
                        Run live ping
                      </button>
                    </div>
                  </section>

                  {/* SaaS Expense Decision Distribution */}
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>Expense Decisions & Velocity</h2>
                        <p>Platform-wide ratio of approved, pending, and rejected submissions</p>
                      </div>
                      <button className="text-button" onClick={() => navigate('Businesses')}>
                        View all <ArrowRight size={15} />
                      </button>
                    </div>

                    <div style={{ padding: '0 20px 20px' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                          <span>Platform Approval Rate</span>
                          <strong>{stats.approvalRate}% approved</strong>
                        </div>
                        <Progress value={stats.approvalRate} />
                      </div>

                      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, margin: '20px 0 10px', textAlign: 'center' }}>
                        <div style={{ padding: '12px 8px', background: '#f0fdf4', borderRadius: 8 }}>
                          <dt className="muted" style={{ fontSize: 12 }}>Approved</dt>
                          <dd style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '4px 0 0' }}>{stats.approvedExpenses}</dd>
                        </div>
                        <div style={{ padding: '12px 8px', background: '#fffbeb', borderRadius: 8 }}>
                          <dt className="muted" style={{ fontSize: 12 }}>Pending Review</dt>
                          <dd style={{ fontSize: 20, fontWeight: 700, color: '#d97706', margin: '4px 0 0' }}>{stats.pendingExpenses}</dd>
                        </div>
                        <div style={{ padding: '12px 8px', background: '#fef2f2', borderRadius: 8 }}>
                          <dt className="muted" style={{ fontSize: 12 }}>Rejected</dt>
                          <dd style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: '4px 0 0' }}>{stats.rejectedExpenses}</dd>
                        </div>
                      </dl>
                      <p className="muted" style={{ fontSize: 12, marginTop: 14, textAlign: 'center' }}>
                        Across {stats.totalBusinesses} business accounts ({stats.totalExpenses} total submissions)
                      </p>
                    </div>
                  </section>
                </div>

                {/* Top Businesses by Volume Panel */}
                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>Top Tenant Workspaces</h2>
                      <p>Company accounts ranked by approved expense volume and team size</p>
                    </div>
                    <button className="text-button" onClick={() => navigate('Businesses')}>
                      Manage all ({data.businesses.length}) <ArrowRight size={16} />
                    </button>
                  </div>

                  {data.businesses.length === 0 ? (
                    <Empty text="No businesses registered on the platform yet." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Business</TableHead>
                          <TableHead>Business Admin</TableHead>
                          <TableHead>Team Size</TableHead>
                          <TableHead>Total Expenses</TableHead>
                          <TableHead className="numeric">Approved Volume</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.businesses]
                          .sort((a, b) => {
                            const spendA = a.expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
                            const spendB = b.expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
                            return spendB - spendA;
                          })
                          .slice(0, 5)
                          .map(b => {
                            const approvedSpend = b.expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
                            const admin = b.members.find(m => m.role === 'admin')?.email || '—';
                            return (
                              <TableRow key={b.id}>
                                <TableCell>
                                  <span className="merchant">
                                    <span className="company-icon"><Building2 size={19} /></span>
                                    <span>{b.name}<small>{b.currency} workspace</small></span>
                                  </span>
                                </TableCell>
                                <TableCell>{admin}</TableCell>
                                <TableCell>{b.members.length} members</TableCell>
                                <TableCell>{b.expenses.length} submitted</TableCell>
                                <TableCell className="numeric amount">{money(approvedSpend, b.currency)}</TableCell>
                                <TableCell><Status status={b.suspended ? 'suspended' : b.approvalStatus || 'approved'} /></TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  )}
                </section>
              </>
            ) : null}

            {/* Platform Admin: Businesses Management Tab */}
            {platformOnly && page === 'Businesses' ? (
              <section className="panel">
                <div className="table-toolbar">
                  <div className="searchbox">
                    <Search size={17} />
                    <input
                      aria-label="Search businesses"
                      placeholder="Search company name, currency, or admin email…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="toolbar-right">
                    <Choice
                      label="Status filter"
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: 'all', label: 'All statuses' },
                        { value: 'pending', label: 'Pending approval' },
                        { value: 'approved', label: 'Active / Approved' },
                        { value: 'suspended', label: 'Suspended' }
                      ]}
                    />
                    <button className="secondary" onClick={exportPlatformReport}>
                      <Download size={16} />Export CSV
                    </button>
                  </div>
                </div>

                {filteredBusinesses.length === 0 ? (
                  <Empty text={query ? 'No businesses match your search.' : 'No businesses match the selected status.'} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Business admin</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Total Spend</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Manage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBusinesses.map(b => {
                        const approvedSum = b.expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
                        const admin = b.members.find(m => m.role === 'admin')?.email || '—';
                        const isPendingReview = (b.approvalStatus || 'approved') === 'pending';
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <span className="merchant">
                                <span className="company-icon"><Building2 size={19} /></span>
                                <span>{b.name}<small>{b.currency} workspace</small></span>
                              </span>
                            </TableCell>
                            <TableCell>{admin}</TableCell>
                            <TableCell>{b.members.length} members</TableCell>
                            <TableCell className="amount">{money(approvedSum, b.currency)}</TableCell>
                            <TableCell><Status status={b.suspended ? 'suspended' : b.approvalStatus || 'approved'} /></TableCell>
                            <TableCell>
                              {isPendingReview ? (
                                <div className="review-actions">
                                  <button disabled={busy} aria-label={`Approve ${b.name}`} onClick={() => void act({ action: 'reviewBusiness', businessId: b.id, status: 'approved' })}><Check size={17} /></button>
                                  <button disabled={busy} aria-label={`Reject ${b.name}`} onClick={() => { setSelected(null); setFormError(''); setActiveId(b.id); setModal('rejectBusiness'); }}><X size={17} /></button>
                                </div>
                              ) : (
                                <button className="text-button" disabled={busy} onClick={() => void act({ action: 'suspend', businessId: b.id })}>
                                  {b.suspended ? 'Reactivate' : 'Suspend'}
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </section>
            ) : null}

            {/* Platform Admin: Cross-Tenant Audit Activity */}
            {platformOnly && page === 'Activity' ? (
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Platform Audit Trail</h2>
                    <p>Chronological feed of registrations, admin reviews, and workspace status changes</p>
                  </div>
                  <span className="subtle-tag">{platformAuditEvents.length} events</span>
                </div>
                {platformAuditEvents.length === 0 ? (
                  <Empty text="No platform activity recorded yet." />
                ) : (
                  platformAuditEvents.map(e => (
                    <div className="audit-row" key={e.id}>
                      <span className="audit-icon"><Activity size={18} /></span>
                      <div>
                        <strong>{e.action}</strong>
                        <p>{e.actor} · <span className="subtle-tag" style={{ display: 'inline', padding: '1px 6px', fontSize: 11 }}>{e.businessName}</span></p>
                      </div>
                      <time>{new Date(e.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                  ))
                )}
              </section>
            ) : null}

            <footer className="content-footer">
              <span>ExpenseIQ Business</span>
              <span><ShieldCheck size={14} /> Accountable spending, together.</span>
            </footer>
          </main>
        </SidebarInset>

        {/* Dialog Modals */}
        <Dialog open={Boolean(modal)} onOpenChange={v => { if (!v && !busy) setModal(''); }}>
          <DialogContent className={`app-dialog ${modal === 'expense' ? 'app-dialog-wide' : ''}`}>
            <DialogHeader>
              <DialogTitle>
                {{
                  expense: 'Submit an expense',
                  allocate: 'Allocate wallet budget',
                  category: 'New expense category',
                  member: selectedMember ? `Update ${selectedMember.name}` : 'Add team member',
                  business: 'Register a business',
                  reject: 'Reject expense',
                  rejectBusiness: 'Reject business registration',
                  approveWithNote: 'Approve expense with note',
                  details: selected?.merchant || 'Expense details',
                  help: 'How your workspace works'
                }[modal]}
              </DialogTitle>
              <DialogDescription>
                {{
                  expense: 'Give your reviewer the details they need to approve this expense.',
                  allocate: 'Record an internal budget allocation. This does not move real money.',
                  category: 'Create a category that matches your business spending.',
                  member: selectedMember ? 'Adjust member role, access status, and monthly wallet limit.' : 'Grant access by sign-in email. No invitation email will be sent.',
                  business: 'Submit your business for platform admin approval.',
                  reject: 'Tell the submitter why this expense cannot be approved.',
                  rejectBusiness: 'Tell the business admin why this registration cannot be approved yet.',
                  approveWithNote: 'Optional note to attach to this approved expense.',
                  details: 'Expense details, payee contacts, and approval history.',
                  help: 'From expense submission to an accountable decision.'
                }[modal]}
              </DialogDescription>
            </DialogHeader>

            {modal === 'help' ? (
              <div className="help-content">
                <h3>1. Allocate a budget</h3><p>Business admins add internal budget to the company wallet.</p>
                <h3>2. Submit expenses</h3><p>Team members select a category and explain the business purpose.</p>
                <h3>3. Review independently</h3><p>Managers, finance accountants, and admins approve or reject expenses. Submissions need another reviewer for self-approval.</p>
                <h3>4. Follow the balance</h3><p>Approval deducts the expense once. Activity records every decision. Wallets track budgets only and do not hold real money.</p>
              </div>
            ) : modal === 'details' && selected ? (
              <div className="expense-detail">
                <div className="detail-amount">{money(selected.amount, business?.currency)}<Status status={selected.status} /></div>
                <dl>
                  <div><dt>Payee</dt><dd>{payeeName(selected)}</dd></div>
                  {selected.paymentMethod ? <div><dt>Payment method</dt><dd>{selected.paymentMethod === 'mpesa' ? 'M-Pesa / Mobile Money' : selected.paymentMethod === 'bank' ? 'Bank Transfer' : selected.paymentMethod === 'invoice' ? 'Vendor Invoice' : 'Card / Cash'}</dd></div> : null}
                  {selected.receiptNumber ? <div><dt>Receipt / Ref</dt><dd>{selected.receiptNumber}</dd></div> : null}
                  {selected.payeePhone ? <div><dt>Payee contact</dt><dd>{selected.payeePhone}</dd></div> : null}
                  {selected.payeeDetails ? <div><dt>Payment notes</dt><dd>{selected.payeeDetails}</dd></div> : null}
                  <div><dt>Category</dt><dd>{selected.category}</dd></div>
                  <div><dt>Expense date</dt><dd>{shortDate(selected.date)}</dd></div>
                  <div><dt>Submitted by</dt><dd>{nameOf(selected.submittedBy)}</dd></div>
                  {selected.reviewedBy ? <div><dt>Reviewed by</dt><dd>{nameOf(selected.reviewedBy)}</dd></div> : null}
                  {selected.reviewNote ? <div><dt>Approval note</dt><dd>{selected.reviewNote}</dd></div> : null}
                  {selected.reason ? <div><dt>Rejection reason</dt><dd>{selected.reason}</dd></div> : null}
                  {selected.receiptAttachment ? (
                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #edf2f7', paddingTop: 10 }}>
                      <dt style={{ textAlign: 'left' }}>Receipt / Invoice Attachment</dt>
                      <dd style={{ textAlign: 'left' }}>
                        {selected.receiptAttachment.startsWith('data:image') ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={selected.receiptAttachment} alt="Receipt proof" style={{ maxWidth: 280, maxHeight: 180, borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'contain', background: '#f8fafc' }} />
                        ) : (
                          <a href={selected.receiptAttachment} download="receipt-proof" className="secondary" style={{ display: 'inline-flex', padding: '6px 14px', fontSize: 13, gap: 6 }}>
                            <Download size={14} /> Download attached proof
                          </a>
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <h3>Business purpose</h3><p>{selected.description}</p>
                {selected.status === 'pending' && (selected.submittedBy === data.email || canAdmin) ? (
                  <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button className="secondary" disabled={busy || business?.suspended} onClick={() => void act({ action: 'cancelExpense', expenseId: selected.id })} style={{ color: '#dc2626' }}>
                      Cancel expense
                    </button>
                    {canReview && (canAdmin || selected.submittedBy !== data.email) ? (
                      <>
                        <button className="secondary" disabled={busy || business?.suspended} onClick={() => open('reject', selected)}>Reject</button>
                        <button className="primary" disabled={busy || business?.suspended} onClick={() => void act({ action: 'review', expenseId: selected.id, status: 'approved' })}>Approve expense</button>
                      </>
                    ) : null}
                  </div>
                ) : selected.status === 'pending' && canReview && (canAdmin || selected.submittedBy !== data.email) ? (
                  <div className="form-actions">
                    <button className="secondary" disabled={busy || business?.suspended} onClick={() => open('reject', selected)}>Reject</button>
                    <button className="primary" disabled={busy || business?.suspended} onClick={() => void act({ action: 'review', expenseId: selected.id, status: 'approved' })}>Approve expense</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <form onSubmit={submit} className="app-form" key={modal}>
                {modal === 'expense' ? (
                  <>
                    {/* Live Allowance & Budget Status */}
                    {allowance !== null ? (
                      <div className={`expense-budget-banner ${currentNumAmount > 0 && allowance - currentAmountCents < 0 ? 'over-budget' : ''}`}>
                        <div className="budget-banner-icon">
                          <Wallet size={20} />
                        </div>
                        <div className="budget-banner-info">
                          <div className="budget-banner-title">
                            <span>Your Monthly Virtual Allowance</span>
                            <strong>{money(allowance, business?.currency)} remaining</strong>
                          </div>
                          {currentNumAmount > 0 ? (
                            <div className={`budget-impact-text ${allowance - currentAmountCents < 0 ? 'text-danger' : 'text-success'}`}>
                              {allowance - currentAmountCents < 0 ? (
                                <>
                                  <AlertTriangle size={14} />
                                  <span>Exceeds monthly allowance by {money(Math.abs(allowance - currentAmountCents), business?.currency)}</span>
                                </>
                              ) : (
                                <>
                                  <Check size={14} />
                                  <span>{money(allowance - currentAmountCents, business?.currency)} will remain after this expense</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="budget-impact-text text-muted">
                              <span>Enter spend amount below to see remaining allowance in real-time</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Hero Amount Card */}
                    <div className="expense-hero-card">
                      <div className="hero-amount-header">
                        <span className="field-label">Amount ({business?.currency}) <b>Required</b></span>
                        {currentNumAmount > 0 ? (
                          <span className="hero-amount-formatted">
                            {money(currentAmountCents, business?.currency)}
                          </span>
                        ) : null}
                      </div>
                      <div className="hero-amount-input-wrap">
                        <span className="currency-pill">{business?.currency || 'KES'}</span>
                        <input
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="hero-amount-input"
                          value={expenseAmount}
                          onChange={e => setExpenseAmount(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="preset-amounts-row">
                        <span className="preset-label">Quick add:</span>
                        {[500, 1000, 2500, 5000, 10000].map(val => (
                          <button
                            key={val}
                            type="button"
                            className="preset-chip"
                            onClick={() => {
                              const next = ((parseFloat(expenseAmount) || 0) + val).toFixed(2);
                              setExpenseAmount(next);
                            }}
                          >
                            +{val.toLocaleString()}
                          </button>
                        ))}
                        {expenseAmount ? (
                          <button
                            type="button"
                            className="preset-chip clear-chip"
                            onClick={() => setExpenseAmount('')}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Section 1: Classification & Date */}
                    <div className="expense-section-card">
                      <div className="section-title">
                        <Tags size={16} />
                        <span>Expense Classification & Timeline</span>
                      </div>
                      <div className="form-grid">
                        <label className="spacious-field">
                          <span className="field-label">Category <b>Required</b></span>
                          <Choice
                            label="Category"
                            value={category}
                            onChange={setCategory}
                            options={(business?.categories || []).map(c => ({ value: c, label: c }))}
                          />
                        </label>
                        <label className="spacious-field">
                          <span className="field-label">Expense Date <b>Required</b></span>
                          <input
                            name="date"
                            type="date"
                            required
                            value={expenseDate}
                            onChange={e => setExpenseDate(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                          />
                          <div className="date-shortcuts">
                            <button
                              type="button"
                              className="date-shortcut-btn"
                              onClick={() => setExpenseDate(new Date().toISOString().slice(0, 10))}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              className="date-shortcut-btn"
                              onClick={() => {
                                const y = new Date();
                                y.setDate(y.getDate() - 1);
                                setExpenseDate(y.toISOString().slice(0, 10));
                              }}
                            >
                              Yesterday
                            </button>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Section 2: Payee & Disbursal Method */}
                    <div className="expense-section-card">
                      <div className="section-title">
                        <Building2 size={16} />
                        <span>Payee & Payment Details</span>
                      </div>

                      <div className="payment-method-selector">
                        {[
                          { id: 'mpesa', label: 'M-Pesa / Mobile', icon: Smartphone },
                          { id: 'bank', label: 'Bank Transfer', icon: Landmark },
                          { id: 'card', label: 'Card / Cash', icon: CreditCard },
                          { id: 'invoice', label: 'Vendor Invoice', icon: FileText },
                        ].map(m => {
                          const Icon = m.icon;
                          const active = paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className={`payment-method-pill ${active ? 'active' : ''}`}
                              onClick={() => setPaymentMethod(m.id)}
                            >
                              <Icon size={14} />
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <input type="hidden" name="paymentMethod" value={paymentMethod} />

                      <div className="form-grid">
                        <label className="spacious-field">
                          <span className="field-label">
                            {paymentMethod === 'mpesa' ? 'Recipient / Payee Name' :
                             paymentMethod === 'bank' ? 'Account Holder / Beneficiary' :
                             paymentMethod === 'invoice' ? 'Vendor / Supplier Name' :
                             'Merchant / Store Name'} <b>Required</b>
                          </span>
                          <input
                            name="payeeName"
                            required
                            maxLength={160}
                            placeholder={
                              paymentMethod === 'mpesa' ? 'e.g. John Kamau or Quickmart Supermarket' :
                              paymentMethod === 'bank' ? 'e.g. Acacia Logistics Ltd' :
                              paymentMethod === 'invoice' ? 'e.g. Safaricom Business / Microsoft' :
                              'e.g. Shell Petrol Station or Java House'
                            }
                          />
                        </label>
                        <label className="spacious-field">
                          <span className="field-label">
                            {paymentMethod === 'mpesa' ? 'Phone / Till / Paybill #' :
                             paymentMethod === 'bank' ? 'Bank & Account #' :
                             paymentMethod === 'invoice' ? 'Invoice / Order #' :
                             'Receipt Reference'} <em>Optional</em>
                          </span>
                          <input
                            name="payeePhone"
                            maxLength={40}
                            placeholder={
                              paymentMethod === 'mpesa' ? '0712 345 678 or Till 445522' :
                              paymentMethod === 'bank' ? 'NCBA 1029384756' :
                              paymentMethod === 'invoice' ? 'INV-2026-904' :
                              'POS-993847'
                            }
                          />
                        </label>
                      </div>

                      <div className="form-grid">
                        <label className="spacious-field">
                          <span className="field-label">Receipt / Reference Code <em>Optional</em></span>
                          <input
                            name="merchant"
                            maxLength={160}
                            value={receiptNumber}
                            onChange={e => setReceiptNumber(e.target.value)}
                            placeholder="e.g. QK87X492A or Receipt #3490"
                          />
                        </label>
                        <label className="spacious-field">
                          <span className="field-label">Disbursal / Payment Notes <em>Optional</em></span>
                          <input
                            name="payeeDetails"
                            maxLength={240}
                            placeholder="e.g. Direct till payment upon manager approval"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Section 3: Business Purpose & Suggestions */}
                    <div className="expense-section-card">
                      <div className="section-title">
                        <FileText size={16} />
                        <span>Business Purpose & Justification</span>
                      </div>
                      <label className="spacious-field">
                        <div className="field-label">
                          <span>Explain business reason for approver <b>Required</b></span>
                          <span className="char-count">{purpose.length} / 500</span>
                        </div>
                        <textarea
                          name="description"
                          required
                          maxLength={500}
                          rows={3}
                          value={purpose}
                          onChange={e => setPurpose(e.target.value)}
                          placeholder="What was this expense for and how does it support company operations?"
                        />
                      </label>
                      <div className="quick-purpose-row">
                        <span className="preset-label">Quick suggestions:</span>
                        {[
                          'Client meeting & lunch',
                          'Office supplies replenishment',
                          'Travel fuel & transit',
                          'Software tool subscription',
                          'Equipment maintenance & repair'
                        ].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            className="purpose-chip"
                            onClick={() => {
                              setPurpose(prev => prev ? `${prev} · ${tag}` : tag);
                            }}
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section 4: Receipt / Invoice Proof Attachment */}
                    <div className="expense-section-card">
                      <div className="section-title">
                        <Paperclip size={16} />
                        <span>Receipt / Invoice Proof</span>
                        <em className="optional-tag">Optional</em>
                      </div>
                      {receiptAttachment ? (
                        <div className="attached-file-preview">
                          <div className="attached-file-info">
                            <FileText size={20} />
                            <div>
                              <strong>{receiptFileName || 'Receipt document attached'}</strong>
                              <small>Document attached for reviewer audit</small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="remove-attachment-btn"
                            onClick={() => {
                              setReceiptAttachment('');
                              setReceiptFileName('');
                            }}
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      ) : (
                        <label className="receipt-upload-dropzone">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden-file-input"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('File size must be under 2MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = ev => {
                                setReceiptAttachment(ev.target?.result as string || '');
                                setReceiptFileName(file.name);
                                toast.success(`Attached ${file.name}`);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <div className="dropzone-content">
                            <div className="dropzone-icon">
                              <Paperclip size={18} />
                            </div>
                            <div>
                              <strong>Attach receipt photo or PDF invoice</strong>
                              <p>PNG, JPG or PDF up to 2MB. Approvers can inspect attached receipts before releasing funds.</p>
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                  </>
                ) : null}

                {modal === 'allocate' ? (
                  <>
                    <label>Amount ({business?.currency})<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
                    <label>Allocation reference<input name="note" required maxLength={160} placeholder="e.g. October operating budget" /></label>
                  </>
                ) : null}

                {modal === 'category' ? (
                  <label>Category name<input name="name" required maxLength={60} placeholder="e.g. Professional services" /></label>
                ) : null}

                {modal === 'member' ? (
                  <>
                    <label>Full name<input name="name" required maxLength={80} defaultValue={selectedMember?.name || ''} placeholder="e.g. Amina Hassan" /></label>
                    <label>Login email<input name="email" type="email" required defaultValue={selectedMember?.email || ''} readOnly={Boolean(selectedMember)} placeholder="name@company.com" /></label>
                    <label>Role
                      <Choice
                        label="Role"
                        value={role}
                        onChange={v => setRole(v as Role)}
                        options={
                          canAdmin ? [
                            { value: 'employee', label: 'Team member — personal expense dashboard' },
                            { value: 'accountant', label: 'Finance / Accountant — wallet audit & approvals' },
                            { value: 'manager', label: 'Manager — team control & approvals' },
                            { value: 'admin', label: 'Business admin — full workspace control' }
                          ] : [
                            { value: 'employee', label: 'Team member — personal expense dashboard' }
                          ]
                        }
                      />
                    </label>
                    <label>Account status
                      <Choice
                        label="Account status"
                        value={accountStatus}
                        onChange={setAccountStatus}
                        options={[
                          { value: 'invited', label: 'Invited — can activate by signing in' },
                          { value: 'active', label: 'Active — access enabled' },
                          { value: 'disabled', label: 'Disabled — access blocked' }
                        ]}
                      />
                    </label>
                    <label>Monthly virtual wallet limit ({business?.currency})
                      <input
                        name="walletLimit"
                        type="number"
                        min="0.01"
                        step="0.01"
                        defaultValue={selectedMember?.walletLimit ? (selectedMember.walletLimit / 100).toFixed(2) : ''}
                        placeholder="Leave blank for no limit"
                      />
                    </label>
                    <p className="muted">{canAdmin ? 'Admins can assign any business role.' : 'Managers can create and control team member accounts only.'} Role permissions are enforced consistently on all client and server operations.</p>
                  </>
                ) : null}

                {modal === 'business' ? (
                  <>
                    <label>Business name<input name="name" required maxLength={80} placeholder="e.g. Acacia Technologies" /></label>
                    <label>Wallet currency<Choice label="Currency" value={currency} onChange={setCurrency} options={['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'].map(c => ({ value: c, label: c }))} /></label>
                    <p className="muted">This registration will be reviewed by the platform admin. After approval, you can add managers, team members, wallet budgets, and categories.</p>
                  </>
                ) : null}

                {modal === 'rejectBusiness' ? (
                  <label>Reason for rejection<textarea name="reason" required maxLength={500} rows={3} placeholder="Explain what needs to change before approval…" /></label>
                ) : null}

                {modal === 'reject' ? (
                  <label>Reason for rejection<textarea name="reason" required maxLength={500} rows={3} placeholder="Explain what needs to change…" /></label>
                ) : null}

                {modal === 'approveWithNote' ? (
                  <label>Approval note <em>Optional</em>
                    <textarea name="reviewNote" maxLength={240} rows={2} placeholder="Optional note for the submitter (e.g. Approved for project supplies)…" />
                  </label>
                ) : null}

                {formError ? <p className="form-error" role="alert">{formError}</p> : null}
                <div className="form-actions">
                  <button className="secondary" type="button" disabled={busy} onClick={() => setModal('')}>Cancel</button>
                  <button className="primary" disabled={busy} type="submit">
                    {busy ? 'Saving…' : { expense: 'Submit for approval', allocate: 'Allocate budget', category: 'Create category', member: 'Save team member', business: 'Submit registration', reject: 'Reject expense', rejectBusiness: 'Reject registration', approveWithNote: 'Confirm approval' }[modal]}
                  </button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
        <Toaster position="bottom-right" richColors />
      </SidebarProvider>
    </>
  );
}

function SpendingChart({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const now = new Date(), start = new Date(now);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const values = Array.from({ length: 6 }, (_, i) => {
    const from = new Date(start);
    from.setDate(from.getDate() + i * 5);
    const to = new Date(from);
    to.setDate(to.getDate() + 5);
    return {
      label: shortDate(from.toISOString()),
      value: expenses.filter(e => new Date(e.date) >= from && new Date(e.date) < to).reduce((s, e) => s + e.amount, 0)
    };
  });

  const max = Math.max(...values.map(v => v.value), 100), total = values.reduce((s, v) => s + v.value, 0);

  return (
    <div className="spending-chart">
      <div className="chart-total">{money(total, currency)}<span><span className="legend-dot" /> Approved spending</span></div>
      <div className="bar-chart" role="img" aria-label={`Approved spending over 30 days: ${values.map(v => `${v.label}: ${money(v.value, currency)}`).join('; ')}`}>
        <div className="chart-gridlines"><span>{money(max, currency)}</span><span>{money(max / 2, currency)}</span><span>0</span></div>
        <div className="bars">
          {values.map((v, i) => (
            <div className="bar-column" key={i}>
              <div className="bar-track">
                <div className="bar" title={`${v.label}: ${money(v.value, currency)}`} style={{ height: `${Math.max(v.value / max * 100, v.value ? 2 : 0)}%`, background: i === values.length - 1 ? '#3266e9' : '#dce6fc' }} />
              </div>
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberWallet({ business, email, visible, requested, onRequest }: { business: Business; email: string; visible: boolean; requested: boolean; onRequest: () => void }) {
  const member = business.members.find(m => m.email === email), limit = member?.walletLimit || 0,
    spent = memberSpend(business, email), pending = memberPending(business, email),
    remaining = memberRemaining(business, email);

  if (!visible) return (
    <div className="member-wallet wallet-hidden">
      <div><span>Wallet balance</span><strong>{requested ? 'Requested' : 'Hidden'}</strong></div>
      <p className="muted">Only a business admin or manager can show your virtual wallet balance on this dashboard.</p>
      <button className="primary" disabled={requested} onClick={onRequest}>{requested ? 'Request sent' : 'Request wallet balance'}</button>
    </div>
  );

  return (
    <div className="member-wallet">
      <div><span>Approved</span><strong>{money(spent, business.currency)}</strong></div>
      <div><span>Pending</span><strong>{money(pending, business.currency)}</strong></div>
      <div><span>Remaining</span><strong>{remaining === null ? 'Open' : money(remaining, business.currency)}</strong></div>
      {limit ? <Progress value={Math.min((spent + pending) / limit * 100, 100)} /> : null}
      <p className="muted">{limit ? `${Math.round((spent + pending) / limit * 100)}% of your monthly virtual wallet is reserved or spent.` : 'No personal limit is assigned to your wallet.'}</p>
    </div>
  );
}

function CategoryChart({ business }: { business: Business }) {
  const items = business.categories.map((c, i) => ({
    name: c,
    value: business.expenses.filter(e => e.category === c && e.status === 'approved').reduce((s, e) => s + e.amount, 0),
    color: palettes[i % 6]
  })).filter(i => i.value > 0), total = items.reduce((s, i) => s + i.value, 0);

  let offset = 0;
  const stops = items.map(i => {
    const start = offset;
    offset += i.value / total * 100;
    return `${i.color} ${start}% ${offset}%`;
  }).join(',');

  return (
    <>
      <div className="donut" role="img" aria-label={items.map(i => `${i.name} ${Math.round(i.value / total * 100)}%`).join(',') || 'No approved spending'} style={{ background: total ? `conic-gradient(${stops})` : '#e9edf5' }}>
        <div><strong>{items.length}</strong><span>categories</span></div>
      </div>
      <div className="category-legend">
        {items.length ? items.slice(0, 4).map(i => (
          <div key={i.name}>
            <span className="legend-dot" style={{ background: i.color }} />
            <span>{i.name}</span>
            <strong>{Math.round(i.value / total * 100)}%</strong>
          </div>
        )) : <p className="muted">Approved expenses will appear here.</p>}
        {items.length > 4 ? <small className="muted">+ {items.length - 4} more categories</small> : null}
      </div>
    </>
  );
}
