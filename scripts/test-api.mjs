import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5174';
async function request(email,body){const response=await fetch(`${origin}/api/workspace`,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':`local-test-${email}`,'oai-authenticated-user-email':email,'Content-Type':'application/json','Origin':origin},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
const owner='api-owner@example.com',employee='api-employee@example.com',manager='api-manager@example.com';
let r=await request(owner);assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal(r.data.platform,true);
r=await request(owner,{action:'createBusiness',name:`API test ${Date.now()}`,currency:'KES',adminEmail:owner});assert.equal(r.status,200,JSON.stringify(r.data));
const b=r.data.businesses.at(-1),businessId=b.id;
for(const [email,role] of [[employee,'employee'],[manager,'manager']]){r=await request(owner,{action:'member',businessId,email,role,name:role});assert.equal(r.status,200);}
r=await request(owner,{action:'allocate',businessId,amount:100000,note:'Integration test budget'});assert.equal(r.status,200);
r=await request(employee,{action:'submit',businessId,merchant:'API test merchant',category:b.categories[0],date:'2026-01-01',amount:25000,description:'Verify saved expense'});assert.equal(r.status,200,JSON.stringify(r.data));
const expense=r.data.businesses.find(x=>x.id===businessId).expenses[0];
assert.equal(r.data.businesses.length,1);assert.equal(r.data.businesses[0].ledger.length,0);
r=await request(employee,{action:'review',businessId,expenseId:expense.id,status:'approved'});assert.equal(r.status,403);
const responses=await Promise.all([request(manager,{action:'review',businessId,expenseId:expense.id,status:'approved'}),request(manager,{action:'review',businessId,expenseId:expense.id,status:'approved'})]);
assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===409).length,1);
r=await request(owner);const saved=r.data.businesses.find(x=>x.id===businessId);assert.equal(saved.ledger.reduce((s,e)=>s+e.amount,0),75000);assert.equal(saved.expenses[0].status,'approved');assert.equal(saved.ledger.filter(e=>e.expenseId===expense.id).length,1);assert.ok(saved.audit.some(e=>e.action.startsWith('Approved')));
const anonymous=await fetch(`${origin}/api/workspace`);assert.equal(anonymous.status,401);
const invalidOrigin=await fetch(`${origin}/api/workspace`,{method:'POST',headers:{'oai-authenticated-user-id':'test','oai-authenticated-user-email':owner,'Content-Type':'application/json','Origin':'https://untrusted.example'},body:JSON.stringify({action:'allocate',businessId,amount:10,note:'invalid'})});assert.equal(invalidOrigin.status,403);
console.log('API integration passed: authenticated access, tenant isolation, member permissions, persisted submission, concurrent approval, one wallet deduction, audit history, anonymous and cross-origin rejection.');
