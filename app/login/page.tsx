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
  Layers3,
  Wifi,
  Activity,
} from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { syncAuthCookie } from '@/lib/cookies';
import { GoogleIcon } from '@/components/google-icon';
import { authCallbackUrl } from '@/lib/auth-url';
import { LegalModal, type LegalTab } from '@/components/legal-modal';
import { LiveAuthBackground } from '@/components/live-auth-background';

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
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');

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
    const { data: signInData, error: signInError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    if (signInData.session?.access_token) {
      syncAuthCookie(signInData.session.access_token, signInData.session.expires_in);
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="auth-shell premium-auth-shell">
      <LiveAuthBackground />
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

          {/* Statutory and Regulatory Badges Footer */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11.5, color: '#64748b', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a href="/terms" target="_blank" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
              <span>·</span>
              <a href="/privacy" target="_blank" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              <span>·</span>
              <button
                type="button"
                onClick={() => { setLegalTab('kenya_compliance'); setLegalModalOpen(true); }}
                style={{ color: '#0284c7', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 600 }}
              >
                Kenyan Legal Framework
              </button>
            </div>
            <span>Governed by KDPA 2019 · Central Bank of Kenya (NPS Act) · KRA e-TIMS Ready</span>
          </div>
        </div>

        <aside className="auth-visual" aria-label="ExpenseIQ workspace preview">
          <div className="auth-visual-top">
            <span className="live-badge"><span /> Live workspace</span>
            <strong>Business wallet control</strong>
          </div>
          <div className="corporate-card-widget">
            <div className="corporate-card-inner">
              <div className="corporate-card-header">
                <div className="corporate-card-brand">
                  <div className="corporate-chip-logo"><Layers3 size={16} /></div>
                  <div>
                    <strong>ExpenseIQ Treasury</strong>
                    <small>Corporate Platinum</small>
                  </div>
                </div>
                <div className="corporate-security-pill">
                  <LockKeyhole size={11} />
                  <span>Confidential Vault</span>
                </div>
              </div>

              <div className="corporate-emv-row">
                <div className="emv-chip" aria-hidden="true">
                  <div className="emv-line-1" />
                  <div className="emv-line-2" />
                </div>
                <div className="contactless-icon" title="NFC Contactless & Live Telemetry">
                  <Wifi size={18} style={{ transform: 'rotate(90deg)' }} />
                </div>
              </div>

              <div className="corporate-card-balance-block">
                <div className="corporate-balance-top">
                  <span>Available Treasury Limit</span>
                  <span className="corporate-tier-badge">Active Policy</span>
                </div>
                <div className="corporate-masked-balance">
                  <span className="currency-tag">KES</span>
                  <span className="masked-dots">• • • • • • • •</span>
                </div>
                <div className="corporate-vault-status">
                  <ShieldCheck size={13} />
                  <span>Zero-exposure balance protection active</span>
                </div>
              </div>

              <div className="corporate-card-footer">
                <div>
                  <span className="corporate-footer-label">CARD NUMBER</span>
                  <span className="corporate-footer-val">••••  ••••  ••••  8492</span>
                </div>
                <div className="corporate-footer-right">
                  <span className="corporate-footer-label">SETTLEMENT</span>
                  <span className="corporate-currency-pills">KES · USD · EUR · GBP</span>
                </div>
              </div>
            </div>

            {/* Quick Live Telemetry Badges */}
            <div className="corporate-telemetry-bar">
              <div className="telemetry-item">
                <CheckCircle2 size={13} />
                <span>Zero-Trust Policy</span>
              </div>
              <div className="telemetry-item">
                <Activity size={13} />
                <span>ExpenseIQ ERP Sync</span>
              </div>
              <div className="telemetry-item">
                <Sparkles size={13} />
                <span>Real-Time Audit</span>
              </div>
            </div>
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

      {/* Interactive In-App Legal Modal */}
      <LegalModal
        open={legalModalOpen}
        onOpenChange={setLegalModalOpen}
        defaultTab={legalTab}
      />
    </main>
  );
}

