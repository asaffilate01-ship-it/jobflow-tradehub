// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const read = (name: string) =>
  readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");

let db: PGlite;
const asUser = async (n: number, sql: string, params: unknown[] = []) => {
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${id(n)}';`);
  return db.query<Record<string, unknown>>(sql, params);
};
const summary = (labour = 100, materials = 20, delivery = 0) => ({
  labour_amount: labour,
  materials_estimate: materials,
  delivery_estimate: delivery,
  notes: "Tested job quote",
});
const line = (description = "Labour", quantity = 2, unit_price = 60, line_type = "labour") => ({
  description, quantity, unit_price, line_type,
});
const submit = (user: number, job: number, company: number, values: object, lines: object[]) =>
  asUser(user, "SELECT public.submit_project_quote_atomic($1,$2,$3::jsonb,$4::jsonb) AS quote_id", [
    id(job), id(company), JSON.stringify(values), JSON.stringify(lines),
  ]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      raw_user_meta_data jsonb,
      email text
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
  await db.exec(read("20260401205937_adffb818-65ed-4595-88f8-4dcd528f4051.sql"));
  await db.exec(`
    ALTER TABLE public.profiles
      ADD kyc_status text DEFAULT 'approved',
      ADD verified boolean DEFAULT true;
    ALTER TABLE public.jobs ADD job_kind text DEFAULT 'project';
    CREATE TABLE public.subscribers (
      user_id uuid, subscribed boolean, tier text, subscription_end timestamptz
    );
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END
    $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
    -- Model the legacy Data API grants that made quote DML callable.
    GRANT INSERT, UPDATE, DELETE ON public.quotes, public.quote_lines TO authenticated;
  `);
  await db.exec(read("20260402123017_27f69905-6558-43de-b750-a2ce547aeb0e.sql"));
  await db.exec(read("20261023073508_craftvaro_transactional_workflows.sql"));
  await db.exec(read("20261031070000_atomic_project_quote_submission.sql"));
  await db.exec(`
    INSERT INTO auth.users(id) VALUES
      ('${id(1)}'), ('${id(2)}'), ('${id(3)}');
    INSERT INTO public.user_roles(user_id, role) VALUES
      ('${id(1)}', 'trade'), ('${id(2)}', 'trade');
    INSERT INTO public.trade_companies(id, owner_profile_id, legal_name) VALUES
      ('${id(11)}', '${id(1)}', 'Approved trader'),
      ('${id(12)}', '${id(2)}', 'Inactive trader');
    INSERT INTO public.subscribers(user_id, subscribed, tier, subscription_end) VALUES
      ('${id(1)}', true, 'premium', NULL),
      ('${id(2)}', false, 'free', NULL);
    INSERT INTO public.jobs(
      id, customer_profile_id, requested_trade, title,
      address_line1, city, postcode
    ) VALUES
      ('${id(21)}', '${id(3)}', 'builder', 'First', 'Road', 'Luton', 'LU1'),
      ('${id(22)}', '${id(3)}', 'builder', 'Second', 'Road', 'Luton', 'LU1'),
      ('${id(23)}', '${id(3)}', 'builder', 'Third', 'Road', 'Luton', 'LU1'),
      ('${id(24)}', '${id(3)}', 'builder', 'Fourth', 'Road', 'Luton', 'LU1'),
      ('${id(25)}', '${id(3)}', 'builder', 'Fifth', 'Road', 'Luton', 'LU1'),
      ('${id(26)}', '${id(3)}', 'builder', 'Sixth', 'Road', 'Luton', 'LU1'),
      ('${id(27)}', '${id(3)}', 'builder', 'Seventh', 'Road', 'Luton', 'LU1'),
      ('${id(28)}', '${id(3)}', 'builder', 'Eighth', 'Road', 'Luton', 'LU1'),
      ('${id(29)}', '${id(3)}', 'builder', 'Ninth', 'Road', 'Luton', 'LU1');
  `);
}, 25000);

afterAll(async () => { await db?.close(); });

