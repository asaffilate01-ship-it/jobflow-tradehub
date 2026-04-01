import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, MapPin } from "lucide-react";

type Job = {
  id: string;
  title: string;
  trade: string;
  budget: string;
  status: string;
  location: string;
};

const sampleJobs: Job[] = [
  { id: "1", title: "Bathroom renovation in LU3", trade: "builder", budget: "£5,000 – £8,000", status: "posted", location: "Luton" },
  { id: "2", title: "Kitchen re-fit and tiling", trade: "tiler", budget: "£2,000 – £4,000", status: "quoted", location: "Dunstable" },
  { id: "3", title: "Full house rewire", trade: "electrician", budget: "£3,500 – £5,000", status: "posted", location: "Bedford" },
  { id: "4", title: "Loft conversion structural work", trade: "builder", budget: "£12,000 – £18,000", status: "active", location: "Milton Keynes" },
];

const statusColor: Record<string, string> = {
  posted: "bg-info/15 text-info border-info/20",
  quoted: "bg-warning/15 text-warning border-warning/20",
  active: "bg-success/15 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const trades = ["builder", "plumber", "electrician", "tiler", "carpenter", "roofer", "plasterer", "painter", "gas_engineer"];

const JobsPage = () => {
  const [jobs] = useState<Job[]>(sampleJobs);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Post jobs and receive quotes from verified trades</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Post a job
        </Button>
      </div>

      {showForm && (
        <div className="glass-card p-6 space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold">New job listing</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Job title</label>
              <Input placeholder="e.g. Bathroom renovation in LU3" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Trade required</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {trades.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the work needed..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Location / postcode</label>
              <Input placeholder="LU3 1AA" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget min (£)</label>
              <Input type="number" placeholder="2000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget max (£)</label>
              <Input type="number" placeholder="5000" />
            </div>
          </div>
          <Button className="font-semibold">Create job listing</Button>
        </div>
      )}

      {/* Jobs grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="glass-card p-5 space-y-3 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className={statusColor[job.status]}>
                {job.status}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground">{job.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{job.trade}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            </div>
            <div className="text-sm font-medium text-primary">{job.budget}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobsPage;
