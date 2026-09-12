import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  projectCategories,
  categoryLabel,
  safeSourceUrl,
} from "@/features/projects/catalog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/use-page-meta";
type Opportunity = Database["public"]["Tables"]["project_opportunities"]["Row"];
const empty = {
  title: "",
  source_name: "",
  source_reference: "",
  source_url: "",
  summary: "",
  opportunity_kind: "planning",
  project_category: "renovation",
  nation: "England",
  council_name: "",
  postcode_area: "",
  decision_status: "",
  decision_date: "",
  deadline: "",
  eligibility: "",
  required_credentials: "",
  reuse_basis: "",
};
export default function ProjectOpportunitiesPage() {
  const { user, roles } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const admin =
    roles.includes("admin") && location.pathname.startsWith("/admin");
  const funding = location.pathname === "/funding-opportunities";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [nation, setNation] = useState("");
  const [kind, setKind] = useState(funding ? "funding" : "");
  const [savedOnly, setSavedOnly] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  usePageMeta(funding ? "Property funding" : "Project opportunities");
  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project-opportunities", user?.id, admin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_opportunities")
        .select("*")
        .order("verified_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
  const { data: saves = [] } = useQuery({
    queryKey: ["opportunity-saves", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_opportunity_saves")
        .select("opportunity_id")
        .eq("profile_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const saved = new Set(saves.map((s) => s.opportunity_id));
  const filtered = rows.filter(
    (r) =>
      (!category || r.project_category === category) &&
      (!nation || r.nation === nation) &&
      (!kind || r.opportunity_kind === kind) &&
      (!savedOnly || saved.has(r.id)) &&
      [r.title, r.summary, r.council_name, r.postcode_area, r.source_reference]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!safeSourceUrl(draft.source_url))
      return toast.error("Use an HTTPS source URL without credentials.");
    setBusy(true);
    try {
      const payload = {
        ...draft,
        decision_date: draft.decision_date || null,
        deadline: draft.deadline || null,
        verified_at: new Date().toISOString(),
        published: false,
      };
      const result = editing
        ? await supabase
            .from("project_opportunities")
            .update(payload)
            .eq("id", editing)
        : await supabase.from("project_opportunities").insert(payload);
      if (result.error) throw result.error;
      setDraft(empty);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["project-opportunities"] });
      toast.success("Saved as unpublished. Review before publishing.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save source record",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish(r: Opportunity) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("project_opportunities")
        .update({ published: !r.published })
        .eq("id", r.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["project-opportunities"] });
    } catch {
      toast.error("Could not change publication status");
    } finally {
      setBusy(false);
    }
  }
  async function toggleSave(r: Opportunity) {
    if (!user) return;
    setBusy(true);
    try {
      const result = saved.has(r.id)
        ? await supabase
            .from("project_opportunity_saves")
            .delete()
            .eq("profile_id", user.id)
            .eq("opportunity_id", r.id)
        : await supabase
            .from("project_opportunity_saves")
            .insert({ profile_id: user.id, opportunity_id: r.id });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["opportunity-saves"] });
    } catch {
      toast.error("Could not update saved opportunity");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        {admin
          ? "Manage opportunities"
          : funding
            ? "Property funding"
            : "Project opportunities"}
      </h1>
      <p className="text-muted-foreground">
        {admin
          ? "Curate planning, tender and funding records. Confirm reuse rights and remove personal details before publication."
          : "Source intelligence for larger property work. Planning records are not homeowner enquiries; use the original source to check status and permitted next steps."}
      </p>
      {admin && (
        <form onSubmit={saveRecord} className="glass-card p-5 space-y-4">
          <h2 className="font-semibold">
            {editing ? "Edit source record" : "Add source record"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                "title",
                "source_name",
                "source_reference",
                "source_url",
                "council_name",
                "postcode_area",
                "decision_status",
                "decision_date",
                "deadline",
              ] as const
            ).map((key) => (
              <label key={key} className="space-y-1 text-sm capitalize">
                {key.replace(/_/g, " ")}
                <Input
                  required={[
                    "title",
                    "source_name",
                    "source_reference",
                    "source_url",
                  ].includes(key)}
                  type={
                    key.endsWith("date") || key === "deadline"
                      ? "date"
                      : key === "source_url"
                        ? "url"
                        : "text"
                  }
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="text-sm">
              Kind
              <select
                className="w-full border rounded-md bg-background p-3"
                value={draft.opportunity_kind}
                onChange={(e) =>
                  setDraft({ ...draft, opportunity_kind: e.target.value })
                }
              >
                {["planning", "tender", "funding"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Category
              <select
                className="w-full border rounded-md bg-background p-3"
                value={draft.project_category}
                onChange={(e) =>
                  setDraft({ ...draft, project_category: e.target.value })
                }
              >
                {projectCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Nation
              <select
                className="w-full border rounded-md bg-background p-3"
                value={draft.nation}
                onChange={(e) => setDraft({ ...draft, nation: e.target.value })}
              >
                {["England", "Scotland", "Wales", "Northern Ireland"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          {(
            [
              "summary",
              "eligibility",
              "required_credentials",
              "reuse_basis",
            ] as const
          ).map((key) => (
            <label key={key} className="block space-y-1 text-sm capitalize">
              {key.replace(/_/g, " ")}
              <Textarea
                required={key === "reuse_basis"}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <Button disabled={busy}>Save unpublished record</Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDraft(empty);
              }}
            >
              Cancel edit
            </Button>
          )}
        </form>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Search opportunities"
          placeholder="Council, postcode area or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Project category"
          className="border rounded-md p-2 bg-background"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {projectCategories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Nation"
          className="border rounded-md p-2 bg-background"
          value={nation}
          onChange={(e) => setNation(e.target.value)}
        >
          <option value="">All UK nations</option>
          {["England", "Scotland", "Wales", "Northern Ireland"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        {!funding && (
          <select
            aria-label="Opportunity kind"
            className="border rounded-md p-2 bg-background"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All source types</option>
            {["planning", "tender", "funding"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        )}
      </div>
      <label className="flex gap-2 items-center text-sm">
        <input
          type="checkbox"
          checked={savedOnly}
          onChange={(e) => setSavedOnly(e.target.checked)}
        />
        Saved only
      </label>
      {error ? (
        <p role="alert" className="glass-card p-6">
          Opportunities could not be loaded. Please retry or contact support.
        </p>
      ) : isLoading ? (
        <p role="status">Loading opportunities…</p>
      ) : !filtered.length ? (
        <div className="glass-card p-8">
          <h2 className="font-semibold">No matching published opportunities</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Try another filter. Planning and tender access requires an active
            paid trader subscription. Only reviewed source records appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((r) => (
            <article className="glass-card p-5 space-y-3" key={r.id}>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{r.opportunity_kind}</Badge>
                <Badge variant="secondary">
                  {categoryLabel(r.project_category)}
                </Badge>
                {r.deadline &&
                  r.deadline < new Date().toISOString().slice(0, 10) && (
                    <Badge variant="outline">Deadline passed</Badge>
                  )}
                {admin && (
                  <Badge>{r.published ? "Published" : "Unpublished"}</Badge>
                )}
              </div>
              <h2 className="text-lg font-semibold">{r.title}</h2>
              <p className="text-sm text-muted-foreground">
                {r.nation} · {r.council_name} · {r.postcode_area}
              </p>
              <p className="text-sm whitespace-pre-wrap">{r.summary}</p>
              {r.decision_status && (
                <p className="text-sm">
                  Status: {r.decision_status} {r.decision_date}
                </p>
              )}
              {r.deadline && <p className="text-sm">Deadline: {r.deadline}</p>}
              {r.eligibility && (
                <p className="text-sm whitespace-pre-wrap">
                  Eligibility: {r.eligibility}
                </p>
              )}
              {r.required_credentials && (
                <p className="text-sm whitespace-pre-wrap">
                  Credentials: {r.required_credentials}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {r.source_name} · {r.source_reference} · Checked{" "}
                {new Date(r.verified_at).toLocaleDateString("en-GB")}
              </p>
              <div className="flex flex-wrap gap-2">
                {safeSourceUrl(r.source_url) && (
                  <Button asChild variant="outline">
                    <a
                      href={safeSourceUrl(r.source_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View original source
                    </a>
                  </Button>
                )}
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => toggleSave(r)}
                >
                  {saved.has(r.id) ? "Unsave" : "Save"}
                </Button>
                {admin && (
                  <>
                    <Button disabled={busy} onClick={() => publish(r)}>
                      {r.published ? "Unpublish" : "Publish reviewed record"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(r.id);
                        setDraft(
                          Object.fromEntries(
                            Object.keys(empty).map((k) => [
                              k,
                              r[k as keyof Opportunity] ?? "",
                            ]),
                          ) as typeof empty,
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Showing up to 500 most recently checked records. Grant approval is
        decided by the administering body. Public records do not confer
        permission for unsolicited marketing.
      </p>
    </div>
  );
}
