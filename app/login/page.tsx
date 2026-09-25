"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';

const roles = [
  { title: 'Platform admin', text: 'Control businesses, account status, and system health.', icon: Sparkles },
  { title: 'Business admin', text: 'Manage company wallets, team limits, and expense policy.', icon: Building2 },
  { title: 'Manager', text: 'Review pending approvals and keep spending moving.', icon: ShieldCheck },
  { title: 'Team member', text: 'Submit expenses against a personal virtual wallet.', icon: Users },
];

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span className="brandmark"><LockKeyhole size={22}/></span><span>Expense<span>IQ</span></span></div><p className="eyebrow">SECURE SAAS LOGIN</p><h1>Sign in to your expense command center</h1><p className="auth-copy">Use one secure account for platform administration, business management, manager approvals, and team expense submission.</p><form className="app-form auth-form" onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@company.com"/></label><label>Password<input name="password" type="password" required autoComplete="current-password" placeholder="Your secure password"/></label>{error?<p className="form-error" role="alert">{error}</p>:null}<button className="primary" disabled={busy} type="submit">{busy?'Signing in…':'Login to workspace'} <ArrowRight size={17}/></button></form><div className="auth-actions"><a className="secondary" href="/signup">Create admin account</a></div><div className="auth-grid">{roles.map(({title,text,icon:Icon})=><article key={title}><Icon size={19}/><strong>{title}</strong><p>{text}</p></article>)}</div></section></main>;
}
