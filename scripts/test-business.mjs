import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const out=new URL('../.sites-runtime/tests/',import.meta.url);mkdirSync(out,{recursive:true});
for(const name of ['model','operations','demo']){
 const code=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8');
 writeFileSync(new URL(`${name}.mjs`,out),ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./model'","'./model.mjs'"));
}
const {mutate,visibleState}=await import(new URL('operations.mjs',out));
const {newBusiness,balance,depositTotal,allocationTotal,isDuplicateExpense}=await import(new URL('model.mjs',out));
const owner='owner@example.com',manager='manager@example.com',employee='employee@example.com';
const b=newBusiness('Test business','KES',owner),other=newBusiness('Other business','USD','other@example.com');
b.members.push({email:manager,name:'Manager',role:'manager'},{email:employee,name:'Employee',role:'employee'});
const state={owner,businesses:[b,other]};
const run=(email,payload)=>mutate(state,email,{businessId:b.id,...payload});
let checks=0;
const rejects=(fn,match)=>{assert.throws(fn,match);checks++};
rejects(()=>run(employee,{action:'allocate',amount:10000,note:'Unauthorized'}),/Only the business admin/);
run(owner,{action:'allocate',amount:100000,note:'September budget'});assert.equal(balance(b),100000);checks++;
run(employee,{action:'submit',merchant:'Vendor',description:'Work travel',amount:15000,category:b.categories[0],date:'2026-01-01'});
let e=b.expenses[0];assert.equal(e.status,'pending');assert.equal(balance(b),100000);checks++;
rejects(()=>run(employee,{action:'review',expenseId:e.id,status:'approved'}),/manager or business admin/);
run(manager,{action:'review',expenseId:e.id,status:'approved'});assert.equal(balance(b),85000);assert.equal(e.status,'approved');checks++;
rejects(()=>run(manager,{action:'review',expenseId:e.id,status:'approved'}),/already been reviewed/);
assert.equal(b.ledger.filter(l=>l.expenseId===e.id).length,1);checks++;
run(manager,{action:'submit',merchant:'Self',description:'Work',amount:500,category:b.categories[0],date:'2026-01-01'});e=b.expenses[0];
rejects(()=>run(manager,{action:'review',expenseId:e.id,status:'approved'}),/Another manager/);
run(owner,{action:'review',expenseId:e.id,status:'rejected',reason:'Duplicate receipt'});assert.equal(balance(b),85000);assert.equal(e.reason,'Duplicate receipt');checks++;
run(employee,{action:'submit',merchant:'Large purchase',description:'Work',amount:90000,category:b.categories[0],date:'2026-01-01'});e=b.expenses[0];
rejects(()=>run(manager,{action:'review',expenseId:e.id,status:'approved'}),/insufficient budget/);assert.equal(e.status,'pending');
rejects(()=>mutate(state,employee,{action:'submit',businessId:other.id}),/do not have access/);
const view=visibleState(state,employee);assert.equal(view.businesses.length,1);assert.ok(view.businesses[0].expenses.every(e=>e.submittedBy===employee));assert.equal(view.businesses[0].ledger.length,0);checks++;
rejects(()=>run(employee,{action:'member',email:'new@example.com',name:'New',role:'admin'}),/admin or manager/);
run(manager,{action:'member',email:'managed@example.com',name:'Managed Member',role:'employee',accountStatus:'invited',walletLimit:40000});assert.equal(b.members.find(m=>m.email==='managed@example.com').walletLimit,40000);checks++;
run(manager,{action:'member',email:'managed@example.com',name:'Managed Member',role:'employee',accountStatus:'disabled',walletLimit:40000});assert.equal(b.members.find(m=>m.email==='managed@example.com').accountStatus,'disabled');checks++;
rejects(()=>run(manager,{action:'member',email:'promoted@example.com',name:'Promoted',role:'manager'}),/Managers can only manage team member/);
rejects(()=>run(manager,{action:'member',email:owner,name:'Owner',role:'employee'}),/Managers can only manage team member/);
run(owner,{action:'member',email:employee,name:'Employee',role:'employee',walletLimit:130000});assert.equal(b.members.find(m=>m.email===employee).walletLimit,130000);checks++;
rejects(()=>run(employee,{action:'submit',merchant:'Over limit',description:'Work',amount:25001,category:b.categories[0],date:'2026-01-01'}),/remaining team wallet allowance/);
rejects(()=>run(owner,{action:'member',email:employee,name:'Employee',role:'employee',walletLimit:1000}),/below this member/);
run(owner,{action:'member',email:'invited@example.com',name:'Invited User',role:'employee',accountStatus:'invited',walletLimit:50000});assert.equal(b.members.find(m=>m.email==='invited@example.com').accountStatus,'invited');checks++;
mutate(state,'invited@example.com',{businessId:b.id,action:'submit',merchant:'Activation',description:'First login expense',amount:1000,category:b.categories[0],date:'2026-01-01'});assert.equal(b.members.find(m=>m.email==='invited@example.com').accountStatus,'active');checks++;
run(owner,{action:'member',email:'disabled@example.com',name:'Disabled User',role:'employee',accountStatus:'disabled'});
rejects(()=>mutate(state,'disabled@example.com',{businessId:b.id,action:'submit',merchant:'Blocked',description:'No access',amount:1000,category:b.categories[0],date:'2026-01-01'}),/disabled/);
assert.equal(visibleState(state,'disabled@example.com').businesses.length,0);checks++;
rejects(()=>run(owner,{action:'submit',amount:-5}),/category/);
rejects(()=>run(employee,{action:'submit',merchant:'Bad amount',description:'Work',amount:1.5,category:b.categories[0],date:'2026-01-01'}),/positive amount/);
run(owner,{action:'suspend'});rejects(()=>run(employee,{action:'submit'}),/suspended/);run(owner,{action:'suspend'});
rejects(()=>run(owner,{action:'member',email:owner,name:'Owner',role:'employee'}),/own admin access/);
const before=state.businesses.length;mutate(state,'founder@example.com',{action:'registerBusiness',name:'Clean company',currency:'KES'});assert.equal(state.businesses.length,before+1);const registered=state.businesses.at(-1);assert.equal(registered.approvalStatus,'pending');checks++;
rejects(()=>mutate(state,'founder@example.com',{businessId:registered.id,action:'member',email:'x@example.com',name:'X',role:'employee'}),/waiting for platform admin approval/);
mutate(state,owner,{businessId:registered.id,action:'reviewBusiness',status:'approved'});assert.equal(registered.approvalStatus,'approved');checks++;
mutate(state,'founder@example.com',{businessId:registered.id,action:'member',email:'x@example.com',name:'X',role:'employee'});assert.ok(registered.members.some(m=>m.email==='x@example.com'));checks++;
assert.ok(b.audit.some(a=>a.action.startsWith('Approved')));checks++;

// Test deposit validation & payments
rejects(()=>run(owner,{action:'deposit',amount:-500,paymentMethod:'mpesa'}),/positive amount/);
rejects(()=>run(owner,{action:'deposit',amount:5000,paymentMethod:'crypto'}),/Unsupported payment method/);
const balanceBeforeDeposit = balance(b);
run(owner,{action:'deposit',amount:25000,paymentMethod:'mpesa',reference:'QA8912X45',phoneNumber:'254712345678'});
assert.equal(balance(b), balanceBeforeDeposit + 25000);
const mpesaEntry = b.ledger[0];
assert.equal(mpesaEntry.type, 'deposit');
assert.equal(mpesaEntry.paymentMethod, 'mpesa');
assert.equal(mpesaEntry.reference, 'QA8912X45');
checks++;

// Test Card deposit
run(manager,{action:'deposit',amount:50000,paymentMethod:'card',reference:'CRD-998822',cardLast4:'4242',cardBrand:'VISA'});
assert.equal(balance(b), balanceBeforeDeposit + 75000);
const cardEntry = b.ledger[0];
assert.equal(cardEntry.type, 'deposit');
assert.equal(cardEntry.cardLast4, '4242');
assert.equal(cardEntry.cardBrand, 'VISA');
checks++;

// Verify depositTotal, allocationTotal & audit
assert.equal(depositTotal(b), 75000);
assert.equal(allocationTotal(b), 100000);
assert.ok(b.audit.some(a=>a.action.includes('Deposited funds via MPESA')));
checks++;

// Odoo ERP features: VAT tax calculation, analyticAccount, reference, chatter notes, bulkReview, duplicate detection
run(employee, {
  action: 'submit',
  amount: 11600,
  category: b.categories[0],
  merchant: 'Safaricom Fiber',
  description: 'Monthly office internet with VAT',
  date: '2026-04-06',
  taxRate: 16,
  analyticAccount: 'HQ Operations',
});
const erpSub = b.expenses[0];
assert.equal(erpSub.taxRate, 16);
assert.equal(erpSub.taxAmount, 1600);
assert.equal(erpSub.analyticAccount, 'HQ Operations');
assert.ok(erpSub.reference.startsWith('EXP/'));
assert.equal(erpSub.notes.length, 1);
checks++;

// Duplicate detection
run(employee, {
  action: 'submit',
  amount: 11600,
  category: b.categories[0],
  merchant: 'Safaricom Fiber',
  description: 'Duplicate bill test',
  date: '2026-04-06',
});
const erpDup = b.expenses[0];
assert.equal(isDuplicateExpense(b.expenses, erpSub), true);
assert.equal(isDuplicateExpense(b.expenses, erpDup), true);
checks++;

// Chatter note
run(owner, {
  action: 'addExpenseNote',
  expenseId: erpSub.id,
  message: 'Verified invoice number on file.',
});
assert.equal(erpSub.notes.length, 2);
assert.equal(erpSub.notes[1].type, 'note');
checks++;

// Bulk review
run(owner, {
  action: 'bulkReview',
  expenseIds: [erpSub.id, erpDup.id],
  status: 'approved',
});
assert.equal(erpSub.status, 'approved');
assert.equal(erpDup.status, 'approved');
checks++;

console.log(`${checks} business rule checks passed: roles, tenant isolation, approval, rejection, balances, wallet limits, duplicate protection, validation, suspension, payment deposits, Odoo ERP (VAT, cost centers, chatter, bulk review), and audit.`);
