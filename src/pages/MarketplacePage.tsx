/* eslint-disable @typescript-eslint/no-explicit-any -- marketplace views are added by this release migration */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Award, BriefcaseBusiness, CheckCircle2, ChevronLeft,
  ChevronRight, Filter, Flame, Languages, MapPin, MessageCircle,
  RotateCcw, Search, Shield, ShieldCheck, Sparkles, Star, Store, Users, Wrench,
} from "lucide-react";

import AITradeSearch from "@/components/AITradeSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/integrations/supabase/client";

const pageSize = 24;
const categories = [
  ["all", "All trades"], ["builder", "Builder"], ["plumber", "Plumber"],
  ["electrician", "Electrician"], ["gas_engineer", "Gas Engineer"], ["tiler", "Tiler"],
  ["carpenter", "Carpenter"], ["bricklayer", "Bricklayer"], ["roofer", "Roofer"],
  ["plasterer", "Plasterer"], ["painter", "Painter"], ["landscaper", "Landscaper"],
  ["removals", "Removals"], ["rubbish_collection", "Rubbish Collection"], ["cleaner", "Cleaner"],
] as const;

type Listing = {
  listing_id: string;
  profile_id: string | null;
  listing_kind: "member" | "directory";
  display_name: string;
  company_name: string | null;
  trade_specialism: string | null;
  rating: number;
  review_count: number;
  services_description: string | null;
  service_radius_miles: number | null;
  years_experience: number | null;
  trade_bodies: string[];
  verified: boolean;
  cover_image_url: string | null;
  city: string;
  postcode_district: string;
  languages: string[];
  accepting_work: boolean;
  emergency_work: boolean;
  insurance_verified: boolean;
  credential: string | null;
  subscription_verified: boolean;
  claim_status: string | null;
  source_name: string | null;
  source_checked_at: string | null;
  completed_jobs: number;
  response_minutes: number | null;
};

type MarketplaceStats = {
  verified_members: number;
  directory_profiles: number;
  completed_jobs: number;
  average_rating: number;
  average_response_minutes: number;
};

const emptyStats: MarketplaceStats = {
  verified_members: 0,
  directory_profiles: 0,
  completed_jobs: 0,
  average_rating: 0,
  average_response_minutes: 0,
};

