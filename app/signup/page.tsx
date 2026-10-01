"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CircleDollarSign, ClipboardCheck, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';

export default function Signup() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setError('');
    setMessage('');
    if (!hasSupabaseBrowserConfig()) {
      setError('Supabase is not configured yet. Add the Vercel environment variables, then redeploy.');
      return;
    }
    setBusy(true);
    const { error: oauthError } = await getSupabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (oauthError) setError(oauthError.message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
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
      router.push('/');
      router.refresh();
      return;
    }
    setMessage('Account created. Check your email to confirm access, then sign in. Business admins register their business after login and wait for platform admin approval.');
  }

  return (
    <main className="auth-shell premium-auth-shell">
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
              <span className="google-mark">G</span>
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
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {message ? <p className="success-note" role="status">{message}</p> : null}
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-actions">
            <a className="secondary" href="/login">I already have access</a>
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
    </main>
  );
}

