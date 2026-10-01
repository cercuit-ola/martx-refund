import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {z} from 'zod';
import {createHash,timingSafeEqual} from 'node:crypto';
import {classify} from './ai.js';
import {decide,replyFor} from './policy.js';
const input = z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),orderId:z.string().regex(/^MX-\d{4,10}$/),message:z.string().trim().min(5).max(2000),idempotencyKey:z.uuid()}).strict();
const httpError = (status,message)=>Object.assign(new Error(message),{status});
export function createApp(db,ai=classify) {
  const app=express(); app.use(helmet()); app.use(express.json({limit:'12kb'}));
  app.use('/api',rateLimit({windowMs:60000,limit:60,standardHeaders:'draft-8',legacyHeaders:false}));
  app.get('/api/health',async(req,res)=>{await db.query('SELECT 1');res.json({ok:true,aiMode:process.env.OPENAI_API_KEY?'openai':'offline'});});
  app.post('/api/refunds',async(req,res)=>{
    const p=input.parse(req.body); const hash=createHash('sha256').update(JSON.stringify([p.email,p.orderId,p.message])).digest('hex');
    const prior=await db.query('SELECT * FROM refund_requests WHERE idempotency_key=$1',[p.idempotencyKey]);
    if(prior.rows[0]) { if(prior.rows[0].request_hash!==hash) throw httpError(409,'This request key was already used.'); return res.json(publicResult(prior.rows[0])); }
    // Verify ownership before transmitting any customer text to an external model.
    const owned=await db.query('SELECT o.id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=$1 AND lower(c.email)=$2',[p.orderId,p.email]);
    const analysis=owned.rows.length?await ai(p.message,p.orderId):{mode:'skipped',confidence:0,injection:false};
    const saved=await db.transaction(async c=>{
      const found=await c.query('SELECT o.* FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=$1 AND lower(c.email)=$2 FOR UPDATE OF o',[p.orderId,p.email]);
      const order=found.rows[0];
      const retry=await c.query('SELECT * FROM refund_requests WHERE idempotency_key=$1',[p.idempotencyKey]);
      if(retry.rows[0]) {if(retry.rows[0].request_hash!==hash) throw httpError(409,'This request key was already used.');return retry.rows[0];}
      if(order){const pending=await c.query("SELECT id FROM refund_requests WHERE order_id=$1 AND review_status='pending'",[p.orderId]);if(pending.rows.length)throw httpError(409,'This order already has a request awaiting review.');}
      const items=order?(await c.query('SELECT * FROM order_items WHERE order_id=$1',[p.orderId])).rows:[];
      const recent=order?(await c.query("SELECT count(*)::int AS count FROM orders WHERE customer_id=$1 AND refunded_at>=NOW()-INTERVAL '90 days'",[order.customer_id])).rows[0].count:0;
      if(items.length>1 && !/whole order|entire order|all items|everything/i.test(p.message)) analysis.ambiguous=true;
      const d=decide({order,items,recentRefunds:recent,analysis});
      const r=(await c.query('INSERT INTO refund_requests(customer_email,order_id,raw_message,verdict,refund_amount,rule_ids,customer_reply,injection_flagged,review_status,idempotency_key,request_hash,ai_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[p.email,p.orderId,p.message,d.verdict,d.cents/100,d.rules,replyFor(d),!!analysis.injection,d.verdict==='Escalated'?'pending':'none',p.idempotencyKey,hash,analysis.mode])).rows[0];
      if(d.verdict==='Approved')await c.query("UPDATE orders SET status='refunded',refunded_at=NOW() WHERE id=$1",[p.orderId]);
      for(const [step,payload] of [['classification',analysis],['policy',{version:'1.0',...d}]])await c.query('INSERT INTO audit_logs(request_id,step,payload) VALUES($1,$2,$3)',[r.id,step,JSON.stringify(payload)]);
      return r;
    }); res.status(201).json(publicResult(saved));
  });
  app.use('/api/admin',(req,res,next)=>{const expected=process.env.ADMIN_TOKEN;const token=req.headers.authorization?.replace(/^Bearer /,'')||'';if(!expected||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return res.status(401).json({error:'A valid support access token is required.'});next();});
  app.get('/api/admin/refunds/stats',async(req,res)=>{
    const {rows}=await db.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE COALESCE(final_verdict,verdict)='Approved')::int AS approved,
      count(*) FILTER (WHERE COALESCE(final_verdict,verdict)='Denied')::int AS denied,
      count(*) FILTER (WHERE COALESCE(final_verdict,verdict)='Escalated')::int AS escalated
      FROM refund_requests`);
    res.json(rows[0]);
  });
  app.get('/api/admin/refunds',async(req,res)=>res.json((await db.query('SELECT * FROM refund_requests ORDER BY created_at DESC LIMIT 100')).rows));
  app.get('/api/admin/refunds/:id/audit',async(req,res)=>{z.uuid().parse(req.params.id);res.json((await db.query('SELECT * FROM audit_logs WHERE request_id=$1 ORDER BY id',[req.params.id])).rows);});
  app.post('/api/admin/refunds/:id/resolve',async(req,res)=>{
    const id=z.uuid().parse(req.params.id);const p=z.object({verdict:z.enum(['Approved','Denied']),note:z.string().trim().min(10).max(1000)}).strict().parse(req.body);
    const r=await db.transaction(async c=>{
      const request=(await c.query('SELECT * FROM refund_requests WHERE id=$1',[id])).rows[0];if(!request)throw httpError(404,'Request not found.');
      const order=(await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[request.order_id])).rows[0];
      const locked=(await c.query('SELECT * FROM refund_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];if(locked.review_status!=='pending')throw httpError(409,'This request is no longer pending.');
      if(p.verdict==='Approved') {
        if(!order||order.status!=='delivered'||!order.delivered_at||Number(locked.refund_amount)<=0)throw httpError(409,'The order is not eligible for approval.');
        const items=(await c.query('SELECT * FROM order_items WHERE order_id=$1',[order.id])).rows;
        const check=decide({order,items,analysis:{confidence:1}});if(check.verdict==='Denied')throw httpError(409,'The order no longer meets the refund policy.');
        await c.query("UPDATE orders SET status='refunded',refunded_at=NOW() WHERE id=$1",[order.id]);
      }
      const updated=(await c.query("UPDATE refund_requests SET review_status='resolved',final_verdict=$2,resolution_note=$3,resolved_at=NOW() WHERE id=$1 RETURNING *",[id,p.verdict,p.note])).rows[0];
      await c.query("INSERT INTO audit_logs(request_id,step,payload) VALUES($1,'resolution',$2)",[id,JSON.stringify(p)]);return updated;
    });res.json(r);
  });
  app.use((err,req,res,next)=>{if(err instanceof z.ZodError)return res.status(400).json({error:'Check your input. Message must be 5–2,000 characters; use a valid email, order ID and request key.'});if(err.code==='23505')return res.status(409).json({error:'A matching request already exists. Please retry.'});if(!err.status)console.error('API error',err.message);res.status(err.status||500).json({error:err.status?err.message:'Unable to complete this request. Please try again.'});});
  return app;
}
function publicResult(r){return {id:r.id,verdict:r.verdict,refundAmount:Number(r.refund_amount),ruleIds:r.rule_ids,reply:r.customer_reply,aiMode:r.ai_mode};}
