import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanise } from "@/features/projects/catalog";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";
type Work = Database["public"]["Tables"]["subcontract_work_orders"]["Row"];
const money = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    n,
  );
export default function SubcontractorsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    subcontractor: "",
    job: "",
    title: "",
    scope: "",
    due: "",
    amount: "",
    email: "",
  });
  usePageMeta("Subcontractors & delegated work");
  const { data: companies = [] } = useQuery({
    queryKey: ["sub-companies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_companies")
        .select("id,legal_name")
        .eq("owner_profile_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const companyId = company || companies[0]?.id;
  const { data: subs = [], error: subError } = useQuery({
    queryKey: ["subcontractors", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontractors")
        .select("id,full_name,company_name")
        .eq("trade_company_id", companyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
  const { data: jobs = [], error: jobError } = useQuery({
    queryKey: ["sub-jobs", companyId],
    queryFn: async () => {
      const { data: awards, error: aError } = await supabase
        .from("job_awards")
        .select("job_id")
        .eq("trade_company_id", companyId!);
      if (aError) throw aError;
      const ids = awards.map((a) => a.job_id);
      const query = supabase
        .from("jobs")
        .select("id,title,trade_company_id")
        .in("status", ["awarded", "active"]);
      const { data, error } = await query.or(
        `trade_company_id.eq.${companyId}${ids.length ? `,id.in.(${ids.join(",")})` : ""}`,
      );
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
  const {
    data: work = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["sub-work", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontract_work_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: payments = [], error: paymentError } = useQuery({
    queryKey: ["sub-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontract_payment_records")
        .select("*")
        .order("paid_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const owned = work.filter((w) => w.trade_company_id === companyId);
  const incoming = work.filter((w) => w.assignee_profile_id === user?.id);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["sub-work"] });
      await qc.invalidateQueries({ queryKey: ["sub-payments"] });
      await qc.invalidateQueries({ queryKey: ["trader-metrics"] });
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not save. Check the details and permissions.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addSub(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !companyId) return;
    await run(async () => {
      const { error } = await supabase
        .from("subcontractors")
        .insert({ trade_company_id: companyId, full_name: name.trim() });
      if (error) throw error;
      setName("");
      await qc.invalidateQueries({ queryKey: ["subcontractors"] });
    });
  }
  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    await run(async () => {
      const { error } = await supabase.rpc("create_subcontract_work_order", {
        p_company: companyId,
        p_subcontractor: draft.subcontractor,
        p_job: draft.job,
        p_title: draft.title,
        p_scope: draft.scope,
        p_due: draft.due || null,
        p_amount: Number(draft.amount),
        p_assignee_email: draft.email || null,
      });
      if (error) throw error;
      setDraft({
        subcontractor: "",
        job: "",
        title: "",
        scope: "",
        due: "",
        amount: "",
        email: "",
      });
      toast.success(
        "Work order assigned. Linked traders can view it in their subcontractor dashboard.",
      );
    });
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subcontractors</h1>
        <p className="text-muted-foreground mt-2">
          Delegate a defined work package, monitor progress and record payments.
          You remain responsible for your customer contract.
        </p>
      </div>
      {companies.length > 1 && (
        <label className="block">
          Your company
          <select
            className="border rounded-md p-3 bg-background w-full"
            value={companyId}
            onChange={(e) => {
              setCompany(e.target.value);
              setDraft({ ...draft, subcontractor: "", job: "" });
            }}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Delegated packages", owned.length],
          [
            "Awaiting sign-off",
            owned.filter((w) => w.status === "submitted_review").length,
          ],
          [
            "Agreed value",
            money(
              owned
                .filter((w) => w.status !== "cancelled")
                .reduce((s, w) => s + w.agreed_amount, 0),
            ),
          ],
          ["Incoming packages", incoming.length],
        ].map(([label, value]) => (
          <div className="glass-card p-4" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold mt-2">{value}</p>
          </div>
        ))}
      </div>
      {(error || subError || jobError || paymentError) && (
        <p role="alert">
          Some subcontractor data could not be loaded. Refresh before making
          changes.
        </p>
      )}
      {companyId && (
        <div className="grid lg:grid-cols-3 gap-5">
          <form onSubmit={addSub} className="glass-card p-5 space-y-3">
            <h2 className="font-semibold">Your subcontractor directory</h2>
            <Input
              aria-label="Subcontractor name"
              required
              maxLength={200}
              placeholder="Name / business name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button disabled={busy}>Add subcontractor</Button>
            <ul className="text-sm space-y-2">
              {subs.map((s) => (
                <li key={s.id}>{s.company_name || s.full_name}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Adding a record does not verify credentials or CIS status.
            </p>
          </form>
          <form
            onSubmit={assign}
            className="glass-card p-5 space-y-4 lg:col-span-2"
          >
            <h2 className="font-semibold">Delegate part of an awarded job</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                Subcontractor
                <select
                  required
                  className="w-full border rounded-md p-3 bg-background"
                  value={draft.subcontractor}
                  onChange={(e) =>
                    setDraft({ ...draft, subcontractor: e.target.value })
                  }
                >
                  <option value="">Choose subcontractor</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company_name || s.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Job
                <select
                  required
                  className="w-full border rounded-md p-3 bg-background"
                  value={draft.job}
                  onChange={(e) => setDraft({ ...draft, job: e.target.value })}
                >
                  <option value="">Choose awarded / active job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              Package title
              <Input
                required
                maxLength={200}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="block">
              Scope to share
              <Textarea
                required
                maxLength={10000}
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Share only the instructions and access information this
              subcontractor needs. Customer financials and the full job are not
              shared.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label>
                Due date
                <Input
                  type="date"
                  value={draft.due}
                  onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                />
              </label>
              <label>
                Agreed total (£)
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="block">
              Existing Craftvaro trader email (optional)
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Link their existing account to let them update progress here.
              Leave blank for internal tracking. No email invitation is sent.
            </p>
            <Button disabled={busy || !jobs.length}>Assign work package</Button>
          </form>
        </div>
      )}
      <h2 className="text-xl font-semibold">Delegated work</h2>
      {isLoading ? (
        <p>Loading work packages…</p>
      ) : !owned.length ? (
        <p className="text-muted-foreground">
          No delegated packages for this company.
        </p>
      ) : (
        owned.map((w) => (
          <WorkCard
            key={w.id}
            w={w}
            owner
            busy={busy}
            payments={payments.filter((p) => p.work_order_id === w.id)}
            run={run}
          />
        ))
      )}
      <h2 className="text-xl font-semibold">Work assigned to you</h2>
      {!incoming.length ? (
        <p className="text-muted-foreground">No incoming work packages.</p>
      ) : (
        incoming.map((w) => (
          <WorkCard
            key={w.id}
            w={w}
            owner={false}
            busy={busy}
            payments={payments.filter((p) => p.work_order_id === w.id)}
            run={run}
          />
        ))
      )}
      <p className="text-xs text-muted-foreground">
        Payment records document payments made elsewhere; they do not move money
        or file CIS returns.{" "}
        <Link className="underline" to="/business-performance">
          View business performance
        </Link>
      </p>
    </div>
  );
}
function WorkCard({
  w,
  owner,
  busy,
  payments,
  run,
}: {
  w: Work;
  owner: boolean;
  busy: boolean;
  payments: Database["public"]["Tables"]["subcontract_payment_records"]["Row"][];
  run: (a: () => Promise<void>) => Promise<void>;
}) {
  const [progress, setProgress] = useState(w.progress);
  const [status, setStatus] = useState(w.status);
  const [note, setNote] = useState(w.progress_note);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return (
    <article className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap gap-3 justify-between">
        <h3 className="font-semibold">{w.title}</h3>
        <Badge variant="outline">{humanise(w.status)}</Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm">{w.scope}</p>
      <p className="text-sm">
        {w.due_date ? `Due ${w.due_date} · ` : ""}Agreed{" "}
        {money(w.agreed_amount)} · Recorded paid {money(paid)} · Remaining{" "}
        {money(w.agreed_amount - paid)}
      </p>
      <progress
        aria-label="Work progress"
        value={w.progress}
        max={100}
        className="w-full"
      />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const { error } = await supabase.rpc(
              "update_subcontract_progress",
              {
                p_id: w.id,
                p_status: status,
                p_progress: progress,
                p_note: note,
              },
            );
            if (error) throw error;
            toast.success("Progress updated");
          });
        }}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Status
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {(owner
                ? [
                    "assigned",
                    "in_progress",
                    "submitted_review",
                    "completed",
                    "cancelled",
                  ]
                : Array.from(
                    new Set([w.status, "in_progress", "submitted_review"]),
                  )
              ).map((v) => (
                <option key={v} value={v}>
                  {humanise(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Progress %
            <Input
              type="number"
              min="0"
              max="100"
              required
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </label>
        </div>
        <Textarea
          aria-label="Progress note"
          placeholder="Progress, blockers and handover notes"
          maxLength={10000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          disabled={
            busy || (!owner && ["completed", "cancelled"].includes(w.status))
          }
        >
          Update progress
        </Button>
      </form>
      {owner && w.status !== "cancelled" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await supabase.rpc(
                "record_subcontract_payment",
                {
                  p_id: w.id,
                  p_amount: Number(amount),
                  p_paid_on: paidOn,
                  p_reference: reference,
                },
              );
              if (error) throw error;
              setAmount("");
              setReference("");
              toast.success("Payment recorded; no money was transferred");
            });
          }}
          className="border-t pt-4 space-y-3"
        >
          <h4 className="font-medium">Record a payment already made</h4>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm">
              Amount (£)
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={w.agreed_amount - paid}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Paid on
              <Input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                required
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Unique payment reference
              <Input
                required
                maxLength={200}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>
          <Button variant="outline" disabled={busy || paid >= w.agreed_amount}>
            Record payment
          </Button>
        </form>
      )}
      {!!payments.length && (
        <ul className="text-xs space-y-2">
          {payments.map((p) => (
            <li key={p.id}>
              {p.paid_on} · {money(p.amount)} · {p.reference}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
