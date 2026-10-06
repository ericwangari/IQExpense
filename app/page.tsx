"use client";



import { useEffect, useState, type FormEvent } from 'react';



import { ArrowDownLeft, ArrowUpRight, ArrowRight, Bell, Building2, Check, ChevronRight, CircleHelp, Clock3, Download, LayoutDashboard, LogOut, Plus, Receipt, Search, ShieldCheck, Tags, Users, Wallet, X, Activity, Layers3 } from 'lucide-react';



import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset, SidebarRail } from '@/components/ui/sidebar';



import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';



import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';



import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';



import { Progress } from '@/components/ui/progress';



import { Toaster } from '@/components/ui/sonner';



import { toast } from 'sonner';



import { balance, can, rolePermissions, memberPending, memberRemaining, memberSpend, type Business, type Expense, type View } from '@/lib/model';



import { demoState } from '@/lib/demo';



import { mutate, visibleState } from '@/lib/operations';



import { getSupabaseBrowser, hasSupabaseBrowserConfig } from '@/lib/supabase-browser';
import { MobileAppLock } from '@/components/mobile-app-lock';







const money=(n:number,currency='KES')=>new Intl.NumberFormat('en-KE',{style:'currency',currency,maximumFractionDigits:2,minimumFractionDigits:0}).format(n/100);



const shortDate=(d:string)=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const payeeName=(e:Expense)=>e.payeeName||e.merchant;
const payeePhone=(e:Expense)=>e.payeePhone||'Not provided';
const weekKey=(date:string)=>{const d=new Date(`${date}T00:00:00`),day=(d.getDay()+6)%7,monday=new Date(d);monday.setDate(d.getDate()-day);return monday.toISOString().slice(0,10);};
const reportPeriod=(e:Expense,group:string)=>group==='day'?e.date:group==='week'?`Week of ${weekKey(e.date)}`:group==='month'?e.date.slice(0,7):'All expenses';



const palettes=['#3566ed','#20a995','#f2ac43','#9a72df','#e17a94','#71839e'];



const nav=[['Overview',LayoutDashboard],['Expenses',Receipt],['Approvals',ShieldCheck],['Wallet',Wallet],['Categories',Tags],['Team',Users],['Activity',Activity]] as const;



function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>}



function Status({status}:{status:string}){return <span className={`status ${status}`}><span/>{status==='pending'?'Pending approval':status.charAt(0).toUpperCase()+status.slice(1)}</span>}



function Empty({text}:{text:string}){return <div className="empty"><Receipt size={28}/><p>{text}</p></div>}



function Stat({label,value,detail,icon:Icon,blue=false}:{label:string;value:string;detail:string;icon:typeof Wallet;blue?:boolean}){return <div className={`stat ${blue?'stat-blue':''}`}><div className="stat-label">{label}<Icon size={19}/></div><strong>{value}</strong><p>{detail}</p></div>}



async function authHeaders():Promise<Record<string,string>>{if(!hasSupabaseBrowserConfig())return {};const {data}=await getSupabaseBrowser().auth.getSession();const token=data.session?.access_token;return token?{Authorization:`Bearer ${token}`}:{};}







