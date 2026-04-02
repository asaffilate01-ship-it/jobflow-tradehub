import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Star, Shield, MapPin, Clock, Award, Phone, Mail, Globe, 
  ArrowLeft, Lock, CheckCircle, Briefcase
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type TraderProfile = {
  id: string;
  full_name: string;
  company_name: string | null;
  trade_specialism: string | null;
  rating: number | null;
  phone: string | null;
  email: string | null;
  services_description: string | null;
  service_radius_miles: number | null;
  years_experience: number | null;
  trade_bodies: string[] | null;
  verified: boolean | null;
  cover_image_url: string | null;
  website_url: string | null;
  created_at: string;
};

const TraderProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const [trader, setTrader] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [completedJobCount, setCompletedJobCount] = useState(0);

  const isSubscribed = roles.includes("customer") || roles.includes("admin");

  useEffect(() => {
    const fetchAll = async () => {
      if (!id) return;
      const [{ data: profile }, { data: reviewData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, company_name, trade_specialism, rating, phone, email, services_description, service_radius_miles, years_experience, trade_bodies, verified, cover_image_url, website_url, created_at")
          .eq("id", id)
          .single(),
        supabase
          .from("reviews")
          .select("*")
          .eq("trader_profile_id", id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setTrader(profile as TraderProfile | null);
      setReviews(reviewData ?? []);

      // Fetch portfolio: evidence from completed jobs by this trader
      const { data: companies } = await supabase.from("trade_companies").select("id").eq("owner_profile_id", id);
      const companyIds = companies?.map(c => c.id) ?? [];
      if (companyIds.length) {
        const { data: awards } = await supabase.from("job_awards").select("job_id").in("trade_company_id", companyIds);
        const jobIds = awards?.map(a => a.job_id) ?? [];
        if (jobIds.length) {
          const [{ data: media }, { count }] = await Promise.all([
            supabase.from("job_media").select("storage_path, media_type").in("job_id", jobIds).eq("media_type", "photo").limit(12),
            supabase.from("jobs").select("id", { count: "exact", head: true }).in("id", jobIds).eq("status", "completed"),
          ]);
          setPortfolioImages((media ?? []).map(m => supabase.storage.from("job-evidence").getPublicUrl(m.storage_path).data.publicUrl));
          setCompletedJobCount(count ?? 0);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card h-48 animate-pulse" />
        <div className="glass-card h-64 animate-pulse" />
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">Trader not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  const memberSince = new Date(trader.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      {/* Header card */}
      <div className="glass-card overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary relative">
          {trader.cover_image_url && (
            <img src={trader.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6 -mt-10 relative">
          <div className="flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary border-4 border-background text-primary font-bold text-2xl shrink-0">
              {trader.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{trader.full_name}</h1>
                {trader.verified && (
                  <Badge variant="outline" className="bg-success/15 text-success border-success/20 gap-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              {trader.company_name && (
                <p className="text-muted-foreground">{trader.company_name}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            {trader.trade_specialism && (
              <span className="capitalize font-medium text-foreground">
                {trader.trade_specialism.replace("_", " ")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-primary fill-primary" />
              {trader.rating?.toFixed(1) ?? "5.0"} rating
            </span>
            {trader.years_experience && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {trader.years_experience} years experience
              </span>
            )}
            {trader.service_radius_miles && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {trader.service_radius_miles} mile radius
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* About / Services */}
          {trader.services_description && (
            <div className="glass-card p-6 space-y-3">
              <h2 className="text-lg font-semibold">About & Services</h2>
              <p className="text-muted-foreground whitespace-pre-line">{trader.services_description}</p>
            </div>
          )}

          {/* Trade bodies */}
          {trader.trade_bodies && trader.trade_bodies.length > 0 && (
            <div className="glass-card p-6 space-y-3">
              <h2 className="text-lg font-semibold">Accreditations & Memberships</h2>
              <div className="flex flex-wrap gap-2">
                {trader.trade_bodies.map((body) => (
                  <Badge key={body} variant="outline" className="gap-1.5 py-1 px-3">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    {body}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio / Before & After Gallery */}
          <div className="glass-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Past Work Gallery</h2>
              {completedJobCount > 0 && (
                <span className="text-xs text-muted-foreground">{completedJobCount} completed job{completedJobCount !== 1 ? "s" : ""}</span>
              )}
            </div>
            {portfolioImages.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {portfolioImages.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-secondary group relative">
                    <img src={url} alt={`Work sample ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square rounded-lg bg-secondary/50 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="glass-card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Customer Reviews</h2>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-lg bg-secondary/40 space-y-1.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar — Contact */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4 glow">
            <h2 className="text-lg font-semibold">Contact this trader</h2>
            {isSubscribed || (user && roles.includes("trade")) ? (
              <div className="space-y-3">
                {trader.phone && (
                  <a href={`tel:${trader.phone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                    {trader.phone}
                  </a>
                )}
                {trader.email && (
                  <a href={`mailto:${trader.email}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                    {trader.email}
                  </a>
                )}
                {trader.website_url && (
                  <a href={trader.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Globe className="h-4 w-4 text-primary" />
                    Website
                  </a>
                )}
                <Button className="w-full font-semibold gap-2">
                  <Mail className="h-4 w-4" />
                  Send a message
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-primary" />
                  Contact details are for registered users
                </div>
                <Button asChild className="w-full font-semibold">
                  <Link to={user ? "/jobs" : "/signup"}>
                    {user ? "Subscribe to contact" : "Sign up to contact"}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rating</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                  {trader.rating?.toFixed(1) ?? "5.0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified</span>
                <span className="font-medium text-foreground">{trader.verified ? "Yes" : "Pending"}</span>
              </div>
              {trader.years_experience && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium text-foreground">{trader.years_experience} years</span>
                </div>
              )}
              {trader.service_radius_miles && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service area</span>
                  <span className="font-medium text-foreground">{trader.service_radius_miles} miles</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraderProfilePage;
