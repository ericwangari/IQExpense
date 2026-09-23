import { balance, newBusiness, type State, type Role } from './model';
export class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
const required = (value: unknown, label: string, max=160) => {if(typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new RequestError(`Enter a valid ${label}.`);return value.trim();};
const emailValue = (value: unknown) => {const email=required(value,'email').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new RequestError('Enter a valid email address.');return email;};
const amountValue = (value: unknown) => {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0||value>100000000000)throw new RequestError('Enter a positive amount with at most two decimal places.');return value;};
export function mutate(state: State, email: string, input: Record<string,unknown>) {
  const platform = state.owner === email;
  const action = input.action;
  if(action==='createBusiness') {
    if(!platform)throw new RequestError('Only the platform admin can create businesses.',403);
    const currency=required(input.currency,'currency');
    if(!['KES','USD','EUR','GBP','UGX','TZS'].includes(currency))throw new RequestError('Unsupported currency.');
    const b=newBusiness(required(input.name,'business name',80),currency,emailValue(input.adminEmail));
    b.audit.push({id:crypto.randomUUID(),actor:email,action:'Created business',date:new Date().toISOString()});
    state.businesses.push(b);return;
  }
  const b=state.businesses.find(b=>b.id===input.businessId);
  if(!b)throw new RequestError('Business not found.',404);
  const role=b.members.find(m=>m.email===email)?.role;
  if(!role&&!platform)throw new RequestError('You do not have access to this business.',403);
  if(action==='suspend') {
    if(!platform)throw new RequestError('Only the platform admin can change account status.',403);
    b.suspended=!b.suspended;
  } else {
    if(b.suspended)throw new RequestError('This business is suspended. Contact the platform admin.',403);
    if(!role)throw new RequestError('Business membership is required for this action.',403);
    if(action==='submit') {
      const category=required(input.category,'category');
      if(!b.categories.includes(category))throw new RequestError('Choose an existing category.');
      const date=required(input.date,'date');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10))throw new RequestError('Enter a valid date that is not in the future.');
      b.expenses.unshift({id:crypto.randomUUID(),merchant:required(input.merchant,'merchant'),description:required(input.description,'business purpose',500),amount:amountValue(input.amount),category,date,submittedBy:email,status:'pending'});
    } else if(action==='review') {
      if(role==='employee')throw new RequestError('A manager or business admin must review expenses.',403);
      const expense=b.expenses.find(e=>e.id===input.expenseId);
      if(!expense)throw new RequestError('Expense not found.',404);
      if(expense.status!=='pending')throw new RequestError('This expense has already been reviewed.',409);
      if(expense.submittedBy===email)throw new RequestError('Another manager must review your own expense.',403);
      if(!['approved','rejected'].includes(String(input.status)))throw new RequestError('Invalid decision.');
      if(input.status==='approved') {
        if(balance(b)<expense.amount)throw new RequestError('The wallet has insufficient budget. Ask your business admin to allocate more.');
        b.ledger.unshift({id:crypto.randomUUID(),amount:-expense.amount,note:expense.merchant,actor:email,date:new Date().toISOString(),expenseId:expense.id});
      } else expense.reason=required(input.reason,'rejection reason',500);
      expense.status=input.status as 'approved'|'rejected';expense.reviewedBy=email;
    } else if(action==='allocate') {
      if(role!=='admin')throw new RequestError('Only the business admin can allocate budget.',403);
      const amount=amountValue(input.amount);
      if(!Number.isSafeInteger(balance(b)+amount)||balance(b)+amount>100000000000)throw new RequestError('Wallet budget limit exceeded.');
      b.ledger.unshift({id:crypto.randomUUID(),amount,note:required(input.note,'allocation reference'),actor:email,date:new Date().toISOString()});
    } else if(action==='category') {
      if(role!=='admin')throw new RequestError('Only the business admin can manage categories.',403);
      const name=required(input.name,'category name',60);
      if(b.categories.some(c=>c.toLowerCase()===name.toLowerCase()))throw new RequestError('This category already exists.');
      b.categories.push(name);
    } else if(action==='member') {
      if(role!=='admin')throw new RequestError('Only the business admin can manage the team.',403);
      const memberEmail=emailValue(input.email), memberRole=required(input.role,'role') as Role;
      if(!['admin','manager','employee'].includes(memberRole))throw new RequestError('Invalid role.');
      if(memberEmail===email&&memberRole!=='admin')throw new RequestError('You cannot remove your own admin access.');
      const name=required(input.name,'team member name',80), existing=b.members.find(m=>m.email===memberEmail);
      if(existing){existing.name=name;existing.role=memberRole;}else b.members.push({email:memberEmail,name,role:memberRole});
    } else throw new RequestError('Unknown action.');
  }
  const labels: Record<string,string>={submit:`Submitted expense: ${input.merchant}`,review:`${input.status==='approved'?'Approved':'Rejected'} expense ${input.expenseId}${input.reason?`: ${input.reason}`:''}`,allocate:`Allocated budget: ${input.note}`,category:`Added category: ${input.name}`,member:`Set ${input.email} as ${input.role}`,suspend:b.suspended?'Suspended business':'Reactivated business'};
  b.audit.unshift({id:crypto.randomUUID(),actor:email,action:labels[String(action)],date:new Date().toISOString()});
}
export function visibleState(state: State, email: string) {
  const platform=state.owner===email;
  return {email,platform,businesses:state.businesses.filter(b=>platform||b.members.some(m=>m.email===email)).map(b=>{
    const role=b.members.find(m=>m.email===email)?.role;
    return role==='employee'?{...b,expenses:b.expenses.filter(e=>e.submittedBy===email),ledger:[],audit:b.audit.filter(e=>e.actor===email),members:b.members.filter(m=>m.email===email)}:b;
  })};
}
