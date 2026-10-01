"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { GoogleIcon } from '@/components/google-icon';
import { authCallbackUrl } from '@/lib/auth-url';

const roles = [
  { title: 'Platform admin', text: 'Approve businesses and monitor the whole SaaS.', icon: Sparkles },
  { title: 'Business admin', text: 'Control company wallets, teams, and policy.', icon: Building2 },
  { title: 'Manager', text: 'Approve pending spend requests with clear alerts.', icon: ShieldCheck },
  { title: 'Team member', text: 'Submit expenses inside assigned permissions.', icon: Users },
];

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setError('');
    if (!hasSupabaseBrowserConfig()) {
      setError('Supabase is not configured yet. Add the Vercel environment variables, then redeploy.');
      return;
    }
    setBusy(true);
    const { error: oauthError } = await getSupabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl('/') },
    });
    setBusy(false);
    if (oauthError) setError(oauthError.message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!hasSupabaseBrowserConfig()) {
      setError('Supabase is not configured yet. Add the Vercel environment variables, then redeploy.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim().toLowerCase();
    const password = String(form.get('password') || '');
    setBusy(true);
    const { error: signInError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="auth-shell premium-auth-shell">
      <section className="auth-card premium-auth-card">
        <div className="auth-main">
          <div className="auth-brand">
            <span className="brandmark"><LockKeyhole size={22} /></span>
            <span>Expense<span>IQ</span></span>
          </div>

          <p className="eyebrow">SECURE EXPENSE OPERATIONS</p>
          <h1>Premium expense control for every business workspace</h1>
          <p className="auth-copy">
            Sign in to approve businesses, manage controlled team wallets, review expenses, and keep every shilling accountable from one polished workspace.
          </p>

          <div className="auth-form">
            <button className="secondary google-button" disabled={busy} type="button" onClick={() => void signInWithGoogle()}>
              <span className="google-mark"><GoogleIcon /></span>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or use email</span></div>
          </div>

          <form className="app-form auth-form" onSubmit={submit}>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autoComplete="current-password" placeholder="Your secure password" />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Login to workspace'} <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-actions">
            <a className="secondary" href="/signup">Create business account</a>
          </div>
        </div>

        <aside className="auth-visual" aria-label="ExpenseIQ workspace preview">
          <div className="auth-visual-top">
            <span className="live-badge"><span /> Live workspace</span>
            <strong>Business wallet control</strong>
          </div>
          <div className="wallet-preview-card">
            <div>
              <span>Available balance</span>
              <strong>KES 1.24M</strong>
            </div>
            <WalletCards size={28} />
          </div>
          <div className="preview-list">
            <div><ReceiptText size={18} /><span>Team transport claim</span><strong>Pending</strong></div>
            <div><Bell size={18} /><span>3 manager approvals</span><strong>Alert</strong></div>
            <div><CheckCircle2 size={18} /><span>Policy matched spend</span><strong>Clear</strong></div>
          </div>
          <div className="auth-grid premium-role-grid">
            {roles.map(({ title, text, icon: Icon }) => (
              <article key={title}>
                <Icon size={19} />
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

