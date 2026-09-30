import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
export async function database(path) {
  if (process.env.DATABASE_URL && !path) {
    const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
    return {query:(...a)=>pool.query(...a),transaction:async fn=>{const c=await pool.connect();try {await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},close:()=>pool.end()};
  }
  const db = new PGlite(path||process.env.LOCAL_DB_PATH||'./data');
  await db.waitReady;
  const exists = await db.query("SELECT to_regclass('public.customers') AS name");
  if (!exists.rows[0].name) for (const file of ['01-schema.sql','02-seed.sql','03-requests.sql']) await db.exec(await readFile(new URL(`../../db/${file}`,import.meta.url),'utf8'));
  return {query:(...a)=>db.query(...a),transaction:fn=>db.transaction(fn),close:()=>db.close()};
}
