"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, CircleDollarSign, ShieldCheck, Users } from 'lucide-react';
import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';

export default function Signup() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      router.push('/platform');
      router.refresh();
      return;
    }
    setMessage('Account created. Check your email to confirm access, then sign in.');
  }

  return <main className="auth-shell"><section className="auth-card signup-card"><div className="auth-brand"><span className="brandmark"><Building2 size={22}/></span><span>Expense<span>IQ</span></span></div><p className="eyebrow">CREATE YOUR PLATFORM</p><h1>Start with an admin account, then invite managers and teams</h1><p className="auth-copy">The first signed-in user becomes the platform admin for this deployment. From there, create businesses, add managers, assign virtual wallet limits, and route expenses for approval.</p><div className="signup-steps"><div><ShieldCheck size={20}/><span>1</span><strong>Create platform admin</strong><p>Own the SaaS control dashboard.</p></div><div><Users size={20}/><span>2</span><strong>Add managers</strong><p>Managers receive pending approval alerts.</p></div><div><CircleDollarSign size={20}/><span>3</span><strong>Assign wallet limits</strong><p>Each team member gets a controlled allowance.</p></div></div><form className="app-form auth-form" onSubmit={submit}><label>Full name<input name="name" required autoComplete="name" placeholder="Your name"/></label><label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@company.com"/></label><label>Password<input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters"/></label>{error?<p className="form-error" role="alert">{error}</p>:null}{message?<p className="success-note" role="status">{message}</p>:null}<button className="primary" disabled={busy} type="submit">{busy?'Creating account…':'Create admin account'} <ArrowRight size={17}/></button></form><div className="auth-actions"><a className="secondary" href="/login">I already have access</a></div></section></main>;
}