describe.sequential("Atomic project quote submission", () => {
  it("stores the generated quote total without writing generated columns, then marks job quoted", async () => {
    const result = await submit(1, 21, 11, summary(), []);
    const quoteId = result.rows[0].quote_id;
    expect(quoteId).toBeTruthy();
    await db.exec("RESET ROLE");
    const quotes = await db.query("SELECT labour_amount, materials_estimate, total_amount FROM public.quotes WHERE id=$1", [quoteId]);
    expect(quotes.rows).toEqual([{
      labour_amount: "100.00",
      materials_estimate: "20.00",
      total_amount: "120.00",
    }]);
    expect((await db.query<{ status: string }>("SELECT status FROM public.jobs WHERE id=$1", [id(21)])).rows[0].status).toBe("quoted");
    await expect(submit(1, 21, 11, summary(), [])).rejects.toThrow("already been submitted");
  });

  it("derives the parent total from itemised labour and plant lines", async () => {
    const result = await submit(1, 22, 11, summary(0, 0), [
      line("Two hours labour", 2, 60, "labour"),
      line("Scaffold hire", 1, 80, "plant"),
    ]);
    const quoteId = result.rows[0].quote_id;
    await db.exec("RESET ROLE");
    const quote = (await db.query("SELECT labour_amount, materials_estimate, total_amount FROM public.quotes WHERE id=$1", [quoteId])).rows[0];
    expect(quote).toMatchObject({ labour_amount: "120.00", materials_estimate: "80.00", total_amount: "200.00" });
    const lines = await db.query<{ line_type: string; total: string }>("SELECT line_type, total FROM public.quote_lines WHERE quote_id=$1 ORDER BY description", [quoteId]);
    expect(lines.rows).toHaveLength(2);
    expect(lines.rows.find((r) => r.line_type === "plant")?.total).toBe("80.00");
  });

  it("rejects an invalid line and leaves both the quote and job unchanged", async () => {
    await expect(submit(1, 23, 11, summary(30, 0), [
      line("Valid", 1, 15), line("Invalid", -1, 15),
    ])).rejects.toThrow("Every quote line");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(23)])).rows).toHaveLength(0);
    expect((await db.query<{ status: string }>("SELECT status FROM public.jobs WHERE id=$1", [id(23)])).rows[0].status).toBe("posted");
  });

  it("rejects contradictory summary and lines without a partial quote", async () => {
    await expect(submit(1, 24, 11, summary(100, 0), [line("Work", 1, 50)])).rejects.toThrow("must match");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(24)])).rows).toHaveLength(0);
  });

  it("denies unverified/unsubscribed trader identities and customer impersonation", async () => {
    await expect(submit(2, 25, 12, summary(), [])).rejects.toThrow("verified trader");
    await expect(submit(3, 25, 11, summary(), [])).rejects.toThrow("verified trader");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(25)])).rows).toHaveLength(0);
  });

  it("rejects sub-penny summary amounts before database storage can silently round", async () => {
    await expect(submit(1, 26, 11, summary(1.005, 0), []))
      .rejects.toThrow("valid and non-negative");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(26)])).rows).toHaveLength(0);
  });

  it("rejects sub-penny line prices and quantities before storing generated totals", async () => {
    await expect(submit(1, 27, 11, summary(0, 0), [line("Small cost", 1, 0.005)]))
      .rejects.toThrow("Every quote line");
    await expect(submit(1, 28, 11, summary(0, 0), [line("Fractional units", 0.001, 20)]))
      .rejects.toThrow("Every quote line");
    await db.exec("RESET ROLE");
    for (const job of [27, 28]) {
      expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(job)])).rows).toHaveLength(0);
    }
  });

  it("enforces the 50 line upper bound inside the RPC", async () => {
    await expect(submit(1, 29, 11, summary(0, 0), Array.from({ length: 51 }, () => line("Work", 1, 1))))
      .rejects.toThrow("Invalid quote summary");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(29)])).rows).toHaveLength(0);
  });

  it("prevents direct quote/line edits and only reveals line items to quote participants", async () => {
    await db.exec("RESET ROLE");
    const existing = await db.query<{ id: string }>("SELECT id FROM public.quotes WHERE job_id=$1", [id(22)]);
    expect(existing.rows).toHaveLength(1);
    const quote = existing.rows[0].id;
    await expect(asUser(1, "UPDATE public.quotes SET labour_amount=1 WHERE id=$1", [quote]))
      .rejects.toThrow("permission denied");
    await expect(asUser(1, "UPDATE public.quotes SET status='accepted' WHERE id=$1", [quote]))
      .rejects.toThrow("permission denied");
    await expect(asUser(1, "INSERT INTO public.quote_lines(quote_id,description,line_type,quantity,unit_price) VALUES($1,'Unauthorised','labour',1,1)", [quote]))
      .rejects.toThrow("permission denied");
    await db.exec("RESET ROLE");
    expect((await asUser(2, "SELECT id FROM public.quote_lines")).rows).toHaveLength(0);
    expect((await asUser(3, "SELECT id FROM public.quote_lines")).rows).toHaveLength(2);
  });

  it("only lets the project customer reject a submitted quote, and safely retries", async () => {
    await db.exec("RESET ROLE");
    const existing = await db.query<{ id: string }>("SELECT id FROM public.quotes WHERE job_id=$1", [id(21)]);
    const quoteId = existing.rows[0].id;
    await expect(asUser(1, "SELECT public.reject_project_quote($1)", [quoteId]))
      .rejects.toThrow("Job owner required");
    const confirmed = await asUser(3, "SELECT public.reject_project_quote($1) as rejected", [quoteId]);
    expect(confirmed.rows[0].rejected).toBe(quoteId);
    expect((await asUser(3, "SELECT public.reject_project_quote($1) as rejected", [quoteId])).rows[0].rejected).toBe(quoteId);
    await db.exec("RESET ROLE");
    expect((await db.query<{ status: string }>("SELECT status FROM public.quotes WHERE id=$1", [quoteId])).rows[0].status).toBe("rejected");
    expect((await db.query<{ status: string }>("SELECT status FROM public.jobs WHERE id=$1", [id(21)])).rows[0].status).toBe("quoted");
  });

  it("rejects cancelled projects before inserting anything", async () => {
    await db.exec(`RESET ROLE; UPDATE public.jobs SET status='cancelled' WHERE id='${id(25)}';`);
    await expect(submit(1, 25, 11, summary(), [])).rejects.toThrow("no longer accepting");
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT id FROM public.quotes WHERE job_id=$1", [id(25)])).rows).toHaveLength(0);
  });
});