export function ExpenseApp({platformOnly=false}:{platformOnly?:boolean}){



 const [data,setData]=useState<View|null>(null),[error,setError]=useState(''),[preview,setPreview]=useState(false),[activeId,setActiveId]=useState(''),[page,setPage]=useState('Overview'),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[reportGroup,setReportGroup]=useState('day'),[modal,setModal]=useState(''),[selected,setSelected]=useState<Expense|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState(''),[category,setCategory]=useState(''),[role,setRole]=useState('employee'),[accountStatus,setAccountStatus]=useState('invited'),[currency,setCurrency]=useState('KES');



 const [demo,setDemo]=useState<ReturnType<typeof demoState>|null>(null);



 useEffect(()=>{let live=true;(async()=>{const headers=await authHeaders();const r=await fetch('/api/workspace',{headers});const body=await r.json() as View & {error?:string};if(!r.ok){if(r.status===401&&['localhost','127.0.0.1'].includes(window.location.hostname)){const state=demoState('you@acacia.example');if(live){setDemo(state);setData(visibleState(state,state.owner));setPreview(true);}return;}throw new Error(body.error);}if(live)setData(body);})().catch(e=>{if(live)setError(e.message);});return()=>{live=false};},[]);



 useEffect(()=>{if(platformOnly)setPage('Platform admin');},[platformOnly]);



 const business=data?.businesses.find(b=>b.id===activeId)||data?.businesses[0];



 const me=business?.members.find(m=>m.email===data?.email),myRole=me?.role;



 const canReview=can(myRole,'review_expenses'),canAdmin=myRole==='admin',canManageAccounts=can(myRole,'manage_team')||can(myRole,'manage_team_members'),isEmployee=myRole==='employee';
 const walletVisibleToMe=!isEmployee||Boolean(me?.walletVisible);



 const workspaceNav=nav.filter(([label])=>label==='Approvals'?canReview:label==='Wallet'?can(myRole,'view_company_wallet'):label==='Categories'?can(myRole,'manage_categories'):label==='Team'?canManageAccounts:true);



 const pending=business?.expenses.filter(e=>e.status==='pending')||[],reviewable=pending.filter(e=>canAdmin||e.submittedBy!==data?.email),approved=business?.expenses.filter(e=>e.status==='approved')||[];



 const spend=approved.reduce((s,e)=>s+e.amount,0),pendingTotal=pending.reduce((s,e)=>s+e.amount,0),allocated=business?.ledger.filter(e=>e.amount>0).reduce((s,e)=>s+e.amount,0)||0,allowance=business?memberRemaining(business,data?.email||''):null,mySpend=business&&data?memberSpend(business,data.email):0,myPending=business&&data?memberPending(business,data.email):0;



 function navigate(next:string){setPage(next);setQuery('');setFilter('all');}



 function open(name:string,expense:Expense|null=null){setFormError('');setSelected(expense);setCategory(business?.categories[0]||'');setRole('employee');setAccountStatus('invited');setModal(name);}



 async function signOut(){if(hasSupabaseBrowserConfig())await getSupabaseBrowser().auth.signOut();setData(null);setDemo(null);window.location.href='/login';}



 async function act(payload:Record<string,unknown>){if(busy)return;setBusy(true);setFormError('');try{if(preview&&demo){const next=structuredClone(demo);mutate(next,data!.email,{businessId:business?.id,...payload});setDemo(next);setData(visibleState(next,data!.email));}else{const headers=await authHeaders();const response=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({businessId:business?.id,...payload})});const body=await response.json() as View & {error?:string};if(!response.ok)throw new Error(body.error);setData(body);}toast.success(payload.action==='review'?'Expense decision recorded':'Changes saved');setModal('');}catch(e){const message=e instanceof Error?e.message:'Unable to save. Please try again.';setFormError(message);toast.error(message);}finally{setBusy(false);}}



 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const fields=Object.fromEntries(new FormData(event.currentTarget));const amount=Number(fields.amount),cents=Math.round(amount*100),limit=Number(fields.walletLimit),limitCents=Math.round(limit*100);if('amount'in fields&&(!Number.isFinite(amount)||Math.abs(amount*100-cents)>0.00001)){setFormError('Enter an amount with at most two decimal places.');return;}if('walletLimit'in fields&&fields.walletLimit!==''&&(!Number.isFinite(limit)||Math.abs(limit*100-limitCents)>0.00001)){setFormError('Enter a wallet limit with at most two decimal places.');return;}const payload=modal==='expense'?{action:'submit',...fields,amount:cents,category}:modal==='allocate'?{action:'allocate',...fields,amount:cents}:modal==='category'?{action:'category',...fields}:modal==='member'?{action:'member',...fields,role,accountStatus,walletLimit:fields.walletLimit===''?undefined:limitCents}:modal==='business'?{action:'registerBusiness',...fields,currency}:modal==='rejectBusiness'?{action:'reviewBusiness',businessId:activeId,status:'rejected',...fields}:{action:'review',expenseId:selected?.id,status:'rejected',...fields};void act(payload);}



 const filtered=(page==='Approvals'?(canReview?pending:[]):business?.expenses||[]).filter(e=>(filter==='all'||e.status===filter)&&`${e.merchant} ${payeeName(e)} ${e.payeePhone||''} ${e.payeeDetails||''} ${e.category} ${e.submittedBy}`.toLowerCase().includes(query.toLowerCase()));



 function exportExpenses(){if(!business)return;const safe=(s:string)=>`"${(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')}"`;const csv=[['Report period','Payee name','Payee contact','Payee details','Merchant / reference','Amount','Currency','Category','Date','Submitted by','Status','Business purpose'],...filtered.map(e=>[reportPeriod(e,reportGroup),payeeName(e),payeePhone(e),e.payeeDetails||'',e.merchant,(e.amount/100).toFixed(2),business.currency,e.category,e.date,e.submittedBy,e.status,e.description])].map(row=>row.map(safe).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=`expenseiq-expenses-${reportGroup}.csv`;a.click();URL.revokeObjectURL(url);}

 function exportExpensesPdf(){if(!business)return;const escapePdf=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');const fit=(value:string,length:number)=>value.length>length?`${value.slice(0,length-1)}...`:value;const reportTitle=page==='Approvals'?'Expense approval report':'Expense report';const generated=new Date().toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});const total=filtered.reduce((sum,e)=>sum+e.amount,0);const grouped=filtered.reduce((map,e)=>{const key=reportPeriod(e,reportGroup);const list=map.get(key)||[];list.push(e);map.set(key,list);return map;},new Map<string,Expense[]>());const pages:string[][]=[];let current:string[]=[];const add=(line:string)=>{current.push(line);if(current.length>=32){pages.push(current);current=[];}};add(`${reportTitle} - ${business.name}`);add(`Generated: ${generated}`);add(`Grouping: ${reportGroup.charAt(0).toUpperCase()+reportGroup.slice(1)}    Currency: ${business.currency}    Expenses: ${filtered.length}    Total: ${money(total,business.currency)}`);add('');if(!filtered.length)add('No expenses match the current filters.');[...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).forEach(([period,items])=>{const subtotal=items.reduce((sum,e)=>sum+e.amount,0);add(`${period}  |  ${items.length} expenses  |  ${money(subtotal,business.currency)}`);add('Payee / Contact                 Amount            Category              Date        Submitted by          Status');add('------------------------------------------------------------------------------------------------');items.forEach(e=>{add(`${fit(payeeName(e),26).padEnd(31)}${fit(money(e.amount,business.currency),16).padEnd(18)}${fit(e.category,18).padEnd(22)}${shortDate(e.date).padEnd(12)}${fit(nameOf(e.submittedBy),18).padEnd(22)}${e.status}`);const payeeExtras=[e.payeePhone,e.payeeDetails].filter(Boolean).join(' | ');if(payeeExtras)add(`  Details: ${fit(payeeExtras,86)}`)});add('');});if(current.length)pages.push(current);const objects:string[]=[];objects.push('<< /Type /Catalog /Pages 2 0 R >>');objects.push(`<< /Type /Pages /Kids [${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`);objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');pages.forEach((lines,pageIndex)=>{const content=lines.map((line,i)=>`BT /F1 ${i<1?16:9} Tf 40 ${800-i*22} Td (${escapePdf(line)}) Tj ET`).join('\n')+`\nBT /F1 8 Tf 40 28 Td (${escapePdf(`ExpenseIQ Business - Page ${pageIndex+1} of ${pages.length}`)}) Tj ET`;const contentObject=5+pageIndex*2;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);});let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((object,index)=>{offsets[index+1]=pdf.length;pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});const startxref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=`expenseiq-expenses-${reportGroup}.pdf`;a.click();URL.revokeObjectURL(url);}



 if(!data)return <main className="loading"><div className="brandmark"><Layers3/></div><h1>ExpenseIQ <span>Business</span></h1><p>{error||'Opening your workspace…'}</p>{error?<div className="auth-actions"><a className="primary" href="/login">Login</a><a className="secondary" href="/signup">Create account</a></div>:<div className="loading-bar"/>}</main>;



 if(platformOnly&&!data.platform)return <main className="loading"><div className="brandmark"><ShieldCheck/></div><h1>Platform admin login required</h1><p>This dashboard is locked to the single platform admin account. Business admins, managers, and team members can only access their approved business workspace.</p><div className="auth-actions"><a className="primary" href="/">Go to my workspace</a><button className="secondary" onClick={()=>void signOut()}>Sign in as platform admin</button></div></main>;



 if(!business&&!platformOnly)return <main className="loading"><div className="brandmark"><ShieldCheck/></div><h1>{data.platform?'Platform ready':'Register your business'}</h1><p>{data.platform?'Open the platform dashboard to review business registrations.':'Create your business registration. The platform admin will approve it before your workspace opens.'}</p><div className="auth-actions">{data.platform?<a className="primary" href="/platform">Open platform dashboard</a>:<button className="primary" onClick={()=>open('business')}>Register business</button>}<a className="secondary" href="/login">Use another account</a></div><Dialog open={modal==='business'} onOpenChange={v=>{if(!v&&!busy)setModal('')}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Register your business</DialogTitle><DialogDescription>Send your business for platform admin approval. Once approved, you can add managers and team members.</DialogDescription></DialogHeader><form onSubmit={submit} className="app-form"><label>Business name<input name="name" required maxLength={80} placeholder="e.g. Acacia Technologies"/></label><label>Wallet currency<Choice label="Currency" value={currency} onChange={setCurrency} options={['KES','USD','EUR','GBP','UGX','TZS'].map(c=>({value:c,label:c}))}/></label>{formError?<p className="form-error" role="alert">{formError}</p>:null}<div className="form-actions"><button className="secondary" type="button" disabled={busy} onClick={()=>setModal('')}>Cancel</button><button className="primary" disabled={busy} type="submit">{busy?'Submitting…':'Submit for approval'}</button></div></form></DialogContent></Dialog><Toaster position="bottom-right" richColors/></main>;



 const nameOf=(email:string)=>business?.members.find(m=>m.email===email)?.name||email;



 if(business&&!platformOnly&&(business.approvalStatus||'approved')!=='approved')return <main className="loading"><div className="brandmark"><Building2/></div><h1>{business.approvalStatus==='rejected'?'Registration rejected':'Registration pending'}</h1><p>{business.approvalStatus==='rejected'?business.rejectionReason||'The platform admin rejected this registration.':'Your business registration is waiting for platform admin approval. You can access the workspace after approval.'}</p><div className="auth-actions"><a className="primary" href="/login">Refresh login</a><a className="secondary" href="/">Workspace home</a></div></main>;



 const transactions=(items:Expense[],review=false)=><Table><TableHeader><TableRow><TableHead>Expense</TableHead><TableHead>Payee</TableHead><TableHead>Category</TableHead><TableHead>Submitted by</TableHead><TableHead>Date</TableHead><TableHead className="numeric">Amount</TableHead><TableHead>Status</TableHead>{review?<TableHead>Review</TableHead>:null}</TableRow></TableHeader><TableBody>{items.map(e=><TableRow key={e.id}><TableCell><button className="merchant" onClick={()=>open('details',e)}><span className="merchant-icon" style={{background:palettes[Math.max(business?.categories.indexOf(e.category)||0,0)%6]+'15',color:palettes[Math.max(business?.categories.indexOf(e.category)||0,0)%6]}}>{e.merchant.slice(0,1)}</span><span>{e.merchant}<small>EXP-{e.id.slice(-5).toUpperCase()}</small></span></button></TableCell><TableCell><span className="category-label">{payeeName(e)}<small>{payeePhone(e)}</small></span></TableCell><TableCell><span className="category-label">{e.category}</span></TableCell><TableCell>{nameOf(e.submittedBy)}</TableCell><TableCell className="muted nowrap">{shortDate(e.date)}</TableCell><TableCell className="numeric amount">{money(e.amount,business?.currency)}</TableCell><TableCell><Status status={e.status}/></TableCell>{review?<TableCell>{e.submittedBy===data.email&&!canAdmin?<small className="muted">Needs another reviewer</small>:canReview?<div className="review-actions"><button disabled={busy||business?.suspended} aria-label={`Approve ${e.merchant}`} onClick={()=>void act({action:'review',expenseId:e.id,status:'approved'})}><Check size={17}/></button><button disabled={busy||business?.suspended} aria-label={`Reject ${e.merchant}`} onClick={()=>open('reject',e)}><X size={17}/></button></div>:null}</TableCell>:null}</TableRow>)}</TableBody></Table>;



 return <><MobileAppLock email={data.email}/><SidebarProvider><Sidebar className="app-sidebar" collapsible="icon"><SidebarHeader><a className="brand" href={platformOnly?'/platform':'/'}><span className="brandmark"><Layers3 size={23}/></span><span>Expense<span className="brand-iq">IQ</span><small>{platformOnly?'PLATFORM':'BUSINESS'}</small></span></a>{!platformOnly?<div className="workspace-select"><span className="company-icon"><Building2 size={18}/></span><div><small>WORKSPACE</small><Choice label="Business workspace" value={business?.id||''} onChange={v=>{setActiveId(v);navigate('Overview');}} options={data.businesses.map(b=>({value:b.id,label:b.name}))}/></div></div>:null}</SidebarHeader><SidebarContent>{platformOnly?<><div className="nav-caption">PLATFORM</div><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive className="nav-item" tooltip="Admin dashboard" onClick={()=>navigate('Platform admin')}><Building2/><span>Admin dashboard</span><span className="admin-dot"/></SidebarMenuButton></SidebarMenuItem></SidebarMenu></>:<><div className="nav-caption">WORKSPACE</div><SidebarMenu>{workspaceNav.map(([label,Icon])=><SidebarMenuItem key={label}><SidebarMenuButton isActive={page===label} onClick={()=>navigate(label)} className="nav-item" tooltip={label}><Icon/><span>{label}</span>{label==='Approvals'&&reviewable.length>0?<b className="nav-count">{reviewable.length}</b>:null}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></>}</SidebarContent><SidebarRail className="sidebar-rail"/><SidebarFooter><div className="sidebar-note"><ShieldCheck size={20}/><strong>{platformOnly?'Platform control room.':'Role-based workspace.'}</strong><p>{platformOnly?'Only the platform owner can access this dashboard.':'Your menu only shows what your role can use.'}</p></div><div className="profile"><div className="avatar">{data.email.slice(0,2).toUpperCase()}</div><div><strong>{nameOf(data.email)}</strong><small>{platformOnly?'Platform admin':myRole==='admin'?'Business admin':myRole==='manager'?'Manager':myRole==='employee'?'Employee':'Workspace user'}</small></div><button className="logout-button" onClick={()=>void signOut()} aria-label="Sign out"><LogOut size={16}/></button></div></SidebarFooter></Sidebar><SidebarInset className="main-shell"><header className="topbar"><div className="breadcrumb"><SidebarTrigger/><span>{platformOnly?'Platform':'Workspace'}</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="topbar-right"><span className="workspace-status">{platformOnly?'Platform admin':business?.suspended?'Account suspended':'Business workspace'}</span>{canReview&&!platformOnly?<button className="notification-pill" onClick={()=>navigate('Approvals')} aria-label={`${reviewable.length} pending approvals`}><Bell size={16}/>{reviewable.length}</button>:null}{data.platform&&!platformOnly?<a className="secondary topbar-link" href="/platform"><Building2 size={16}/>Platform dashboard</a>:null}<button className="help-button" aria-label="Approval and wallet help" onClick={()=>open('help')}><CircleHelp size={20}/></button><button className="secondary topbar-link" onClick={()=>void signOut()}><LogOut size={16}/>Sign out</button><div className="avatar small">{data.email.slice(0,2).toUpperCase()}</div></div></header>



 <main className="content"><div className="page-heading"><div><p className="eyebrow">{page==='Platform admin'?'YOUR PLATFORM':business?.name||'YOUR WORKSPACE'}</p><h1>{page==='Overview'?isEmployee?'My expense dashboard':'Business overview':page==='Wallet'?'Company wallet':page==='Approvals'?'Expense approvals':page}</h1><p className="subtitle">{{Overview:isEmployee?'Track your allowance, submissions, and approval status.':'A clear picture of your company spending.',Expenses:'Track every expense, from submission to approval.',Approvals:'Keep business spending moving, with the right checks.',Wallet:'Allocate budgets and follow every movement.',Categories:'Organize spending around the way your business works.',Team:canAdmin?'Access control and login accounts for your business.':'Manage team member accounts, wallet limits, and access status.',Activity:'A record of the decisions behind your spending.','Platform admin':'Review registered businesses and manage platform access.'}[page]}</p></div><div className="heading-actions">{page==='Team'&&canManageAccounts&&!platformOnly?<button className="primary" disabled={business?.suspended} onClick={()=>open('member')}><Plus size={18}/>Add team member</button>:page==='Categories'&&canAdmin&&!platformOnly?<button className="primary" disabled={business?.suspended} onClick={()=>open('category')}><Plus size={18}/>New category</button>:page==='Wallet'&&canAdmin&&!platformOnly?<button className="primary" disabled={business?.suspended} onClick={()=>open('allocate')}><Plus size={18}/>Allocate budget</button>:business&&myRole&&!platformOnly?<button className="primary" disabled={business.suspended} onClick={()=>open('expense')}><Plus size={18}/>New expense</button>:null}</div></div>



 {preview?<div className="notice">Local preview Â· Demo data. Production starts empty and persists in Supabase.</div>:null}







 {business?.suspended&&!platformOnly?<div className="notice warning">This business is suspended. Expense submissions and changes are paused.</div>:null}



 {!business&&!platformOnly?<Empty text="You do not belong to a business yet. Ask a business admin to add your sign-in email."/>:null}



 {business&&page==='Overview'&&!platformOnly?<><div className="stats"><Stat label={isEmployee?'Your approved expenses':'Approved spending'} value={money(spend,business.currency)} detail={`${approved.length} approved expenses Â· all time`} icon={ArrowUpRight}/><Stat label="Pending approval" value={money(pendingTotal,business.currency)} detail={`${pending.length} expenses awaiting review`} icon={Clock3}/><Stat label={isEmployee?'Your wallet balance':'Available budget'} value={isEmployee?(walletVisibleToMe&&allowance!==null?money(allowance,business.currency):me?.walletVisibilityRequested?'Requested':'Hidden'):money(balance(business),business.currency)} detail={isEmployee?(walletVisibleToMe&&me?.walletLimit?`${money(mySpend,business.currency)} spent · ${money(myPending,business.currency)} pending`:me?.walletVisibilityRequested?'Waiting for manager approval':'Request visibility from your manager'):'Internal wallet balance'} icon={Wallet} blue/><Stat label={isEmployee?'Rejected expenses':'Team members'} value={isEmployee?String(business.expenses.filter(e=>e.status==='rejected').length):String(business.members.length)} detail={isEmployee?'Review the reason and resubmit':`${business.members.filter(m=>m.role!=='employee').length} admins & managers`} icon={Users}/></div><div className="dashboard-grid"><section className="panel spending-panel"><div className="panel-title"><div><h2>Spending overview</h2><p>Approved expenses over the last 30 days</p></div><span className="subtle-tag">{business.currency}</span></div><SpendingChart expenses={approved} currency={business.currency}/></section><section className="panel categories-panel"><div className="panel-title"><h2>{isEmployee?'Your virtual wallet':'Spend by category'}</h2><button className="text-button" onClick={()=>navigate(isEmployee?'Expenses':'Categories')}>View all <ArrowRight size={15}/></button></div>{isEmployee?<MemberWallet business={business} email={data.email} visible={walletVisibleToMe} requested={Boolean(me?.walletVisibilityRequested)} onRequest={()=>void act({action:'requestWalletVisibility'})}/>:<CategoryChart business={business}/>}</section></div>{reviewable.length>0&&canReview?<div className="approval-banner notification-banner"><div className="approval-symbol"><Bell size={23}/></div><div><strong>{reviewable.length} expenses need business approval</strong><p>{money(reviewable.reduce((s,e)=>s+e.amount,0),business.currency)} is waiting for a business admin or manager decision.</p></div><button onClick={()=>navigate('Approvals')}>Open approval queue <ArrowRight size={17}/></button></div>:pending.length>0?<div className="approval-banner"><div className="approval-symbol"><ShieldCheck size={23}/></div><div><strong>{pending.length} expenses are waiting for approval</strong><p>{money(pendingTotal,business.currency)} in pending requests.</p></div><button onClick={()=>navigate('Approvals')}>Review status <ArrowRight size={17}/></button></div>:null}<section className="panel"><div className="panel-title"><div><h2>Recent expenses</h2><p>Your latest business transactions</p></div><button className="text-button" onClick={()=>navigate('Expenses')}>View all expenses <ArrowRight size={16}/></button></div>{business.expenses.length?transactions(business.expenses.slice(0,5)):<Empty text="Your first expense starts here. Select New expense to submit it."/>}</section></>:null}



 {business&&['Expenses','Approvals'].includes(page)&&!platformOnly?<section className="panel"><div className="table-toolbar"><div className="searchbox"><Search size={17}/><input aria-label="Search expenses" placeholder="Search merchant, category or member…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="toolbar-right">{page==='Expenses'?<Choice label="Expense status" value={filter} onChange={setFilter} options={[{value:'all',label:'All statuses'},{value:'pending',label:'Pending approval'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}]}/>:<span className="muted">{reviewable.length} awaiting your review  -  {pending.length} total pending</span>}<Choice label="Report grouping" value={reportGroup} onChange={setReportGroup} options={[{value:'day',label:'Report by day'},{value:'week',label:'Report by week'},{value:'month',label:'Report by month'}]}/><button className="secondary" onClick={exportExpenses}><Download size={16}/>Export CSV</button><button className="secondary" onClick={exportExpensesPdf}><Download size={16}/>Export PDF</button></div></div>{filtered.length?transactions(filtered,page==='Approvals'):<Empty text={query?'No expenses match your search.':page==='Approvals'?'All caught up. No expenses are waiting for business approval.':'No expenses yet.'}/>}</section>:null}



 {business&&page==='Wallet'&&!isEmployee&&!platformOnly?<><div className="wallet-grid"><section className="wallet-card"><div><Layers3 size={25}/><span>EXPENSEIQ BUSINESS</span></div><p>Available budget</p><strong>{money(balance(business),business.currency)}</strong><div className="wallet-card-footer"><span>{business.name}<small>INTERNAL BUDGET WALLET</small></span><Wallet size={32}/></div></section><section className="panel wallet-summary"><h2>Budget at a glance</h2><dl><div><dt>Total allocated</dt><dd>{money(allocated,business.currency)}</dd></div><div><dt>Approved spending</dt><dd>{money(spend,business.currency)}</dd></div><div><dt>Pending requests</dt><dd>{money(pendingTotal,business.currency)}</dd></div></dl><Progress value={allocated?Math.min(spend/allocated*100,100):0}/><p className="muted">{allocated?Math.round(spend/allocated*100):0}% used. Pending requests are not deducted.</p></section></div><section className="panel"><div className="panel-title"><div><h2>Wallet activity</h2><p>Budget allocations and approved expense deductions</p></div><span className="subtle-tag">Internal funds only</span></div>{business.ledger.length?<Table><TableHeader><TableRow><TableHead>Transaction</TableHead><TableHead>Recorded by</TableHead><TableHead>Date</TableHead><TableHead className="numeric">Amount</TableHead></TableRow></TableHeader><TableBody>{[...business.ledger].sort((a,b)=>b.date.localeCompare(a.date)).map(e=><TableRow key={e.id}><TableCell><div className="ledger-title"><span className={e.amount>0?'credit-icon':'debit-icon'}>{e.amount>0?<ArrowDownLeft size={20}/>:<ArrowUpRight size={20}/>}</span><span>{e.note}<small>{e.amount>0?'Budget allocation':'Approved expense'}</small></span></div></TableCell><TableCell>{nameOf(e.actor)}</TableCell><TableCell>{shortDate(e.date)}</TableCell><TableCell className={`numeric amount ${e.amount>0?'credit':''}`}>{e.amount>0?'+':''}{money(e.amount,business.currency)}</TableCell></TableRow>)}</TableBody></Table>:<Empty text="Allocate a budget to start using your company wallet."/>}</section></>:null}



 {business&&page==='Categories'&&!platformOnly?<div className="category-grid">{business.categories.map((c,i)=>{const expenses=approved.filter(e=>e.category===c),total=expenses.reduce((s,e)=>s+e.amount,0);return <section className="panel category-card" key={c}><span className="category-icon" style={{color:palettes[i%6],background:palettes[i%6]+'16'}}><Tags size={21}/></span><h2>{c}</h2><strong>{money(total,business.currency)}</strong><p>{expenses.length} approved expenses</p><Progress value={spend?total/spend*100:0}/><small>{spend?Math.round(total/spend*100):0}% of approved spending</small></section>})}</div>:null}



 {business&&page==='Team'&&!isEmployee&&!platformOnly?<><section className="acl-grid">{(['admin','manager','employee'] as const).map(r=><article className="panel acl-card" key={r}><span className={`role-label ${r}`}>{r==='admin'?'Business admin':r==='manager'?'Manager':'Team member'}</span><h2>{r==='admin'?'Full workspace control':r==='manager'?'Team control and approvals':'Personal expense tracking'}</h2><p>{rolePermissions[r].map(p=>p.replaceAll('_',' ')).join(' Â· ')}</p></article>)}</section><section className="panel"><div className="panel-title"><div><h2>Member login accounts</h2><p>{canAdmin?'Business admins can manage every account and role.':'Managers can create, pause, and control team member accounts.'} Members sign in with the same email to open their own dashboard.</p></div><span className="subtle-tag">{business.members.length} accounts</span></div><Table><TableHeader><TableRow><TableHead>Team member</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Wallet limit</TableHead><TableHead>Remaining</TableHead><TableHead>Wallet visibility</TableHead><TableHead>Permissions</TableHead></TableRow></TableHeader><TableBody>{business.members.map(m=><TableRow key={m.email}><TableCell><div className="team-name"><span className="avatar">{m.name.slice(0,2).toUpperCase()}</span><strong>{m.name}{m.email===data.email?' (you)':''}</strong></div></TableCell><TableCell>{m.email}</TableCell><TableCell><span className={`role-label ${m.role}`}>{m.role==='admin'?'Business admin':m.role==='manager'?'Manager':'Team member'}</span></TableCell><TableCell><Status status={m.accountStatus||'invited'}/></TableCell><TableCell className="amount">{m.walletLimit?money(m.walletLimit,business.currency):'No limit'}</TableCell><TableCell className="amount">{m.walletLimit?money(memberRemaining(business,m.email) ?? 0,business.currency):'Open'}</TableCell><TableCell>{m.role==='employee'?<button className="text-button" disabled={busy||business.suspended} onClick={()=>void act({action:'walletVisibility',email:m.email,visible:!m.walletVisible})}>{m.walletVisible?'Hide balance':m.walletVisibilityRequested?'Approve request':'Show balance'}</button>:<span className="subtle-tag">Always visible</span>}</TableCell><TableCell className="muted">{m.role==='admin'?'Wallet, team, categories, approvals':m.role==='manager'?'Approvals, team member controls, company view':'Own dashboard and expense tracking only'}</TableCell></TableRow>)}</TableBody></Table><div className="panel-footnote">Invited accounts become active when that email signs in. Disabled accounts cannot read the workspace or submit expenses.</div></section></>:null}



 {business&&page==='Activity'&&!platformOnly?<section className="panel"><div className="panel-title"><h2>Audit trail</h2><span className="subtle-tag">{business.audit.length} events</span></div>{business.audit.map(e=><div className="audit-row" key={e.id}><span className="audit-icon"><Activity size={18}/></span><div><strong>{e.action}</strong><p>{nameOf(e.actor)}</p></div><time>{new Date(e.date).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</time></div>)}</section>:null}



 {page==='Platform admin'&&data.platform&&platformOnly?<><div className="stats"><Stat label="Business accounts" value={String(data.businesses.length)} detail="Across your platform" icon={Building2}/><Stat label="Pending registrations" value={String(data.businesses.filter(b=>(b.approvalStatus||'approved')==='pending').length)} detail="Need platform review" icon={Clock3}/><Stat label="Active businesses" value={String(data.businesses.filter(b=>(b.approvalStatus||'approved')==='approved'&&!b.suspended).length)} detail="Enabled for expense management" icon={ShieldCheck}/><Stat label="Team memberships" value={String(data.businesses.reduce((s,b)=>s+b.members.length,0))} detail="Across all company workspaces" icon={Users}/></div>{data.businesses.length===0?<section className="panel platform-empty"><span className="approval-symbol"><Building2 size={24}/></span><h2>No business registrations yet</h2><p>Business admins register their own businesses after signing in. New registrations will appear here for approval before the workspace becomes active.</p></section>:<section className="panel"><div className="panel-title"><div><h2>Business registrations</h2><p>Approve registered businesses before their admins can add managers and team members.</p></div></div><Table><TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Business admin</TableHead><TableHead>Team</TableHead><TableHead>Status</TableHead><TableHead>Manage</TableHead></TableRow></TableHeader><TableBody>{data.businesses.map(b=><TableRow key={b.id}><TableCell><span className="merchant"><span className="company-icon"><Building2 size={19}/></span><span>{b.name}<small>{b.currency} workspace</small></span></span></TableCell><TableCell>{b.members.find(m=>m.role==='admin')?.email}</TableCell><TableCell>{b.members.length} members</TableCell><TableCell><Status status={b.suspended?'suspended':b.approvalStatus||'approved'}/></TableCell><TableCell>{(b.approvalStatus||'approved')==='pending'?<div className="review-actions"><button disabled={busy} aria-label={`Approve ${b.name}`} onClick={()=>void act({action:'reviewBusiness',businessId:b.id,status:'approved'})}><Check size={17}/></button><button disabled={busy} aria-label={`Reject ${b.name}`} onClick={()=>{setSelected(null);setFormError('');setActiveId(b.id);setModal('rejectBusiness')}}><X size={17}/></button></div>:<button className="text-button" disabled={busy} onClick={()=>void act({action:'suspend',businessId:b.id})}>{b.suspended?'Reactivate':'Suspend'}</button>}</TableCell></TableRow>)}</TableBody></Table></section>}</>:null}



 <footer className="content-footer"><span>ExpenseIQ Business</span><span><ShieldCheck size={14}/> Accountable spending, together.</span></footer></main></SidebarInset>



 <Dialog open={Boolean(modal)} onOpenChange={v=>{if(!v&&!busy)setModal('')}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>{{expense:'Submit an expense',allocate:'Allocate wallet budget',category:'New expense category',member:'Add or update a team member',business:'Register a business',reject:'Reject expense',rejectBusiness:'Reject business registration',details:selected?.merchant||'Expense details',help:'How your workspace works'}[modal]}</DialogTitle><DialogDescription>{{expense:'Give your reviewer the details they need to approve this expense.',allocate:'Record an internal budget allocation. This does not move real money.',category:'Create a category that matches your business spending.',member:'Grant access by sign-in email. No invitation email will be sent.',business:'Submit your business for platform admin approval.',reject:'Tell the submitter why this expense cannot be approved.',rejectBusiness:'Tell the business admin why this registration cannot be approved yet.',details:'Expense details and approval history.',help:'From expense submission to an accountable decision.'}[modal]}</DialogDescription></DialogHeader>



 {modal==='help'?<div className="help-content"><h3>1. Allocate a budget</h3><p>Business admins add internal budget to the company wallet.</p><h3>2. Submit expenses</h3><p>Team members select a category and explain the business purpose.</p><h3>3. Review independently</h3><p>Managers and admins approve or reject expenses. Managers need another reviewer for their own submissions; business admins can approve inside their workspace.</p><h3>4. Follow the balance</h3><p>Approval deducts the expense once. Activity records every decision. Wallets track budgets only and do not hold real money.</p></div>:modal==='details'&&selected?<div className="expense-detail"><div className="detail-amount">{money(selected.amount,business?.currency)}<Status status={selected.status}/></div><dl><div><dt>Payee</dt><dd>{payeeName(selected)}</dd></div>{selected.payeePhone?<div><dt>Payee contact</dt><dd>{selected.payeePhone}</dd></div>:null}{selected.payeeDetails?<div><dt>Payee details</dt><dd>{selected.payeeDetails}</dd></div>:null}<div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Expense date</dt><dd>{shortDate(selected.date)}</dd></div><div><dt>Submitted by</dt><dd>{nameOf(selected.submittedBy)}</dd></div>{selected.reviewedBy?<div><dt>Reviewed by</dt><dd>{nameOf(selected.reviewedBy)}</dd></div>:null}</dl><h3>Business purpose</h3><p>{selected.description}</p>{selected.reason?<><h3>Rejection reason</h3><p>{selected.reason}</p></>:null}{selected.status==='pending'&&canReview&&(canAdmin||selected.submittedBy!==data.email)?<div className="notice">Business admins and managers can approve or reject this expense inside this workspace.</div>:null}{selected.status==='pending'&&canReview&&(canAdmin||selected.submittedBy!==data.email)?<div className="form-actions"><button className="secondary" disabled={busy||business?.suspended} onClick={()=>open('reject',selected)}>Reject</button><button className="primary" disabled={busy||business?.suspended} onClick={()=>void act({action:'review',expenseId:selected.id,status:'approved'})}>Approve expense</button></div>:null}</div>:<form onSubmit={submit} className="app-form" key={modal}>



 {modal==='expense'?<><div className="expense-capture-card"><div className="expense-capture-head"><span className="approval-symbol"><Receipt size={20}/></span><div><strong>Who is getting paid?</strong><p>Start with the payee, then add optional contact or payment notes only when they help the manager approve faster.</p></div></div><div className="form-grid"><label className="premium-field"><span className="field-label">Payee name <b>Required</b></span><input name="payeeName" required maxLength={160} placeholder="Quickmart Thika, John plumber, Office supplier"/></label><label className="premium-field"><span className="field-label">Merchant / reference <b>Required</b></span><input name="merchant" required maxLength={160} placeholder="Receipt #, invoice #, repair job, or branch"/></label></div><div className="form-grid"><label className="premium-field optional-field"><span className="field-label">Payee contact <em>Optional</em></span><input name="payeePhone" maxLength={40} placeholder="Phone, till, or account contact"/><small>Add this only when the approver needs a follow-up contact.</small></label><label className="premium-field optional-field"><span className="field-label">Payment notes <em>Optional</em></span><input name="payeeDetails" maxLength={240} placeholder="Till number, branch, bank account, or notes"/><small>Use this for extra payment instructions or internal context.</small></label></div></div><div className="expense-capture-card subtle"><div className="form-grid"><label className="premium-field"><span className="field-label">Amount ({business?.currency}) <b>Required</b></span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"/></label><label className="premium-field"><span className="field-label">Expense date <b>Required</b></span><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} max={new Date().toISOString().slice(0,10)}/></label></div><label className="premium-field"><span className="field-label">Category <b>Required</b></span><Choice label="Category" value={category} onChange={setCategory} options={(business?.categories||[]).map(c=>({value:c,label:c}))}/></label><label className="premium-field"><span className="field-label">Business purpose <b>Required</b></span><textarea name="description" required maxLength={500} rows={3} placeholder="What was this expense for?"/></label></div></>:null}



 {modal==='allocate'?<><label>Amount ({business?.currency})<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"/></label><label>Allocation reference<input name="note" required maxLength={160} placeholder="e.g. October operating budget"/></label></>:null}



 {modal==='category'?<label>Category name<input name="name" required maxLength={60} placeholder="e.g. Professional services"/></label>:null}



 {modal==='member'?<><label>Full name<input name="name" required maxLength={80} placeholder="e.g. Amina Hassan"/></label><label>Login email<input name="email" type="email" required placeholder="name@company.com"/></label><label>Role<Choice label="Role" value={role} onChange={setRole} options={(canAdmin?[{value:'employee',label:'Team member — own dashboard only'},{value:'manager',label:'Manager — approvals and team member controls'},{value:'admin',label:'Business admin — manage access, wallet and policy'}]:[{value:'employee',label:'Team member — own dashboard only'}])}/></label><label>Account status<Choice label="Account status" value={accountStatus} onChange={setAccountStatus} options={[{value:'invited',label:'Invited — can activate by signing in'},{value:'active',label:'Active — access enabled'},{value:'disabled',label:'Disabled — access blocked'}]}/></label><label>Monthly virtual wallet limit ({business?.currency})<input name="walletLimit" type="number" min="0.01" step="0.01" placeholder="Leave blank for no limit"/></label><p className="muted">{canAdmin?'Admins can assign any business role.':'Managers can create and control team member accounts only.'} Authentication happens through secure sign-in; ACL permissions are enforced by role and account status.</p></>:null}



 {modal==='business'?<><label>Business name<input name="name" required maxLength={80} placeholder="e.g. Acacia Technologies"/></label><label>Wallet currency<Choice label="Currency" value={currency} onChange={setCurrency} options={['KES','USD','EUR','GBP','UGX','TZS'].map(c=>({value:c,label:c}))}/></label><p className="muted">This registration will be reviewed by the platform admin. After approval, you can add managers, team members, wallet budgets, and categories.</p></>:null}



 {modal==='rejectBusiness'?<label>Reason for rejection<textarea name="reason" required maxLength={500} rows={3} placeholder="Explain what needs to change before approval…"/></label>:null}



 {modal==='reject'?<label>Reason for rejection<textarea name="reason" required maxLength={500} rows={3} placeholder="Explain what needs to change…"/></label>:null}



 {formError?<p className="form-error" role="alert">{formError}</p>:null}<div className="form-actions"><button className="secondary" type="button" disabled={busy} onClick={()=>setModal('')}>Cancel</button><button className="primary" disabled={busy} type="submit">{busy?'Saving…':{expense:'Submit for approval',allocate:'Allocate budget',category:'Create category',member:'Save team member',business:'Submit registration',reject:'Reject expense',rejectBusiness:'Reject registration'}[modal]}</button></div></form>}



 </DialogContent></Dialog><Toaster position="bottom-right" richColors/></SidebarProvider></>;



}







export default function Home(){



 return <ExpenseApp/>;



}







function SpendingChart({expenses,currency}:{expenses:Expense[];currency:string}){



 const now=new Date(),start=new Date(now);start.setDate(start.getDate()-29);start.setHours(0,0,0,0);



 const values=Array.from({length:6},(_,i)=>{const from=new Date(start);from.setDate(from.getDate()+i*5);const to=new Date(from);to.setDate(to.getDate()+5);return {label:shortDate(from.toISOString()),value:expenses.filter(e=>new Date(e.date)>=from&&new Date(e.date)<to).reduce((s,e)=>s+e.amount,0)}});



 const max=Math.max(...values.map(v=>v.value),100),total=values.reduce((s,v)=>s+v.value,0);



 return <div className="spending-chart"><div className="chart-total">{money(total,currency)}<span><span className="legend-dot"/> Approved spending</span></div><div className="bar-chart" role="img" aria-label={`Approved spending over 30 days: ${values.map(v=>`${v.label}: ${money(v.value,currency)}`).join('; ')}`}><div className="chart-gridlines"><span>{money(max,currency)}</span><span>{money(max/2,currency)}</span><span>0</span></div><div className="bars">{values.map((v,i)=><div className="bar-column" key={i}><div className="bar-track"><div className="bar" title={`${v.label}: ${money(v.value,currency)}`} style={{height:`${Math.max(v.value/max*100,v.value?2:0)}%`,background:i===values.length-1?'#3266e9':'#dce6fc'}}/></div><span>{v.label}</span></div>)}</div></div></div>;



}



function MemberWallet({business,email,visible,requested,onRequest}:{business:Business;email:string;visible:boolean;requested:boolean;onRequest:()=>void}){const member=business.members.find(m=>m.email===email),limit=member?.walletLimit||0,spent=memberSpend(business,email),pending=memberPending(business,email),remaining=memberRemaining(business,email);if(!visible)return <div className="member-wallet wallet-hidden"><div><span>Wallet balance</span><strong>{requested?'Requested':'Hidden'}</strong></div><p className="muted">Only a business admin or manager can show your virtual wallet balance on this dashboard.</p><button className="primary" disabled={requested} onClick={onRequest}>{requested?'Request sent':'Request wallet balance'}</button></div>;return <div className="member-wallet"><div><span>Approved</span><strong>{money(spent,business.currency)}</strong></div><div><span>Pending</span><strong>{money(pending,business.currency)}</strong></div><div><span>Remaining</span><strong>{remaining===null?'Open':money(remaining,business.currency)}</strong></div>{limit?<Progress value={Math.min((spent+pending)/limit*100,100)}/>:null}<p className="muted">{limit?`${Math.round((spent+pending)/limit*100)}% of your monthly virtual wallet is reserved or spent.`:'No personal limit is assigned to your wallet.'}</p></div>}



function CategoryChart({business}:{business:Business}){const items=business.categories.map((c,i)=>({name:c,value:business.expenses.filter(e=>e.category===c&&e.status==='approved').reduce((s,e)=>s+e.amount,0),color:palettes[i%6]})).filter(i=>i.value>0),total=items.reduce((s,i)=>s+i.value,0);let offset=0;const stops=items.map(i=>{const start=offset;offset+=i.value/total*100;return `${i.color} ${start}% ${offset}%`}).join(',');return <><div className="donut" role="img" aria-label={items.map(i=>`${i.name} ${Math.round(i.value/total*100)}%`).join(',')||'No approved spending'} style={{background:total?`conic-gradient(${stops})`:'#e9edf5'}}><div><strong>{items.length}</strong><span>categories</span></div></div><div className="category-legend">{items.length?items.slice(0,4).map(i=><div key={i.name}><span className="legend-dot" style={{background:i.color}}/><span>{i.name}</span><strong>{Math.round(i.value/total*100)}%</strong></div>):<p className="muted">Approved expenses will appear here.</p>}{items.length>4?<small className="muted">+ {items.length-4} more categories</small>:null}</div></>}











