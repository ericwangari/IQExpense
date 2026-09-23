import { newBusiness, type State } from './model';
export function initialState(email: string): State {
  const b = newBusiness('Acacia Studio', 'KES', email);
  b.demo = true;
  b.members.push({email:'amina@example.com',name:'Amina Hassan',role:'manager'}, {email:'david@example.com',name:'David Kimani',role:'employee'}, {email:'sarah@example.com',name:'Sarah Wanjiku',role:'employee'});
  const now = new Date();
  const date = (days: number) => {const d = new Date(now); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10)};
  b.ledger.push({id:'initial', amount:50000000,note:'Sample company budget',actor:email,date:date(28)});
  const samples: [string,number,number,number,string][] = [
    ['Figma',18500,1,1,'pending'],['Uber for Business',4200,0,1,'pending'],['Java House',6800,3,2,'pending'],['Jumia Business',24750,2,3,'pending'],
    ['Google Workspace',15600,1,4,'approved'],['Kenya Airways',48500,0,6,'approved'],['Print & Paper Co.',12300,2,8,'approved'],['Meta Ads',32500,4,10,'approved'],['Artcaffé',8750,3,12,'approved'],['Safaricom',6500,5,16,'approved'],['Notion',9600,1,20,'approved'],['Bolt Business',5200,0,24,'approved']
  ];
  samples.forEach(([merchant,amount,category,days,status],i)=>{
    const id = `sample-${i}`;
    b.expenses.push({id,merchant,description:'Sample expense for exploring the workspace',amount:amount*100,category:b.categories[category],date:date(days),submittedBy:i%2?'david@example.com':'sarah@example.com',status:status as 'pending'|'approved',...(status==='approved'?{reviewedBy:'amina@example.com'}:{})});
    if(status==='approved') b.ledger.push({id:`entry-${i}`,amount:-amount*100,note:merchant,expenseId:id,actor:'amina@example.com',date:date(days)});
  });
  b.audit.push({id:crypto.randomUUID(),actor:email,action:'Created sample workspace',date:now.toISOString()});
  return {owner:email,businesses:[b]};
}
