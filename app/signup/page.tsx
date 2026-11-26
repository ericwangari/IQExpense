"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CircleDollarSign, ClipboardCheck, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { syncAuthCookie } from '@/lib/cookies';
import { GoogleIcon } from '@/components/google-icon';
import { authCallbackUrl } from '@/lib/auth-url';
import { LegalModal, type LegalTab } from '@/components/legal-modal';
import { LiveAuthBackground } from '@/components/live-auth-background';

export default function Signup() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');

  async function signInWithGoogle() {
    setError('');
    setMessage('');
    if (!agreeTerms) {
      setError('Please read and agree to the Terms of Service and Privacy Policy to continue with Google.');
      return;
    }
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
    setMessage('');
    if (!agreeTerms) {
      setError('Please read and agree to the Terms of Service and Privacy Policy to create your account.');
      return;
    }
    if (!hasSupabaseBrowserConfig()) {
      setError('Supabase is not configured yet. Add the Vercel environment variables, then redeploy.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const password = String(form.get('password') || '');
    setBusy(true);
    const { data, error: signUpError } = await getSupabaseBrowser().auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      if (data.session.access_token) {
        syncAuthCookie(data.session.access_token, data.session.expires_in);
      }
      router.push('/');
      router.refresh();
      return;
    }
    setMessage('Account created. Check your email to confirm access, then sign in. Business admins register their business after login and wait for platform admin approval.');
  }

  return (
    <main className="auth-shell premium-auth-shell">
      <LiveAuthBackground />
      <section className="auth-card premium-auth-card signup-card">
        <div className="auth-main">
          <div className="auth-brand">
            <span className="brandmark"><Building2 size={22} /></span>
            <span>Expense<span>IQ</span></span>
          </div>

          <p className="eyebrow">START A BUSINESS WORKSPACE</p>
          <h1>Register your business, then build a controlled expense team</h1>
          <p className="auth-copy">
            Create your login, register the business, and wait for platform approval. Once approved, business admins can add managers and team members with controlled permissions.
          </p>

          <div className="auth-form">
            <button className="secondary google-button" disabled={busy} type="button" onClick={() => void signInWithGoogle()}>
              <span className="google-mark"><GoogleIcon /></span>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or create with email</span></div>
          </div>

          <form className="app-form auth-form" onSubmit={submit}>
            <label>
              Full name
              <input name="name" required autoComplete="name" placeholder="Your name" />
            </label>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
            </label>
            <label>
              Password
              <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
            </label>

            {/* Terms and Privacy Consent Checkbox */}
            <div style={{ marginTop: 14, marginBottom: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12.5, color: '#334155', lineHeight: 1.5, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: '#0284c7', flexShrink: 0 }}
                />
                <span>
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setLegalTab('terms'); setLegalModalOpen(true); }}
                    style={{ color: '#0284c7', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setLegalTab('privacy'); setLegalModalOpen(true); }}
                    style={{ color: '#0284c7', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Privacy Policy
                  </button>{' '}
                  governed under the Laws of Kenya and the Kenya Data Protection Act, 2019.
                </span>
              </label>
            </div>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {message ? <p className="success-note" role="status">{message}</p> : null}
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-actions">
            <a className="secondary" href="/login">I already have access</a>
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

        <aside className="auth-visual signup-visual" aria-label="Business onboarding preview">
          <div className="auth-visual-top">
            <span className="live-badge"><span /> Approval ready</span>
            <strong>Clean onboarding flow</strong>
          </div>
          <div className="signup-steps premium-signup-steps">
            <div><Sparkles size={20} /><span>1</span><strong>Create login</strong><p>Use Google or email to start securely.</p></div>
            <div><ClipboardCheck size={20} /><span>2</span><strong>Register business</strong><p>Send business details for platform review.</p></div>
            <div><ShieldCheck size={20} /><span>3</span><strong>Get approved</strong><p>Access your private business workspace.</p></div>
            <div><Users size={20} /><span>4</span><strong>Add your team</strong><p>Create sub-logins with role permissions.</p></div>
            <div><CircleDollarSign size={20} /><span>5</span><strong>Assign wallets</strong><p>Set controlled balances for team members.</p></div>
            <div><Building2 size={20} /><span>6</span><strong>Track spend</strong><p>Manage approvals and expense activity.</p></div>
          </div>
        </aside>
      </section>

      {/* Interactive In-App Legal Modal */}
      <LegalModal
        open={legalModalOpen}
        onOpenChange={setLegalModalOpen}
        defaultTab={legalTab}
        showAcceptButton
        onAccept={() => setAgreeTerms(true)}
      />
    </main>
  );
}

