// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migration = readFileSync(new URL(
  "../../supabase/migrations/20261101064000_signup_role_and_notification_security.sql",
  import.meta.url,
), "utf8");

let db: PGlite;
const asUser = async (user: number, sql: string, params: unknown[] = []) => {
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${uuid(user)}';`);
  return db.query(sql, params);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TYPE public.app_role AS ENUM ('customer','trade','driver','admin');
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb
    );
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id),
      full_name text NOT NULL DEFAULT '',
      email text
    );
    CREATE TABLE public.user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role public.app_role NOT NULL,
      UNIQUE(user_id,role)
    );
    CREATE TABLE public.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id uuid NOT NULL,
      title text NOT NULL,
      body text,
      read_at timestamptz
    );
    CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $function$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $function$;
    CREATE FUNCTION public.has_role(p_user uuid,p_role public.app_role)
    RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path=''
    AS $function$
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role=p_role)
    $function$;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own roles" ON public.user_roles
      FOR SELECT TO authenticated USING (user_id=auth.uid());
    CREATE POLICY "Admins can manage roles" ON public.user_roles
      FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'admin'));
    CREATE POLICY "Users can insert allowed roles only" ON public.user_roles
      FOR INSERT TO authenticated WITH CHECK (
        user_id=auth.uid() AND role IN ('customer','trade')
      );
    CREATE POLICY "System inserts notifications" ON public.notifications
      FOR INSERT TO authenticated WITH CHECK (true);
    GRANT USAGE ON SCHEMA auth,public TO authenticated,service_role;
    GRANT SELECT,INSERT ON public.user_roles TO authenticated;
    GRANT SELECT,INSERT ON public.notifications TO authenticated;
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql
    SECURITY DEFINER SET search_path='' AS $function$
      BEGIN
        INSERT INTO public.profiles(id,full_name,email)
        VALUES (NEW.id,COALESCE(NEW.raw_user_meta_data->>'full_name',''),NEW.email);
        RETURN NEW;
      END
    $function$;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    INSERT INTO auth.users(id,email,raw_user_meta_data)
    VALUES ('${uuid(9)}','legacy@example.test','{"role":"admin"}');
  `);
  await db.exec(migration);
}, 25000);

afterAll(async () => { await db?.close(); });

describe.sequential("signup and notification security migration", () => {
  it("backfills an old roleless account only as customer, not its requested admin role", async () => {
    await db.exec("RESET ROLE");
    expect((await db.query<{ role: string }>(
      "SELECT role FROM public.user_roles WHERE user_id=$1", [uuid(9)],
    )).rows).toEqual([{ role: "customer" }]);
  });

  it("assigns roles inside the auth signup transaction without a browser session", async () => {
    await db.exec(`RESET ROLE;
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
        ('${uuid(1)}','customer@example.test','{"full_name":"New Customer","role":"customer"}'),
        ('${uuid(2)}','trade@example.test','{"full_name":"Trade Owner","role":"trade"}'),
        ('${uuid(3)}','driver@example.test','{"full_name":"Driver Applicant","role":"driver"}');
    `);
    const found = await db.query<{ user_id: string; role: string }>(
      "SELECT user_id,role FROM public.user_roles WHERE user_id IN ($1,$2,$3) ORDER BY user_id",
      [uuid(1),uuid(2),uuid(3)],
    );
    expect(found.rows.map(r => r.role)).toEqual(["customer","trade","driver"]);
    expect((await db.query<{ full_name: string }>(
      "SELECT full_name FROM public.profiles WHERE id=$1", [uuid(2)],
    )).rows[0].full_name).toBe("Trade Owner");
  });

  it("does not grant admin/staff or unknown roles from mutable signup metadata", async () => {
    await db.exec(`RESET ROLE;
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
        ('${uuid(4)}','admin-claim@example.test','{"role":"admin"}'),
        ('${uuid(5)}','staff-claim@example.test','{"role":"staff"}'),
        ('${uuid(6)}','unknown@example.test','{"role":"superadmin"}');
    `);
    const found=await db.query<{ role: string }>(
      "SELECT role FROM public.user_roles WHERE user_id IN ($1,$2,$3) ORDER BY user_id",
      [uuid(4),uuid(5),uuid(6)],
    );
    expect(found.rows.map(r => r.role)).toEqual(["customer","customer","customer"]);
  });

  it("prevents authenticated callers from appending a more privileged role", async () => {
    await expect(asUser(1,
      "INSERT INTO public.user_roles(user_id,role) VALUES ($1,'trade')", [uuid(1)],
    )).rejects.toThrow(/row-level security|permission denied/i);
    await db.exec("RESET ROLE");
    expect((await db.query<{ role: string }>(
      "SELECT role FROM public.user_roles WHERE user_id=$1", [uuid(1)],
    )).rows).toEqual([{ role: "customer" }]);
  });

  it("blocks client notification forgery but retains service role insert privilege", async () => {
    await expect(asUser(1,
      "INSERT INTO public.notifications(recipient_id,title) VALUES ($1,'Fake account warning')",
      [uuid(2)],
    )).rejects.toThrow(/permission denied/i);
    await db.exec("RESET ROLE");
    const access = await db.query<{ allowed: boolean }>(
      "SELECT has_table_privilege('service_role','public.notifications','INSERT') AS allowed",
    );
    expect(access.rows[0].allowed).toBe(true);
  });
});
