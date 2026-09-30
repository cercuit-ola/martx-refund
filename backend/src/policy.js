export function decide({order, items = [], recentRefunds = 0, analysis, now = new Date()}) {
  const rules = [], notes = [];
  const add = (r,n) => { if (!rules.includes(r)) rules.push(r); notes.push(n); };
  const result = (verdict,cents=0) => ({verdict, cents, rules, notes});
  if (!order) { add('R7','We could not verify this email and order combination.'); return result('Denied'); }
  if (order.status === 'refunded') { add('R6','This order has already been refunded.'); return result('Denied'); }
  let escalation = false;
  if (order.status !== 'delivered' || !order.delivered_at) { add('R5','Delivery is not confirmed. A support agent must check the request.'); escalation = true; }
  const cents = items.filter(i=>!i.final_sale).reduce((sum,i)=>sum + Math.round(Number(i.unit_price)*100)*i.quantity,0);
  if (items.some(i=>i.final_sale)) add('R1','Final sale items are excluded from the refund.');
  if (!cents) return result('Denied');
  // Calendar days in UTC: day 30 remains eligible throughout that day.
  const day = d => Math.floor(new Date(d).getTime()/86400000);
  if (order.delivered_at && day(now)-day(order.delivered_at)>30) { add('R2','Delivery was more than 30 days ago.'); return result('Denied'); }
  if (cents>50000) { add('R3','The eligible refund exceeds $500 and requires human review.'); escalation = true; }
  if (recentRefunds>=2) { add('R5','Two or more completed refunds in the past 90 days require review.'); escalation = true; }
  if (analysis.injection || analysis.confidence<0.8 || analysis.ambiguous) { add('R5','This message needs a support agent to verify its intent.'); escalation = true; }
  if (escalation) return result('Escalated',order.status==='delivered'?cents:0);
  add(['damaged','incorrect'].includes(analysis.reason)?'R4':'R2',['damaged','incorrect'].includes(analysis.reason)?'The reported item issue meets the refund conditions.':'Eligible items are within the 30-day return window.');
  return result('Approved',cents);
}
export function replyFor(d) {
  const amount = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(d.cents/100);
  return d.verdict==='Approved' ? `Your refund of ${amount} is approved in this demo. ${d.notes.join(' ')} No real payment has been issued.` : d.verdict==='Denied' ? `We cannot approve this refund. ${d.notes.join(' ')}` : 'Your request needs a closer look. A support agent will review it within 1 business day. This is a demo; no payment has been issued.';
}
