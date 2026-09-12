// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;
let workId: string;
async function as(n: number, sql: string) {
  await db.exec(
    `RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${id(n)}';`,
  );
  return db.query<Record<string, unknown>>(sql);
}
async function fails(n: number, sql: string) {
  await expect(as(n, sql)).rejects.toThrow();
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,verified boolean DEFAULT false,phone_verified boolean DEFAULT false,kyc_status text DEFAULT 'pending');
 CREATE TABLE public.driver_profiles(profile_id uuid,verified boolean DEFAULT false);
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('role',true)$$;
 CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid,bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated;
 CREATE TABLE public.job_media(job_id uuid,storage_path text,uploaded_by uuid);
 CREATE TABLE public.user_roles(user_id uuid,role text);
 CREATE FUNCTION public.has_role(p_user uuid,p_role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=p_user AND role=p_role)$$;
 CREATE TABLE public.trade_companies(id uuid PRIMARY KEY,owner_profile_id uuid,legal_name text);
 CREATE TABLE public.jobs(id uuid PRIMARY KEY,trade_company_id uuid,customer_profile_id uuid,status text,created_at timestamptz DEFAULT now());
 CREATE TABLE public.job_awards(job_id uuid,trade_company_id uuid);
 CREATE TABLE public.subscribers(user_id uuid,subscribed boolean,tier text,subscription_end timestamptz);
 CREATE TABLE public.subcontractors(id uuid PRIMARY KEY,trade_company_id uuid);
 CREATE TABLE public.subcontractor_invoices(id uuid PRIMARY KEY,subcontractor_id uuid,job_id uuid);
 CREATE TABLE public.quotes(trade_company_id uuid,status text,total_amount numeric);
 CREATE TABLE public.customer_invoices(trade_company_id uuid,status text,subtotal numeric,total_amount numeric,due_date date);
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
 `);
  for (const f of [
    "20260912080000_property_project_opportunities.sql",
    "20260912090000_subcontract_work_orders.sql",
    "20260912100000_trader_business_metrics.sql",
    "20260912110000_verification_write_guards.sql",
    "20260912120000_job_evidence_access.sql",
  ])
    await db.exec(
      readFileSync(
        new URL(`../../supabase/migrations/${f}`, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(`
 INSERT INTO profiles(id) VALUES ${[1, 2, 3, 4, 5].map((n) => `('${id(n)}')`).join(",")};
 INSERT INTO auth.users VALUES ('${id(2)}','sub@example.test');
 INSERT INTO user_roles VALUES ('${id(1)}','trade'),('${id(2)}','trade'),('${id(3)}','trade'),('${id(4)}','customer'),('${id(5)}','admin');
 INSERT INTO trade_companies VALUES ('${id(11)}','${id(1)}','Main'),('${id(12)}','${id(3)}','Other');
 INSERT INTO subcontractors VALUES ('${id(21)}','${id(11)}'),('${id(22)}','${id(12)}');
 INSERT INTO jobs(id,trade_company_id,status) VALUES ('${id(31)}','${id(11)}','awarded'),('${id(32)}','${id(12)}','active');
 INSERT INTO subscribers VALUES ('${id(1)}',true,'basic',null),('${id(3)}',true,'basic','2000-01-01');
 INSERT INTO quotes VALUES ('${id(11)}','accepted',1000),('${id(11)}','submitted',500);
 INSERT INTO customer_invoices VALUES ('${id(11)}','issued',100,120,'2020-01-01'),('${id(11)}','void',500,600,null),('${id(11)}','paid',200,240,null);
 `);
}, 20000);
afterAll(async () => {
  await db?.close();
});
describe.sequential("Property and subcontractor database boundaries", () => {
  it("only main contractor can assign their own awarded job and subcontractor", async () => {
    await fails(
      3,
      `select create_subcontract_work_order('${id(11)}','${id(21)}','${id(31)}','Plumbing','Scope',null,100,null)`,
    );
    await fails(
      1,
      `select create_subcontract_work_order('${id(11)}','${id(22)}','${id(31)}','Plumbing','Scope',null,100,null)`,
    );
    await fails(
      1,
      `select create_subcontract_work_order('${id(11)}','${id(21)}','${id(32)}','Plumbing','Scope',null,100,null)`,
    );
    const r = await as(
      1,
      `select create_subcontract_work_order('${id(11)}','${id(21)}','${id(31)}','Plumbing','Only assigned scope',null,100,'sub@example.test') as id`,
    );
    workId = r.rows[0].id as string;
    expect(workId).toBeTruthy();
  });
  it("assignee reads assigned scope; unrelated trader and customer cannot", async () => {
    expect(
      (await as(2, "select * from subcontract_work_orders")).rows,
    ).toHaveLength(1);
    expect(
      (await as(3, "select * from subcontract_work_orders")).rows,
    ).toHaveLength(0);
    expect(
      (await as(4, "select * from subcontract_work_orders")).rows,
    ).toHaveLength(0);
  });
  it("assignee updates progress but cannot sign off, pay, reassign or edit scope", async () => {
    await as(
      2,
      `select update_subcontract_progress('${workId}','submitted_review',90,'Ready for inspection')`,
    );
    await fails(
      2,
      `select update_subcontract_progress('${workId}','completed',100,'Self approved')`,
    );
    await fails(
      2,
      `update subcontract_work_orders set scope='changed' where id='${workId}'`,
    );
    await fails(
      2,
      `select record_subcontract_payment('${workId}',10,current_date,'fake')`,
    );
    await fails(
      3,
      `select update_subcontract_progress('${workId}','in_progress',40,'other company')`,
    );
  });
  it("payments reject negative, excess, fractional pennies, duplicate references and future dates", async () => {
    await fails(
      1,
      `select record_subcontract_payment('${workId}',-1,current_date,'negative')`,
    );
    await fails(
      1,
      `select record_subcontract_payment('${workId}',101,current_date,'excess')`,
    );
    await fails(
      1,
      `select record_subcontract_payment('${workId}',0.001,current_date,'fraction')`,
    );
    await fails(
      1,
      `select record_subcontract_payment('${workId}',10,current_date+1,'future')`,
    );
    await as(
      1,
      `select record_subcontract_payment('${workId}',60,current_date,'bank-1')`,
    );
    await fails(
      1,
      `select record_subcontract_payment('${workId}',10,current_date,'bank-1')`,
    );
    await fails(
      1,
      `select record_subcontract_payment('${workId}',41,current_date,'excess-remaining')`,
    );
    expect(
      (await as(2, "select amount from subcontract_payment_records")).rows[0]
        .amount,
    ).toBe("60.00");
    expect(
      (await as(3, "select * from subcontract_payment_records")).rows,
    ).toHaveLength(0);
    await fails(1, `delete from subcontract_payment_records`);
  });
  it("main contractor signs off and assignee cannot reopen completed work", async () => {
    await as(
      1,
      `select update_subcontract_progress('${workId}','completed',50,'Approved')`,
    );
    expect(
      (await as(2, "select progress from subcontract_work_orders")).rows[0]
        .progress,
    ).toBe(100);
    await fails(
      2,
      `select update_subcontract_progress('${workId}','in_progress',20,'Reopen')`,
    );
  });
  it("metrics are company-scoped and exclude draft/void invoices", async () => {
    await fails(3, `select trader_business_metrics('${id(11)}')`);
    const r = await as(
      1,
      `select trader_business_metrics('${id(11)}') as metrics`,
    );
    expect(r.rows[0].metrics).toMatchObject({
      active_jobs: 1,
      quotes_accepted: 1,
      quote_pipeline: 500,
      invoiced_ex_vat: 300,
      paid_invoice_value: 240,
      subcontract_paid: 60,
    });
  });
  it("only admin curates; paid traders see planning; customers see published funding only", async () => {
    const values = `('Council','REF','https://example.gov.uk/application','Extension','planning','renovation','England','Reviewed licence',true)`;
    const insert = `insert into project_opportunities(source_name,source_reference,source_url,title,opportunity_kind,project_category,nation,reuse_basis,published) values ${values}`;
    await fails(1, insert);
    await as(5, insert);
    await as(
      5,
      `insert into project_opportunities(source_name,source_reference,source_url,title,opportunity_kind,project_category,nation,reuse_basis,published) values ('Council','FUND','https://example.gov.uk/grant','Grant','funding','empty_homes','England','Reviewed licence',true),('Council','DRAFT','https://example.gov.uk/draft','Draft','funding','retrofit','England','Reviewed licence',false)`,
    );
    expect(
      (await as(1, "select * from project_opportunities")).rows,
    ).toHaveLength(2);
    expect(
      (await as(3, "select * from project_opportunities")).rows,
    ).toHaveLength(1);
    expect(
      (await as(4, "select * from project_opportunities")).rows,
    ).toHaveLength(1);
    expect(
      (await as(5, "select * from project_opportunities")).rows,
    ).toHaveLength(3);
  });
  it("saved opportunities cannot be accessed or created for someone else", async () => {
    const records = await as(
      1,
      "select id from project_opportunities where opportunity_kind='planning'",
    );
    const o = records.rows[0].id;
    await as(
      1,
      `insert into project_opportunity_saves(profile_id,opportunity_id) values ('${id(1)}','${o}')`,
    );
    await fails(
      3,
      `insert into project_opportunity_saves(profile_id,opportunity_id) values ('${id(3)}','${o}')`,
    );
    expect(
      (await as(3, "select * from project_opportunity_saves")).rows,
    ).toHaveLength(0);
  });
  it("profile owners cannot self-approve KYC, phone or driver verification", async () => {
    await db.exec(
      `RESET ROLE; GRANT UPDATE ON profiles,driver_profiles TO authenticated; INSERT INTO driver_profiles VALUES ('${id(1)}',false);`,
    );
    await as(
      1,
      `update profiles set verified=true,phone_verified=true,kyc_status='approved' where id='${id(1)}'`,
    );
    expect(
      (
        await as(
          1,
          `select verified,phone_verified,kyc_status from profiles where id='${id(1)}'`,
        )
      ).rows[0],
    ).toMatchObject({
      verified: false,
      phone_verified: false,
      kyc_status: "pending",
    });
    await as(
      1,
      `update profiles set kyc_status='submitted' where id='${id(1)}'`,
    );
    await as(
      5,
      `update profiles set verified=true,kyc_status='approved' where id='${id(1)}'`,
    );
    expect(
      (await as(1, `select verified from profiles where id='${id(1)}'`)).rows[0]
        .verified,
    ).toBe(true);
    await as(
      1,
      `update driver_profiles set verified=true where profile_id='${id(1)}'`,
    );
    expect(
      (
        await as(
          1,
          `select verified from driver_profiles where profile_id='${id(1)}'`,
        )
      ).rows[0].verified,
    ).toBe(false);
  });
  it("job-id evidence paths are accessible to main contractor, not subcontractor or other trader", async () => {
    await as(
      1,
      `insert into storage.objects values ('${id(90)}','job-evidence','${id(31)}/before/photo.jpg')`,
    );
    expect((await as(1, "select * from storage.objects")).rows).toHaveLength(1);
    expect((await as(2, "select * from storage.objects")).rows).toHaveLength(0);
    expect((await as(3, "select * from storage.objects")).rows).toHaveLength(0);
    await fails(
      3,
      `insert into storage.objects values ('${id(91)}','job-evidence','${id(31)}/before/other.jpg')`,
    );
  });
  it("anonymous callers cannot invoke financial or assignment functions", async () => {
    await db.exec("RESET ROLE; SET ROLE anon;");
    await expect(
      db.query(`select trader_business_metrics('${id(11)}')`),
    ).rejects.toThrow();
    await expect(
      db.query(
        `select record_subcontract_payment('${workId}',1,current_date,'anon')`,
      ),
    ).rejects.toThrow();
  });
});
