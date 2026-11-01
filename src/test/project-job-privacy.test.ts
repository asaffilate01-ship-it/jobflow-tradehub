// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migration = readFileSync(new URL(
  "../../supabase/migrations/20261101070000_project_job_lead_privacy.sql",
  import.meta.url,
), "utf8");
let db: PGlite;
const asUser = async (n: number, sql: string, args: unknown[] = []) => {
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${id(n)}';`);
  return db.query<Record<string, unknown>>(sql, args);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;

    CREATE TYPE public.app_role AS ENUM ('customer','trade','driver','admin');
    CREATE TYPE public.trade_type AS ENUM ('builder','plumber','electrician','gas_engineer','other');
    CREATE TYPE public.job_status AS ENUM ('posted','quoted','awarded','active','paused','completed','cancelled');

    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY,
      verified boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      kyc_status text NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE public.user_roles (
      user_id uuid NOT NULL REFERENCES public.profiles(id),
      role public.app_role NOT NULL
    );
    CREATE TABLE public.subscribers (
      user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
      tier text NOT NULL DEFAULT 'free',
      subscribed boolean NOT NULL DEFAULT false,
      subscription_end timestamptz
    );
    CREATE TABLE public.trade_companies (
      id uuid PRIMARY KEY,
      owner_profile_id uuid NOT NULL REFERENCES public.profiles(id)
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $f$;
    CREATE FUNCTION public.has_role(p_user uuid, p_role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
      SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role=p_role)
    $f$;
    ALTER TABLE public.trade_companies ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "owners view company" ON public.trade_companies
      FOR SELECT TO authenticated USING (owner_profile_id=auth.uid());

    CREATE TABLE public.jobs (
      id uuid PRIMARY KEY,
      customer_profile_id uuid NOT NULL REFERENCES public.profiles(id),
      trade_company_id uuid,
      title text NOT NULL,
      description text,
      requested_trade public.trade_type NOT NULL,
      city text NOT NULL,
      postcode text NOT NULL,
      address_line1 text NOT NULL,
      status public.job_status NOT NULL DEFAULT 'posted',
      job_kind text NOT NULL DEFAULT 'project',
      project_category text NOT NULL DEFAULT 'maintenance',
      budget_min numeric(12,2),
      budget_max numeric(12,2),
      exact_address_released boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.job_awards (
      id uuid PRIMARY KEY,
      job_id uuid NOT NULL REFERENCES public.jobs(id),
      trade_company_id uuid NOT NULL REFERENCES public.trade_companies(id)
    );
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "customers manage own jobs" ON public.jobs
      FOR ALL USING (customer_profile_id=auth.uid()) WITH CHECK (customer_profile_id=auth.uid());
    CREATE POLICY "admins manage all jobs" ON public.jobs
      FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'admin'));
    CREATE POLICY "subscribed trades view ordinary project jobs" ON public.jobs
      FOR SELECT TO authenticated USING (
        job_kind='project' AND status IN ('posted','quoted','awarded','active','completed')
        AND public.has_role(auth.uid(),'trade')
      );
    CREATE POLICY "awarded trades view repair job address" ON public.jobs
      FOR SELECT TO authenticated USING (
        job_kind='repair' AND exact_address_released
        AND EXISTS (
          SELECT 1 FROM public.job_awards a
          JOIN public.trade_companies tc ON tc.id=a.trade_company_id
          WHERE a.job_id=jobs.id AND tc.owner_profile_id=auth.uid()
        )
      );
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
    GRANT SELECT ON public.jobs TO anon,authenticated;
    GRANT SELECT ON public.profiles,public.user_roles,public.subscribers,public.trade_companies TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.job_awards TO authenticated;

    INSERT INTO public.profiles(id,verified,is_active,kyc_status) VALUES
      ('${id(1)}', true,true,'approved'),
      ('${id(2)}', true,true,'approved'),
      ('${id(3)}', true,true,'approved'),
      ('${id(4)}', true,true,'approved'),
      ('${id(5)}', true,true,'approved'),
      ('${id(6)}', false,true,'pending');
    INSERT INTO public.user_roles(user_id,role) VALUES
      ('${id(1)}','customer'),('${id(2)}','trade'),('${id(3)}','trade'),
      ('${id(4)}','admin'),('${id(5)}','trade'),('${id(6)}','trade');
    INSERT INTO public.subscribers(user_id,tier,subscribed) VALUES
      ('${id(2)}','premium',true),('${id(3)}','basic',true),
      ('${id(5)}','free',false),('${id(6)}','premium',true);
    INSERT INTO public.trade_companies(id,owner_profile_id) VALUES
      ('${id(32)}','${id(2)}'),('${id(33)}','${id(3)}');
    INSERT INTO public.jobs
      (id,customer_profile_id,trade_company_id,title,description,requested_trade,city,postcode,address_line1,status,job_kind,project_category,budget_min,budget_max,exact_address_released)
    VALUES
      ('${id(21)}','${id(1)}',NULL,'Renovation at 88 Confidential Road','Site at 88 Confidential Road','builder','Luton','LU3 1AA','88 Confidential Road','posted','project','renovation',100,1000,false),
      ('${id(22)}','${id(1)}','${id(33)}','Accepted kitchen renovation','Private property job','builder','Luton','LU3 2BC','44 Private Lane','awarded','project','renovation',200,2000,false),
      ('${id(23)}','${id(1)}',NULL,'Emergency boiler repair','Private repair description','plumber','Luton','LU4 4AA','72 Test Street','posted','repair','maintenance',NULL,NULL,false);
    INSERT INTO public.job_awards(id,job_id,trade_company_id) VALUES
      ('${id(41)}','${id(22)}','${id(33)}');
  `);

  // Confirm our test fixture reproduces the old address disclosure.
  const leaked = await asUser(2, "SELECT address_line1 FROM public.jobs WHERE id=$1", [id(21)]);
  if (leaked.rows[0]?.address_line1 !== "88 Confidential Road") {
    throw new Error("Fixture did not reproduce existing subscribed-trader address exposure");
  }
  await db.exec("RESET ROLE");
  await db.exec(migration);
}, 25000);
afterAll(async () => { await db?.close(); });

describe.sequential("project address and job lead access", () => {
  it("denies exact project addresses to unselected verified traders", async () => {
    expect((await asUser(2, "SELECT id,address_line1,postcode FROM public.jobs")).rows).toEqual([]);
  });

  it("shows only whitelisted general lead fields, never user-entered private titles or full postcode", async () => {
    const result = await asUser(2, "SELECT * FROM public.list_project_job_previews(NULL)");
    expect(result.rows).toHaveLength(1);
    const preview = result.rows[0];
    expect(preview.id).toBe(id(21));
    expect(preview.title).toBe("Builder project");
    expect(preview.postcode_district).toBe("LU3");
    expect(preview.city).toBe("Luton");
    expect(preview.budget_max).toBe("1000.00");
    for(const forbidden of ["address_line1","postcode","customer_profile_id","description","trade_company_id"]) {
      expect(preview).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(preview)).not.toContain("Confidential Road");
  });

  it("prevents guessing an awarded job or repair via a preview ID", async () => {
    expect((await asUser(2, "SELECT * FROM public.list_project_job_previews($1)", [id(22)])).rows).toHaveLength(0);
    expect((await asUser(2, "SELECT * FROM public.list_project_job_previews($1)", [id(23)])).rows).toHaveLength(0);
  });

  it("keeps owner and verified awarded contractor access, with real addresses", async () => {
    const customer = await asUser(1, "SELECT id,address_line1 FROM public.jobs ORDER BY id");
    expect(customer.rows).toHaveLength(3);
    const selected = await asUser(3, "SELECT id,address_line1 FROM public.jobs ORDER BY id");
    expect(selected.rows).toEqual([{ id: id(22), address_line1: "44 Private Lane" }]);
    const admin = await asUser(4, "SELECT id FROM public.jobs");
    expect(admin.rows).toHaveLength(3);
  });

  it("rejects anonymous, unpaid, unverified, and unsigned users from the lead RPC", async () => {
    expect((await asUser(5, "SELECT * FROM public.list_project_job_previews()")).rows).toEqual([]);
    expect((await asUser(6, "SELECT * FROM public.list_project_job_previews()")).rows).toEqual([]);
    await db.exec("RESET ROLE; SET ROLE anon; RESET request.jwt.claim.sub;");
    await expect(db.query("SELECT * FROM public.list_project_job_previews()"))
      .rejects.toThrow(/permission denied/);
  });

  it("prevents impersonation by directly creating or changing an awarded job", async () => {
    await expect(asUser(2, "INSERT INTO public.job_awards(id,job_id,trade_company_id) VALUES($1,$2,$3)", [id(42),id(21),id(32)]))
      .rejects.toThrow(/permission denied/);
    await expect(asUser(3, "UPDATE public.job_awards SET trade_company_id=$1 WHERE id=$2", [id(32),id(41)]))
      .rejects.toThrow(/permission denied/);
    const ownAwards = await asUser(3, "SELECT job_id FROM public.job_awards");
    expect(ownAwards.rows).toEqual([{ job_id: id(22) }]);
    expect((await asUser(2, "SELECT job_id FROM public.job_awards")).rows).toEqual([]);
  });
});
