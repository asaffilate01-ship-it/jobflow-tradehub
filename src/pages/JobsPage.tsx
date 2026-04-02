import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, MapPin, Lock, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];

const statusColor: Record<string, string> = {
  posted: "bg-info/15 text-info border-info/20",
  quoted: "bg-warning/15 text-warning border-warning/20",
  active: "bg-success/15 text-success border-success/20",
  awarded: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  paused: "bg-muted text-muted-foreground border-border",
};

const trades: Database["public"]["Enums"]["trade_type"][] = [
  "builder", "plumber", "electrician", "tiler", "carpenter", "roofer", "plasterer", "painter", "gas_engineer",
];

const JobsPage = () => {
  const { user, roles } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<Database["public"]["Enums"]["trade_type"]>("builder");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCustomer = roles.includes("customer");
  const isTrade = roles.includes("trade");
  const isAdmin = roles.includes("admin");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check subscription status
  useEffect(() => {
    if (!user || !isTrade) return;
    const checkSub = async () => {
      const { data: companies } = await supabase.from("trade_companies").select("id").eq("owner_profile_id", user.id);
      if (companies?.length) {
        const { data: memberships } = await supabase
          .from("marketplace_memberships")
          .select("id")
          .eq("trade_company_id", companies[0].id)
          .eq("status", "active")
          .limit(1);
        setIsSubscribed((memberships?.length ?? 0) > 0 || isAdmin);
      }
    };
    checkSub();
  }, [user, isTrade, isAdmin]);

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to post a job");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({
      title,
      description,
      requested_trade: trade,
      postcode,
      city,
      address_line1: address,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      customer_profile_id: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Job posted!");
      setShowForm(false);
      setTitle(""); setDescription(""); setPostcode(""); setCity(""); setAddress("");
      setBudgetMin(""); setBudgetMax("");
      fetchJobs();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Post jobs and receive quotes from verified trades</p>
        </div>
        {isCustomer && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            Post a job
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handlePostJob} className="glass-card p-6 space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold">New job listing</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Job title</label>
              <Input placeholder="e.g. Bathroom renovation in LU3" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Trade required</label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {trades.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work needed..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <Input placeholder="123 High Street" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <Input placeholder="Luton" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Postcode</label>
              <Input placeholder="LU3 1AA" value={postcode} onChange={(e) => setPostcode(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget min (£)</label>
              <Input type="number" placeholder="2000" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget max (£)</label>
              <Input type="number" placeholder="5000" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="font-semibold" disabled={submitting}>
            {submitting ? "Posting…" : "Create job listing"}
          </Button>
        </form>
      )}

      {/* Info banner for unsubscribed trades */}
      {isTrade && !isSubscribed && (
        <div className="glass-card p-4 flex items-center gap-3 border-primary/30">
          <Lock className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Upgrade to see full job details</p>
            <p className="text-xs text-muted-foreground">Subscribe to view budgets, addresses, and contact customers directly.</p>
          </div>
          <Button size="sm" className="shrink-0">Subscribe</Button>
        </div>
      )}

      {/* Jobs grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No jobs posted yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="glass-card p-5 space-y-3 hover:border-primary/30 transition-colors block">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <Badge variant="outline" className={statusColor[job.status] ?? ""}>
                  {job.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground">{job.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="capitalize">{job.requested_trade.replace("_", " ")}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.postcode.split(" ")[0]}
                </span>
                {(isCustomer || isSubscribed) && (
                  <span className="text-muted-foreground/70">{job.city}</span>
                )}
              </div>
              {(isCustomer || isSubscribed) ? (
                <>
                  {(job.budget_min || job.budget_max) && (
                    <div className="text-sm font-medium text-primary">
                      £{job.budget_min?.toLocaleString() ?? "?"} – £{job.budget_max?.toLocaleString() ?? "?"}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1 text-sm text-muted-foreground/40">
                  <Eye className="h-3.5 w-3.5" />
                  Budget hidden
                </div>
              )}
              {isTrade && job.status === "posted" && (
                <div className="pt-1">
                  <span className="text-xs text-primary font-medium">Click to view & submit quote →</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobsPage;
