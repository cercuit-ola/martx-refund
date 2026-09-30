import {database} from './db.js';
import {createApp} from './app.js';
if(!process.env.ADMIN_TOKEN)throw new Error('Set ADMIN_TOKEN in .env before starting.');
const db=await database();
const server=createApp(db).listen(process.env.PORT||3001,()=>console.log('Refund API listening on port '+(process.env.PORT||3001)));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
