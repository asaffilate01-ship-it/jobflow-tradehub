import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/use-page-meta";
export default function BusinessPerformancePage() {
  const { user } = useAuth();
  const [company, setCompany] = useState("");
  usePageMeta("Business performance");
  const { data: companies = [], error: companyError } = useQuery({
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["trader-metrics", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trader_business_metrics", {
        p_company: companyId!,
      });
      if (error) throw error;
      return data as Record<string, number>;
    },
    enabled: !!companyId,
  });
  const labels: Record<string, string> = {
    active_jobs: "Active / awarded jobs",
    completed_jobs: "Completed jobs",
    quotes_submitted: "Submitted & decided quotes",
    quotes_accepted: "Accepted quotes",
    quote_pipeline: "Pending quote value",
    accepted_quote_value: "Accepted quote value",
    invoiced_ex_vat: "Invoiced excluding VAT",
    paid_invoice_value: "Invoices marked fully paid",
    open_invoice_face_value: "Open invoice face value",
    overdue_invoice_count: "Overdue invoices",
    subcontract_committed: "Subcontract agreements",
    subcontract_paid: "Subcontract payments recorded",
    subcontract_awaiting_review: "Packages awaiting sign-off",
    subcontract_overdue: "Overdue packages",
  };
  const amounts = new Set([
    "quote_pipeline",
    "accepted_quote_value",
    "invoiced_ex_vat",
    "paid_invoice_value",
    "open_invoice_face_value",
    "subcontract_committed",
    "subcontract_paid",
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Business performance</h1>
      <p className="text-muted-foreground">
        All-time operational and financial records for your company. Totals
        include all matching records.
      </p>
      {companies.length > 0 && (
        <label className="block">
          Company
          <select
            className="w-full rounded-md border bg-background p-3"
            value={companyId}
            onChange={(e) => setCompany(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error || companyError ? (
        <p role="alert">
          Business metrics could not be loaded. Refresh or contact support.
        </p>
      ) : isLoading ? (
        <p>Loading performance…</p>
      ) : !companyId ? (
        <p>Create your trade company profile to view performance.</p>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(labels).map(([key, label]) => (
                <div key={key} className="glass-card p-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-3">
                    {amounts.has(key)
                      ? new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                        }).format(data[key] ?? 0)
                      : (data[key] ?? 0)}
                  </p>
                </div>
              ))}
              <div className="glass-card p-5">
                <p className="text-xs text-muted-foreground">
                  Quote acceptance rate
                </p>
                <p className="text-2xl font-bold mt-3">
                  {data.quotes_submitted
                    ? `${Math.round((data.quotes_accepted / data.quotes_submitted) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="glass-card p-5 space-y-3 text-sm">
              <p>
                Accepted quotes are contract value, not cash received. Paid
                invoice value uses invoice status and is not bank-reconciled
                cash.
              </p>
              <p>
                Open invoice face value includes the original total of part-paid
                invoices; it is not the exact balance due. Subcontract
                agreements and recorded payments may include VAT and must not be
                subtracted from ex-VAT revenue to infer profit.
              </p>
              <p>
                Full profit, cash flow and tax reporting require a complete
                ledger, actual receipts, supplier costs and reconciliation.
              </p>
            </div>
          </>
        )
      )}
      <div className="flex gap-5 text-sm">
        <Link className="underline" to="/subcontractors">
          Manage subcontractors
        </Link>
        <Link className="underline" to="/accounting">
          Accounting records
        </Link>
      </div>
    </div>
  );
}
