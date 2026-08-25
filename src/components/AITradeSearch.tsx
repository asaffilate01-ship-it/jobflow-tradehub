import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2, Flame, Loader2, MapPin, Search, ShieldCheck, Sparkles, Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Match = {
  profile_id: string;
  company_name: string;
  full_name: string;
  trade: string;
  rating: number;
  review_count: number;
  services_description: string | null;
  years_experience: number | null;
  trade_bodies: string[];
  cover_image_url: string | null;
  accepting_work: boolean;
  emergency_work: boolean;
  capability_verified: boolean;
  insurance_verified: boolean;
  subscription_verified: boolean;
  credential: string | null;
  coverage: string;
  match_score: number;
  match_reasons: string[];
};

type SearchResult = {
  interpretation: string;
  matches: Match[];
  quota: { used: number; daily_limit: number; remaining: number };
  ai_mode: string;
  notices: string[];
};

const examples = [
  "Plumber around NW6 5YT, Gas Safe and available",
  "Emergency electrician near LU1 2AA",
  "4.5 star roofer near St Albans AL1 3AA",
];

const AITradeSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const search = async (override?: string) => {
    const request = (override ?? query).trim();
    if (!user) {
      toast.info("Sign in to use AI trade search");
      navigate("/login");
      return;
    }
    if (request.length < 5) {
      toast.error("Tell the agent which trade and location you need");
      return;
    }
    setQuery(request);
    setSearching(true);
    const { data, error } = await supabase.functions.invoke("trade-agent-search", {
      body: { query: request },
    });
    setSearching(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "AI trade search failed");
      return;
    }
    setResult(data as SearchResult);
  };

  return (
    <section className="space-y-5">
      <div className="glass-card-premium space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Trade Finder
            </Badge>
            <h2 className="text-lg font-bold">Describe exactly who you need</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search verified Craftvaro subscribers by trade, UK postcode, credentials,
              availability, emergency work and rating.
            </p>
          </div>
          {result?.quota && (
            <p className="font-mono text-xs text-muted-foreground">
              {result.quota.remaining} of {result.quota.daily_limit} AI searches left today
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
              placeholder="e.g. plumber around NW6 5YT, Gas Safe and available"
              className="h-12 rounded-xl bg-background/90 pl-10"
            />
          </div>
          <Button
            size="lg"
            disabled={searching}
            onClick={() => void search()}
            className="h-12 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {searching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Ask AI
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void search(example)}
              className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">AI understood:</span>
            <span className="font-medium capitalize">{result.interpretation}</span>
            <Badge variant="outline">
              {result.matches.length} verified match{result.matches.length === 1 ? "" : "es"}
            </Badge>
            <Badge variant="secondary">{result.ai_mode === "hybrid" ? "AI + verified rules" : "Verified rules fallback"}</Badge>
          </div>

          {result.matches.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.matches.map((match) => (
                <div key={match.profile_id} className="glass-card-elevated overflow-hidden">
                  {match.cover_image_url && (
                    <img
                      src={match.cover_image_url}
                      alt={`${match.company_name || match.full_name} work`}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                  )}
                  <div className="space-y-3 p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{match.company_name || match.full_name}</h3>
                        <Badge className="shrink-0">{match.match_score}% match</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{match.trade.replace(/_/g, " ")}</span>
                        {match.review_count > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-accent" />
                            {match.rating.toFixed(1)} ({match.review_count})
                          </span>
                        ) : <span>New member</span>}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {match.coverage}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="border-success/40 text-success">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Capability checked
                      </Badge>
                      <Badge variant="outline" className="border-success/40 text-success">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Insured
                      </Badge>
                      {match.subscription_verified && (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Craftvaro member
                        </Badge>
                      )}
                      {match.credential && (
                        <Badge variant="outline">{match.credential}</Badge>
                      )}
                      {match.emergency_work && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          <Flame className="mr-1 h-3 w-3" /> Emergency
                        </Badge>
                      )}
                      {match.accepting_work && (
                        <Badge variant="secondary">Accepting work</Badge>
                      )}
                    </div>

                    {match.services_description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {match.services_description}
                      </p>
                    )}

                    <div className="rounded-xl bg-secondary/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why this matched</p>
                      <ul className="mt-1.5 space-y-1">
                        {match.match_reasons.slice(0, 4).map((reason) => (
                          <li key={reason} className="flex gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />{reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {match.years_experience
                          ? `${match.years_experience} years experience`
                          : "Verified provider"}
                      </span>
                      <Link
                        to={`/trader/${match.profile_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        View profile →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="font-medium">No provider meets every requirement yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a wider postcode area, or post the requirement so verified providers can respond.
              </p>
              <Button asChild className="mt-4">
                <Link to="/post-job">Post this job</Link>
              </Button>
            </div>
          )}

          <ul className="space-y-1">
            {result.notices.map((notice) => (
              <li key={notice} className="text-xs text-muted-foreground">
                • {notice}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default AITradeSearch;
