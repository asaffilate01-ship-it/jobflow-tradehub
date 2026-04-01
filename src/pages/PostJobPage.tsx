import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, Zap, HardHat, Home, Grid3X3, Hammer, BrickWall,
  Paintbrush, Flame, TreePine, ArrowRight, ArrowLeft, CheckCircle, MapPin
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];

const trades: { slug: TradeType; label: string; icon: any }[] = [
  { slug: "plumber", label: "Plumber", icon: Wrench },
  { slug: "electrician", label: "Electrician", icon: Zap },
  { slug: "builder", label: "Builder", icon: HardHat },
  { slug: "roofer", label: "Roofer", icon: Home },
  { slug: "tiler", label: "Tiler", icon: Grid3X3 },
  { slug: "carpenter", label: "Carpenter", icon: Hammer },
  { slug: "bricklayer", label: "Bricklayer", icon: BrickWall },
  { slug: "plasterer", label: "Plasterer", icon: HardHat },
  { slug: "painter", label: "Painter", icon: Paintbrush },
  { slug: "gas_engineer", label: "Gas Engineer", icon: Flame },
  { slug: "landscaper", label: "Landscaper", icon: TreePine },
  { slug: "other", label: "Other", icon: Hammer },
];

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const PostJobPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    trade: "" as TradeType | "",
    title: "",
    description: "",
    address_line1: "",
    city: "",
    postcode: "",
    budget_min: "",
    budget_max: "",
    target_start_date: "",
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 0) return !!form.trade;
    if (step === 1) return !!form.title;
    if (step === 2) return !!form.address_line1 && !!form.city && !!form.postcode;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({
      customer_profile_id: user.id,
      requested_trade: form.trade as TradeType,
      title: form.title,
      description: form.description || null,
      address_line1: form.address_line1,
      city: form.city,
      postcode: form.postcode,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      target_start_date: form.target_start_date || null,
    });

    if (error) {
      toast.error("Failed to post job: " + error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Job posted! Traders will start quoting soon.");
    navigate("/jobs");
  };

  const steps = [
    // Step 0 — Choose trade
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What kind of work do you need?</h2>
        <p className="text-muted-foreground">Select the trade that best matches your project</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {trades.map(({ slug, label, icon: Icon }) => (
          <button
            key={slug}
            onClick={() => set("trade", slug)}
            className={`glass-card p-4 text-center space-y-2 transition-all ${
              form.trade === slug
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "hover:border-primary/20"
            }`}
          >
            <Icon className={`h-6 w-6 mx-auto ${form.trade === slug ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 1 — Describe
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Tell us about your project</h2>
        <p className="text-muted-foreground">Be specific so traders can give accurate quotes</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Job title *</label>
          <Input placeholder="e.g. Kitchen refit, Boiler replacement…" value={form.title} onChange={(e) => set("title", e.target.value)} className="h-12" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
          <Textarea placeholder="Describe the work needed, room sizes, materials preferred…" value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} />
        </div>
      </div>
    </div>,

    // Step 2 — Location
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <MapPin className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-2xl font-bold">Where is the work?</h2>
        <p className="text-muted-foreground">We'll match you with nearby tradespeople</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Address *</label>
          <Input placeholder="Street address" value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} className="h-12" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">City *</label>
            <Input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} className="h-12" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Postcode *</label>
            <Input placeholder="Postcode" value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className="h-12" />
          </div>
        </div>
      </div>
    </div>,

    // Step 3 — Budget & date
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Budget & timeline</h2>
        <p className="text-muted-foreground">Optional — helps traders tailor their quotes</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Min budget (£)</label>
            <Input type="number" placeholder="500" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} className="h-12" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Max budget (£)</label>
            <Input type="number" placeholder="2000" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} className="h-12" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred start date</label>
          <Input type="date" value={form.target_start_date} onChange={(e) => set("target_start_date", e.target.value)} className="h-12" />
        </div>
      </div>
    </div>,
  ];

  const totalSteps = steps.length;

  return (
    <div className="min-h-[70vh] flex flex-col">
      {/* Progress bar */}
      <div className="w-full max-w-2xl mx-auto mb-8 px-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step {step + 1} of {totalSteps}</p>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between max-w-2xl mx-auto w-full mt-10 px-4 pb-8">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < totalSteps - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="gap-2 font-semibold">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canNext()} className="gap-2 font-semibold">
            {submitting ? "Posting…" : "Post Job"}
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default PostJobPage;
