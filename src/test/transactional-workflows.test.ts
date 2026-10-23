// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let db:PGlite;
const read=(name:string)=>readFileSync(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8');
async function as(n:number,sql:string,params:unknown[]=[]){await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${id(n)}';`);return db.query<Record<string,unknown>>(sql,params);}
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,raw_user_meta_data jsonb,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 await db.exec(read('20260401205937_adffb818-65ed-4595-88f8-4dcd528f4051.sql'));
 await db.exec(`ALTER TABLE profiles ADD kyc_status text DEFAULT 'approved', ADD verified boolean DEFAULT true;
 ALTER TABLE jobs ADD job_kind text DEFAULT 'project';
 CREATE TABLE subscribers(user_id uuid,subscribed boolean,tier text,subscription_end timestamptz);
 CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;`);
 await db.exec(read('20260402123017_27f69905-6558-43de-b750-a2ce547aeb0e.sql'));
 await db.exec(read('20261023073508_craftvaro_transactional_workflows.sql'));
 await db.exec(read('20261023074153_craftvaro_driver_offer_discovery.sql'));
 await db.exec(`INSERT INTO auth.users(id) VALUES ('${id(1)}'),('${id(2)}'),('${id(3)}');
 INSERT INTO trade_companies(id,owner_profile_id,legal_name) VALUES ('${id(11)}','${id(1)}','First'),('${id(12)}','${id(2)}','Second');
 INSERT INTO subscribers VALUES ('${id(1)}',true,'premium',null),('${id(2)}',true,'premium',null);
 INSERT INTO jobs(id,customer_profile_id,requested_trade,title,address_line1,city,postcode) VALUES ('${id(21)}','${id(3)}','builder','Project','Street','Luton','LU1');
 INSERT INTO quotes(id,job_id,trade_company_id,labour_amount) VALUES ('${id(31)}','${id(21)}','${id(11)}',100),('${id(32)}','${id(21)}','${id(12)}',200);
 INSERT INTO merchants(id,name,slug) VALUES ('${id(41)}','Merchant','merchant');
 INSERT INTO delivery_rate_cards(id,name) VALUES ('${id(51)}','Test');
 INSERT INTO delivery_rate_card_rows(rate_card_id,vehicle_type,urgency,base_fee,per_mile_fee,manpower_fee,percentage_markup) VALUES ('${id(51)}','small_van','standard',10,2,5,20);`);
},20000);
afterAll(async()=>{await db?.close()});
const order=()=>({trade_company_id:id(11),job_id:id(21),merchant_id:id(41),delivery_mode:'platform_driver',delivery_address:'Site',required_vehicle:'small_van',urgency:'standard',estimated_distance_miles:5,manpower_required:1});
const items=[{item_name:'Cement',quantity:2,unit:'bag',unit_price:10}];
describe.sequential('Atomic workflows',()=>{
 it('rejects award by a trader',async()=>{await expect(as(1,'select accept_project_quote($1)',[id(31)])).rejects.toThrow('Job owner');});
 it('awards once and rejects a different winner',async()=>{const a=await as(3,'select accept_project_quote($1) as id',[id(31)]);const b=await as(3,'select accept_project_quote($1) as id',[id(31)]);expect(a.rows).toEqual(b.rows);await expect(as(3,'select accept_project_quote($1)',[id(32)])).rejects.toThrow('already awarded');});
 it('rejects another company and rolls back the request',async()=>{await expect(as(2,'select create_material_request($1,$2,$3)',[id(61),order(),items])).rejects.toThrow('Company owner');});
 it('calculates delivery on server and makes retries idempotent',async()=>{const payload={...order(),platform_delivery_fee:0,driver_payout:999};const a=await as(1,'select create_material_request($1,$2,$3) as id',[id(62),payload,items]);const b=await as(1,'select create_material_request($1,$2,$3) as id',[id(62),payload,items]);expect(a.rows).toEqual(b.rows);await db.exec('RESET ROLE');const r=await db.query('select price_charged,driver_payout,status from deliveries');expect(r.rows).toEqual([{price_charged:'24.00',driver_payout:'20.00',status:'unassigned'}]);});
 it('rejects invalid items before any order is saved',async()=>{await expect(as(1,'select create_material_request($1,$2,$3)',[id(63),order(),[{...items[0],quantity:-1}]])).rejects.toThrow('Invalid item');await db.exec('RESET ROLE');expect((await db.query('select id from material_orders')).rows).toHaveLength(1);});
 it('rolls back multi-merchant conversion if any item is invalid',async()=>{await db.exec(`RESET ROLE; INSERT INTO price_quotes(id,trade_company_id,requested_by,delivery_postcode,delivery_address) VALUES ('${id(71)}','${id(11)}','${id(1)}','LU1','Site'); INSERT INTO price_quote_items(price_quote_id,item_name,best_merchant_id,best_price,quantity) VALUES ('${id(71)}','Cement','${id(41)}',10,-1);`);await expect(as(1,'select save_material_comparison($1,$2)',[id(71),id(21)])).rejects.toThrow('Invalid item');await db.exec('RESET ROLE');expect((await db.query('select id from material_orders')).rows).toHaveLength(1);});
 it('saves comparison requests once and denies another user',async()=>{await db.exec(`RESET ROLE; UPDATE price_quote_items SET quantity=2 WHERE price_quote_id='${id(71)}';`);await expect(as(2,'select save_material_comparison($1,$2)',[id(71),id(21)])).rejects.toThrow('owner');const a=await as(1,'select save_material_comparison($1,$2) as ids',[id(71),id(21)]);const b=await as(1,'select save_material_comparison($1,$2) as ids',[id(71),id(21)]);expect(a.rows).toEqual(b.rows);});
 it('rejects expired subscriptions',async()=>{await db.exec(`RESET ROLE; UPDATE subscribers SET subscription_end='2000-01-01' WHERE user_id='${id(1)}';`);await expect(as(1,'select create_material_request($1,$2,$3)',[id(64),order(),items])).rejects.toThrow('Premium');});
 it('driver offers hide addresses until acceptance and reject skipped transitions',async()=>{
  await db.exec(`RESET ROLE; INSERT INTO auth.users(id) VALUES ('${id(4)}'),('${id(5)}');
   INSERT INTO user_roles(user_id,role) VALUES ('${id(4)}','driver'),('${id(5)}','driver');
   INSERT INTO driver_profiles(profile_id,vehicle_type,verified) VALUES ('${id(4)}','small_van',true),('${id(5)}','small_van',true);
   UPDATE material_orders SET order_status='confirmed'; UPDATE deliveries SET status='broadcast';`);
  await expect(as(2,'select driver_delivery_board()')).rejects.toThrow('Verified driver');
  const result=await as(4,'select driver_delivery_board() as board');
  const board=result.rows[0].board as any[];
  expect(board).toHaveLength(1);expect(board[0].material_order.delivery_address).toBe('');
  const delivery=board[0].id;
  await as(4,'select driver_delivery_action($1,$2)',[delivery,'assigned']);
  await expect(as(5,'select driver_delivery_action($1,$2)',[delivery,'assigned'])).rejects.toThrow('no longer available');
  await expect(as(4,'select driver_delivery_action($1,$2)',[delivery,'delivered'])).rejects.toThrow('Invalid delivery transition');
  const own=await as(4,'select driver_delivery_board() as board');expect((own.rows[0].board as any[])[0].material_order.delivery_address).toBe('Site');
  for(const status of ['arrived_at_pickup','collected','en_route','delivered']) await as(4,'select driver_delivery_action($1,$2)',[delivery,status]);
  await expect(as(4,"update deliveries set driver_payout=999")).rejects.toThrow('permission denied');
 });

});
