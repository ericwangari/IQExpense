import { ArrowRight, Building2, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { chatGPTSignInPath } from '../chatgpt-auth';

const roles = [
  { title: 'Platform admin', text: 'Control businesses, account status, and system health.', icon: Sparkles },
  { title: 'Business admin', text: 'Manage company wallets, team limits, and expense policy.', icon: Building2 },
  { title: 'Manager', text: 'Review pending approvals and keep spending moving.', icon: ShieldCheck },
  { title: 'Team member', text: 'Submit expenses against a personal virtual wallet.', icon: Users },
];

export default function Login(){
 return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span className="brandmark"><LockKeyhole size={22}/></span><span>Expense<span>IQ</span></span></div><p className="eyebrow">SECURE SAAS LOGIN</p><h1>Sign in to your expense command center</h1><p className="auth-copy">Use one secure account for platform administration, business management, manager approvals, and team expense submission.</p><div className="auth-actions"><a className="primary" href={chatGPTSignInPath('/')}>Login to workspace <ArrowRight size={17}/></a><a className="secondary" href="/signup">Create admin account</a></div><div className="auth-grid">{roles.map(({title,text,icon:Icon})=><article key={title}><Icon size={19}/><strong>{title}</strong><p>{text}</p></article>)}</div></section></main>;
}
