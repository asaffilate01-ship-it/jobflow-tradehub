import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { notify, getJobCustomer } from "@/lib/notify";
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
  const [job, setJob] = useState<{ id: string; title: string } | null>(null);
  const [jobError, setJobError] = useState("");
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
    let cancelled = false;
    const init = async () => {
      if (!jobId || !user) { setLoading(false); return; }
      setJobError("");
      const [jobRes, compRes] = await Promise.all([
        // Only owner/accepted-contractor/admin may query a full project row.
        supabase.from("jobs").select("id,title").eq("id", jobId).maybeSingle(),
        supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id),
      ]);
      if (cancelled) return;
      if (compRes.error) {
        setJobError(compRes.error.message);
      } else if (jobRes.error) {
        setJobError(jobRes.error.message);
      } else if (jobRes.data) {
        setJob(jobRes.data);
      } else {
        // Prospective verified traders see a generic lead title only; the RPC
        // refuses unpaid or unverified access and never exposes the address.
        const { data: previews, error } = await supabase.rpc("list_project_job_previews", { p_job_id: jobId });
        if (cancelled) return;
        if (error) setJobError(error.message);
        else setJob(previews?.[0] ? { id: previews[0].id, title: previews[0].title } : null);
      }
      setCompanyId(compRes.data?.[0]?.id ?? null);
      setLoading(false);
    };
    void init();
    return () => { cancelled = true; };
  }, [jobId, user]);

  const totalLines = lines.filter((line) => line.description.trim())
    .reduce((total, line) => total + line.quantity * line.unit_price, 0);
  const quoteBreakdown = validateQuoteBreakdown([labourAmount, materialsEstimate, deliveryEstimate], lines);
  const totalAmount = quoteBreakdown.valid ? quoteBreakdown.total : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!jobId || !companyId || !user) {
      toast.error("Missing information");
      return;
    }
    if ("reason" in quoteBreakdown) {
      toast.error(quoteBreakdown.reason);
      return;
    }
    setSubmitting(true);

    const { data: quote, error: quoteErr } = await supabase.from("quotes").insert({
      job_id: jobId,
      trade_company_id: companyId,
      labour_amount: parseQuoteMoney(labourAmount) ?? 0,
      materials_estimate: parseQuoteMoney(materialsEstimate) ?? 0,
      delivery_estimate: parseQuoteMoney(deliveryEstimate) ?? 0,
      total_amount: totalAmount,
      notes,
    }).select("id").single();

    if (quoteErr) {
      toast.error(quoteErr.message);
      setSubmitting(false);
      return;
    }

    // Insert quote lines
    const validLines = lines.filter(l => l.description.trim());
    if (validLines.length > 0 && quote) {
      const { error: linesErr } = await supabase.from("quote_lines").insert(
        validLines.map(l => ({
          quote_id: quote.id,
          description: l.description,
          line_type: l.line_type,
          quantity: l.quantity,
          unit_price: l.unit_price,
          total: l.quantity * l.unit_price,
        }))
      );
      if (linesErr) {
        toast.error("The quote was saved, but its itemised breakdown failed. Please review the job and contact support before submitting another quote.");
        setSubmitting(false);
        navigate("/jobs/" + jobId);
        return;
      }
    }

    // Update job status
    const { error: statusErr } = await supabase.from("jobs").update({ status: "quoted" }).eq("id", jobId).eq("status", "posted");
    if (statusErr) {
      toast.error("The quote was saved, but its job status could not be updated. Contact support before submitting again.");
      setSubmitting(false);
      navigate("/jobs/" + jobId);
      return;
    }

    // The quote already exists. Delivery failures must not be represented as a failed submission.
    try {
      const { customerId, title: jobTitle } = await getJobCustomer(jobId);
      if (customerId) {
        await notify({
          recipientId: customerId,
          title: "New quote received",
          body: "You have a new quote" + (jobTitle ? ' on "' + jobTitle + '"' : "") + ".",
          link: "/jobs/" + jobId,
          type: "quote",
          channels: ["in_app", "email"],
        });
      }
      await logAudit({ action: "quote.submit", entityType: "quote", entityId: quote?.id, metadata: { job_id: jobId, total: totalAmount } });
    } catch {
      toast.error("Quote saved, but customer notification or audit follow-up needs attention. Do not submit again.");
      setSubmitting(false);
      navigate("/jobs/" + jobId);
      return;
    }

    toast.success("Quote submitted!");
    setSubmitting(false);
    navigate(`/jobs/${jobId}`);
  };

  const addLine = () => setLines([...lines, { description: "", line_type: "labour", quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof QuoteLine, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  if (loading) return <div role="status" aria-live="polite" className="glass-card flex h-64 items-center justify-center p-6 text-sm text-muted-foreground">Loading quote details…</div>;

  if (jobError || !job) {
    return <div className="glass-card p-8 text-center space-y-3" role="alert">
      <p className="text-muted-foreground">{jobError || "This job is no longer open to your account."}</p>
      <Button asChild variant="outline"><Link to="/jobs">Return to available jobs</Link></Button>
    </div>;
  }

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
        <p className="text-sm text-muted-foreground">For: {job.title}</p>
        <p className="text-xs text-muted-foreground">The full address is shared only after acceptance. Confirm scope and access with the customer before committing to fixed-price work.</p>
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
