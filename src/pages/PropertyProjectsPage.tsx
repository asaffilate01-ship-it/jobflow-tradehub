import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, ShieldCheck } from "lucide-react";
import { projectCategories } from "@/features/projects/catalog";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";
export default function PropertyProjectsPage() {
  usePageMeta(
    "Property projects, retrofit & renovations",
    "Find contractors for renovations, retrofit, empty homes, accessible bathrooms and commercial fit-outs across the UK.",
  );
  return (
    <div className="space-y-10 py-6">
      <section className="rounded-3xl bg-primary text-primary-foreground p-7 md:p-12 space-y-5">
        <Building2 className="h-10 w-10" />
        <p className="text-sm uppercase tracking-widest">
          Craftvaro property projects
        </p>
        <h1 className="text-3xl md:text-5xl font-bold max-w-3xl">
          From essential repairs to a complete transformation.
        </h1>
        <p className="max-w-2xl">
          Bring your brief, compare contractors and manage quotations,
          milestones, site evidence and changes in one project.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/post-job">Start a project</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/marketplace">Find contractors</Link>
          </Button>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectCategories.map((c) => (
          <Link
            key={c.value}
            to={`/post-job?category=${c.value}`}
            className="glass-card p-6 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowUpRight className="h-5 w-5 text-primary mb-5" />
            <h2 className="font-semibold text-lg">{c.label}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {c.description}
            </p>
          </Link>
        ))}
      </div>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-xl font-semibold">
            Explore funding and project opportunities
          </h2>
          <p className="text-sm text-muted-foreground">
            Check council schemes and source-linked planning or tender records.
            Funding depends on the scheme, location and applicant. Planning
            approval is not a request for quotes.
          </p>
          <Button asChild variant="outline">
            <Link to="/funding-opportunities">Browse funding</Link>
          </Button>
        </div>
        <div className="glass-card p-6 space-y-3">
          <ShieldCheck className="text-primary" />
          <h2 className="text-xl font-semibold">
            Choose the right qualifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Check insurance, credentials, relevant experience and the scope of
            any named council approval. Craftvaro verification does not itself
            mean council or government approval.
          </p>
          <p className="text-sm text-muted-foreground">
            For accessible home grants, arrange the required council assessment
            before commissioning work. Share functional requirements here, not
            medical records.
          </p>
        </div>
      </section>
    </div>
  );
}