export default function MarketplacePage() {
  usePageMeta("Find verified tradespeople", "AI-powered search for verified, subscribing Craftvaro tradespeople, plus claimable factual directory profiles.");
  const { user } = useAuth();
  const [params] = useSearchParams();
  const db = supabase as any;
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    query: params.get("q") || "",
    location: params.get("location") || "",
    category: params.get("category") || "all",
    country: "GB",
    scope: "all",
    minimumRating: "0",
    language: "",
    acceptingWork: false,
    emergencyWork: false,
    insuredOnly: false,
    sort: "recommended",
  });

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError("");
      let request = db.from("marketplace_listings_public").select("*", { count: "exact" });
      if (filters.country) request = request.eq("country_code", filters.country);
      if (filters.category !== "all") request = request.eq("trade_specialism", filters.category);
      if (filters.scope !== "all") request = request.eq("listing_kind", filters.scope);
      if (Number(filters.minimumRating) > 0) request = request.gte("rating", Number(filters.minimumRating));
      if (filters.acceptingWork) request = request.eq("accepting_work", true);
      if (filters.emergencyWork) request = request.eq("emergency_work", true);
      if (filters.insuredOnly) request = request.eq("insurance_verified", true);
      if (filters.language.trim()) request = request.contains("languages", [filters.language.trim()]);
      const search = safeTerm(filters.query);
      const location = safeTerm(filters.location);
      if (search) request = request.or(`display_name.ilike.%${search}%,company_name.ilike.%${search}%,services_description.ilike.%${search}%`);
      if (location) request = request.or(`city.ilike.%${location}%,postcode_district.ilike.%${location}%`);

      if (filters.sort === "rating") request = request.order("rating", { ascending: false }).order("review_count", { ascending: false });
      else if (filters.sort === "experience") request = request.order("years_experience", { ascending: false, nullsFirst: false });
      else if (filters.sort === "name") request = request.order("display_name", { ascending: true });
      else request = request.order("member_rank", { ascending: true }).order("recommended_score", { ascending: false });

      const start = (page - 1) * pageSize;
      const [{ data, error, count }, statsResult] = await Promise.all([
        request.range(start, start + pageSize - 1),
        db.from("marketplace_stats_public").select("*").maybeSingle(),
      ]);
      if (error) {
        setLoadError(error.message);
        setListings([]);
        setTotal(0);
      } else {
        setListings((data ?? []) as Listing[]);
        setTotal(count ?? 0);
      }
      if (statsResult.data) setStats(statsResult.data as MarketplaceStats);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [db, filters, page]);

  useEffect(() => { setPage(1); }, [filters]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = useMemo(() => [
    filters.scope !== "all", Number(filters.minimumRating) > 0, filters.language,
    filters.acceptingWork, filters.emergencyWork, filters.insuredOnly,
  ].filter(Boolean).length, [filters]);

  const resetFilters = () => setFilters((current) => ({
    ...current, scope: "all", minimumRating: "0", language: "", acceptingWork: false,
    emergencyWork: false, insuredOnly: false, sort: "recommended",
  }));

  return (
    <div className="space-y-7 page-enter">
      <section className="glass-card-elevated relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3"><Users className="mr-1.5 h-3.5 w-3.5" />Craftvaro Marketplace</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find the right trade—with evidence, not guesswork</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">Search subscribed Craftvaro members by location, availability, insurance, regulated credentials and verified-job reviews. Directory profiles are clearly separated and cannot receive leads until claimed and subscribed.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!user && <Button asChild variant="outline"><Link to="/signup">List or claim your trade</Link></Button>}
            <Button asChild><Link to="/repair-assist"><Sparkles className="mr-2 h-4 w-4" />AI repair help</Link></Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-6 sm:grid-cols-4">
          <Metric icon={ShieldCheck} value={stats.verified_members} label="Subscribed members" />
          <Metric icon={Store} value={stats.directory_profiles} label="Claimable profiles" />
          <Metric icon={BriefcaseBusiness} value={stats.completed_jobs} label="Completed jobs" />
          <Metric icon={Star} value={stats.average_rating ? stats.average_rating.toFixed(1) : "—"} label="Verified rating" />
        </div>
      </section>

      <AITradeSearch />

      <section className="glass-card space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_0.7fr_auto]">
          <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Trade, company or service" className="h-12 rounded-xl pl-10" /></div>
          <div className="relative"><MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Postcode district or town" className="h-12 rounded-xl pl-10" /></div>
          <Button variant="outline" className="h-12 justify-center rounded-xl lg:min-w-32" onClick={() => setShowFilters((value) => !value)}><Filter className="mr-2 h-4 w-4" />Filters{activeFilters > 0 && <Badge className="ml-2 h-5 min-w-5 px-1.5">{activeFilters}</Badge>}</Button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {categories.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilters({ ...filters, category: value })} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${filters.category === value ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
              {value === "all" && <Wrench className="mr-1.5 inline h-3.5 w-3.5" />}{label}
            </button>
          ))}
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} gap-4 border-t pt-4 sm:grid-cols-2 lg:grid lg:grid-cols-4`}>
          <FilterSelect label="Country" value={filters.country} onChange={(country) => setFilters({ ...filters, country })} options={[["GB", "United Kingdom"], ["DE", "Germany"]]} />
          <FilterSelect label="Listing type" value={filters.scope} onChange={(scope) => setFilters({ ...filters, scope })} options={[["all", "Members + directory"], ["member", "Subscribed members only"], ["directory", "Claimable profiles only"]]} />
          <FilterSelect label="Minimum verified rating" value={filters.minimumRating} onChange={(minimumRating) => setFilters({ ...filters, minimumRating })} options={[["0", "Any rating"], ["4", "4.0+"], ["4.5", "4.5+"], ["5", "5.0"]]} />
          <FilterSelect label="Sort" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} options={[["recommended", "Recommended"], ["rating", "Highest verified rating"], ["experience", "Most experienced"], ["name", "Name A–Z"]]} />
          <label className="space-y-1.5 text-xs font-medium"><span className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" />Language</span><Input value={filters.language} onChange={(event) => setFilters({ ...filters, language: event.target.value })} placeholder="English, Urdu, German…" /></label>
          <ToggleFilter checked={filters.acceptingWork} onChange={(acceptingWork) => setFilters({ ...filters, acceptingWork })} label="Accepting work now" />
          <ToggleFilter checked={filters.emergencyWork} onChange={(emergencyWork) => setFilters({ ...filters, emergencyWork })} label="Emergency call-outs" />
          <ToggleFilter checked={filters.insuredOnly} onChange={(insuredOnly) => setFilters({ ...filters, insuredOnly })} label="Insurance checked" />
          {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={resetFilters} className="justify-start"><RotateCcw className="mr-2 h-4 w-4" />Reset advanced filters</Button>}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{loading ? "Checking current marketplace availability…" : `${total} result${total === 1 ? "" : "s"}`}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="h-4 w-4 text-success" />AI and lead delivery use subscribed members only</div>
      </div>

      {loadError ? (
        <div className="glass-card border-destructive/30 p-8 text-center"><h2 className="font-semibold">Marketplace data update required</h2><p className="mt-2 text-sm text-muted-foreground">Apply the latest Supabase migration, then reload this page.</p><p className="mt-3 font-mono text-xs text-destructive">{loadError}</p></div>
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="glass-card h-80 animate-pulse" />)}</div>
      ) : listings.length === 0 ? (
        <div className="glass-card p-12 text-center"><Search className="mx-auto h-9 w-9 text-muted-foreground/40" /><h2 className="mt-3 font-semibold">No exact match yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Widen the location or remove an advanced filter. You can also post the work for verified members to respond.</p><Button asChild className="mt-5"><Link to="/post-job">Post this job</Link></Button></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => <ListingCard key={`${listing.listing_kind}-${listing.listing_id}`} listing={listing} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Marketplace pages" className="flex items-center justify-center gap-3 pt-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></nav>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const member = listing.listing_kind === "member";
  const title = listing.company_name || listing.display_name;
  return (
    <article className={`glass-card-elevated flex h-full flex-col overflow-hidden ${member ? "border-primary/20" : "border-dashed"}`}>
      <div className="relative h-28 bg-gradient-to-br from-primary/15 via-accent/10 to-secondary">
        {listing.cover_image_url && <img src={listing.cover_image_url} alt={`${title} work`} loading="lazy" className="h-full w-full object-cover" />}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge className={member ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}>{member ? <><ShieldCheck className="mr-1 h-3 w-3" />Craftvaro member</> : <><Store className="mr-1 h-3 w-3" />Unclaimed directory</>}</Badge>
          {listing.accepting_work && <Badge className="bg-success text-success-foreground">Available</Badge>}
        </div>
        <div className="absolute -bottom-7 left-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-background bg-card text-xl font-bold text-primary shadow-lg">{title.charAt(0).toUpperCase()}</div>
      </div>
      <div className="flex flex-1 flex-col space-y-4 p-5 pt-11">
        <div><h2 className="text-lg font-semibold">{title}</h2>{listing.display_name !== title && <p className="text-xs text-muted-foreground">{listing.display_name}</p>}<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{listing.city || "Service area"}{listing.postcode_district ? `, ${listing.postcode_district}` : ""}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {listing.trade_specialism && <Badge variant="secondary" className="capitalize">{listing.trade_specialism.replace(/_/g, " ")}</Badge>}
          {member && listing.review_count > 0 ? <span className="inline-flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-accent text-accent" /><strong>{Number(listing.rating).toFixed(1)}</strong> ({listing.review_count})</span> : member ? <span className="text-xs text-muted-foreground">New member</span> : <span className="text-xs text-muted-foreground">Not yet member-verified</span>}
        </div>
        {listing.services_description && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{listing.services_description}</p>}
        <div className="flex flex-wrap gap-1.5">
          {listing.insurance_verified && <Badge variant="outline" className="border-success/40 text-success"><Shield className="mr-1 h-3 w-3" />Insured</Badge>}
          {listing.credential && <Badge variant="outline"><Award className="mr-1 h-3 w-3" />{listing.credential}</Badge>}
          {listing.emergency_work && <Badge variant="outline" className="border-warning/40 text-warning"><Flame className="mr-1 h-3 w-3" />Emergency</Badge>}
          {listing.languages?.slice(0, 3).map((language) => <Badge key={language} variant="outline"><Languages className="mr-1 h-3 w-3" />{language}</Badge>)}
        </div>
        {member && <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/40 p-3 text-center"><MiniMetric value={listing.completed_jobs} label="jobs" /><MiniMetric value={listing.response_minutes ? responseLabel(listing.response_minutes) : "—"} label="response" /><MiniMetric value={listing.years_experience || "—"} label="years" /></div>}
        {!member && <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground"><strong className="text-foreground">Contact hidden.</strong> This factual listing cannot receive enquiries or appear in AI results until ownership, checks and subscription are complete.{listing.source_checked_at && <span className="mt-1 block">Facts checked {new Date(listing.source_checked_at).toLocaleDateString("en-GB")}.</span>}</div>}
        <div className="mt-auto flex gap-2 border-t pt-4">
          {member && listing.profile_id ? <><Button asChild className="flex-1"><Link to={`/trader/${listing.profile_id}`}>View verified profile<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" size="icon"><Link to="/post-job" aria-label="Post a job"><MessageCircle className="h-4 w-4" /></Link></Button></> : <Button asChild className="w-full" variant="outline"><Link to={`/claim-trader/${listing.listing_id}`}><CheckCircle2 className="mr-2 h-4 w-4" />Claim this profile</Link></Button>}
        </div>
      </div>
    </article>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Shield; value: string | number; label: string }) {
  return <div className="rounded-xl bg-secondary/40 p-3"><Icon className="h-4 w-4 text-primary" /><div className="mt-2 text-xl font-bold tabular-nums">{value}</div><div className="text-[11px] text-muted-foreground">{label}</div></div>;
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return <div><div className="text-sm font-semibold tabular-nums">{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return <label className="space-y-1.5 text-xs font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}

function ToggleFilter({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" /><span>{label}</span></label>;
}

function responseLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function safeTerm(value: string) {
  return value.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}
