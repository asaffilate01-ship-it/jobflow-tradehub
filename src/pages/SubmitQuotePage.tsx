import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAuditChecked } from "@/lib/audit";
import { requestNotificationChecked, getJobCustomer } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, FileText, DollarSign } from "lucide-react";
import { parseQuoteMoney, validateQuoteBreakdown } from "@/lib/quoteAmounts";

type QuoteLine = {
  description: string;
  line_type: string;
  quantity: number;
  unit_price: number;
};

const SubmitQuotePage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [labourAmount, setLabourAmount] = useState("");
  const [materialsEstimate, setMaterialsEstimate] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([
    { description: "", line_type: "labour", quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    const init = async () => {
      if (!jobId || !user) { setLoading(false); return; }
      const [jobRes, compRes] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId).single(),
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
      ]);
      setJob(jobRes.data);
      setCompanyId(compRes.data?.[0]?.id ?? null);
      setLoading(false);
    };
    init();
  }, [jobId, user]);

  const totalLines = lines.filter((line) => line.description.trim())
    .reduce((total, line) => total + line.quantity * line.unit_price, 0);
  const quoteBreakdown = validateQuoteBreakdown([labourAmount, materialsEstimate, deliveryEstimate], lines);
  const totalAmount = quoteBreakdown.valid ? quoteBreakdown.total : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!jobId || !companyId || !user) {
      toast.error("Missing job or trade company information");
      return;
    }
    if ("reason" in quoteBreakdown) {
      toast.error(quoteBreakdown.reason);
      return;
    }
    if (notes.length > 3000) {
      toast.error("Additional notes cannot exceed 3,000 characters.");
      return;
    }

    const validLines = lines.filter(line => line.description.trim());
    setSubmitting(true);
    try {
      // Only this authenticated RPC may commit a project quote. The migration
      // must be deployed before the frontend; no generated columns are written.
      const { data: quoteId, error } = await supabase.rpc(
        "submit_project_quote_atomic",
        {
          p_job_id: jobId,
          p_trade_company_id: companyId,
          p_summary: {
            labour_amount: parseQuoteMoney(labourAmount) ?? 0,
            materials_estimate: parseQuoteMoney(materialsEstimate) ?? 0,
            delivery_estimate: parseQuoteMoney(deliveryEstimate) ?? 0,
            notes: notes.trim(),
          },
          p_lines: validLines.map(line => ({
            description: line.description.trim(),
            line_type: line.line_type,
            quantity: line.quantity,
            unit_price: line.unit_price,
          })),
        },
      );

      if (error) {
        if (error.code === "PGRST202" || /schema cache|could not find the function/i.test(error.message)) {
          toast.error("Quote submission needs a database update. Nothing has been confirmed. Contact support.");
        } else if (/already been submitted/i.test(error.message)) {
          toast.warning("Your company already has a quote for this job. Review the job before submitting again.");
          navigate(`/jobs/${jobId}`);
        } else {
          // Network failures can occur after a server commit: do not claim
          // nothing was saved, and do not invite an unsafe immediate retry.
          toast.error("Quote submission was not confirmed. Review the job before trying again.");
        }
        return;
      }
      if (!quoteId || typeof quoteId !== "string") {
        toast.warning("The server did not confirm the quote ID. Review the job before trying again.");
        return;
      }

      // The transaction has committed. Notifications are not the source of
      // truth: a dispatch request can be accepted without actual delivery.
      let followUpNeeded = false;
      try {
        const { customerId, title: jobTitle } = await getJobCustomer(jobId);
        if (!customerId) throw new Error("Customer could not be resolved");
        await requestNotificationChecked({
          recipientId: customerId,
          title: "New quote received",
          body: `You have a new quote${jobTitle ? ` on "${jobTitle}"` : ""}.`,
          link: `/jobs/${jobId}`,
          type: "quote",
          channels: ["in_app", "email"],
        });
      } catch (notificationError) {
        followUpNeeded = true;
        console.warn("Quote saved; notification request needs follow-up", notificationError);
      }
      try {
        await logAuditChecked({
          action: "quote.submit",
          entityType: "quote",
          entityId: quoteId,
          metadata: { job_id: jobId, total: quoteBreakdown.total },
        });
      } catch (auditError) {
        followUpNeeded = true;
        console.warn("Quote saved; supplementary audit logging needs follow-up", auditError);
      }

      if (followUpNeeded) {
        toast.warning("Quote saved. Customer notification or audit follow-up may still be required. Do not resubmit.");
      } else {
        toast.success("Quote submitted!");
      }
      navigate(`/jobs/${jobId}`);
    } catch (unexpectedError) {
      console.warn("Quote submission result is uncertain", unexpectedError);
      toast.error("Could not confirm whether the quote was saved. Check the job before trying again.");
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = () => {
    if (lines.length >= 50) { toast.error("A quote may contain up to 50 lines."); return; }
    setLines([...lines, { description: "", line_type: "labour", quantity: 1, unit_price: 0 }]);
  };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof QuoteLine, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  if (loading) return <div role="status" aria-live="polite" className="glass-card flex h-64 items-center justify-center p-6 text-sm text-muted-foreground">Loading quote details…</div>;

  if (!companyId) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <p className="text-muted-foreground">You need a trade company to submit quotes.</p>
        <Button asChild><Link to="/profile-setup">Complete profile setup</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link to={`/jobs/${jobId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to job
      </Link>

      <div className="glass-card p-6 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Submit Quote</h1>
        </div>
        {job && <p className="text-sm text-muted-foreground">For: {job.title}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Summary amounts */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Summary</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="quote-labour" className="text-sm font-medium text-muted-foreground">Labour (£)</label>
              <Input id="quote-labour" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={labourAmount} onChange={e => setLabourAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="quote-materials" className="text-sm font-medium text-muted-foreground">Materials est. (£)</label>
              <Input id="quote-materials" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={materialsEstimate} onChange={e => setMaterialsEstimate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="quote-delivery" className="text-sm font-medium text-muted-foreground">Delivery est. (£)</label>
              <Input id="quote-delivery" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">If you enter both summary amounts and itemised line prices, their totals must match.</p>
          {"reason" in quoteBreakdown && <p role="alert" className="text-sm text-destructive">{quoteBreakdown.reason}</p>}
          <div aria-live="polite" className="text-right text-lg font-bold text-primary">
            Total: {quoteBreakdown.valid ? "£" + totalAmount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Review amounts"}
          </div>
        </div>

        {/* Itemised lines */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Itemised breakdown</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1"><Plus className="h-3.5 w-3.5" />Add line</Button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-xl border border-border/60 p-3 sm:grid-cols-12 sm:items-end sm:border-0 sm:p-0">
              <div className="space-y-1 sm:col-span-5">
                <label className="text-xs text-muted-foreground">Description</label>
                <Input aria-label={`Description for line ${i + 1}`} placeholder="e.g. Strip existing tiles" value={line.description} onChange={e => updateLine(i, "description", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  aria-label={`Cost type for line ${i + 1}`} className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
                  value={line.line_type}
                  onChange={e => updateLine(i, "line_type", e.target.value)}
                >
                  <option value="labour">Labour</option>
                  <option value="materials">Materials</option>
                  <option value="plant">Plant</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Qty</label>
                <Input type="number" aria-label={`Quantity for line ${i + 1}`} value={line.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} min={1} step={1} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Unit £</label>
                <Input type="number" aria-label={`Unit price for line ${i + 1}`} value={line.unit_price} onChange={e => updateLine(i, "unit_price", Number(e.target.value))} min={0} step="0.01" />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Total</label>
                <div className="h-10 flex items-center text-sm font-medium text-foreground">£{(line.quantity * line.unit_price).toLocaleString()}</div>
              </div>
              <div className="sm:col-span-1">
                {lines.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove quote line ${i + 1}`} onClick={() => removeLine(i)} className="min-h-11 min-w-11 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-medium text-muted-foreground">
            Lines total: £{totalLines.toLocaleString()}
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-6 space-y-2">
          <label htmlFor="quote-notes" className="text-sm font-medium text-muted-foreground">Additional notes</label>
          <textarea
            id="quote-notes"
            rows={3}
            maxLength={3000}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Estimated timeline, special requirements, etc."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <Button type="submit" className="w-full font-semibold text-base h-12" disabled={submitting || !quoteBreakdown.valid}>
          {submitting ? "Submitting…" : "Submit quote"}
        </Button>
      </form>
    </div>
  );
};

export default SubmitQuotePage;
