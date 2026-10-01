import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../src/db.js';
import {createApp} from '../src/app.js';
test('dashboard totals include all database rows and final human decisions', async()=>{
 process.env.ADMIN_TOKEN='stats-test';
 const db=await database('memory://');
 const server=createApp(db).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 try{
  await db.query(`INSERT INTO refund_requests(customer_email,order_id,raw_message,verdict,final_verdict)
    SELECT 'stats@example.com','MX-9999','Statistics fixture',
      CASE WHEN n<=110 THEN 'Approved' WHEN n<=115 THEN 'Denied' ELSE 'Escalated' END,
      CASE WHEN n=116 THEN 'Approved' WHEN n=117 THEN 'Denied' ELSE NULL END
    FROM generate_series(1,120) AS n`);
  const base=`http://127.0.0.1:${server.address().port}/api/admin/refunds`;
  assert.equal((await fetch(base+'/stats')).status,401);
  const headers={Authorization:'Bearer stats-test'};
  assert.equal((await (await fetch(base,{headers})).json()).length,100);
  assert.deepEqual(await (await fetch(base+'/stats',{headers})).json(),{total:120,approved:111,denied:6,escalated:3});
  await db.query("UPDATE refund_requests SET final_verdict='Denied' WHERE verdict='Escalated' AND final_verdict IS NULL");
  assert.deepEqual(await (await fetch(base+'/stats',{headers})).json(),{total:120,approved:111,denied:9,escalated:0});
 }finally{await new Promise(r=>server.close(r));await db.close();}
});
