// Stripe subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Registration",
    price: 0,
    product_id: null,
    price_id: null,
    features: [
      "Create your trader account",
      "Complete identity and credential verification",
      "Upgrade to appear in searches and receive opportunities",
    ],
  },
  basic: {
    name: "Basic",
    price: 29,
    product_id: "prod_UG3HuFk33raDJ1",
    price_id: "price_1THXB3PFw8eRtNbtl1PvsPQy",
    features: [
      "Active Craftvaro marketplace membership",
      "Marketplace profile card",
      "Full job details & customer contact",
      "Submit quotes on jobs",
      "In-app messaging",
    ],
  },
  premium: {
    name: "Premium",
    price: 79,
    product_id: "prod_UG3HsoKjk5DGhn",
    price_id: "price_1THXB5PFw8eRtNbtFb8RHhy3",
    features: [
      "Everything in Basic",
      "BASIC CAM photo/video evidence",
      "Compliance certificates (Gas Safe, EICR, RICS)",
      "Material ordering & delivery",
      "Job task management & milestones",
      "Change orders & snagging",
      "Trade accounts & merchant integration",
      "Analytics dashboard",
      "Payroll & CIS management",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierByProductId(productId: string | null): SubscriptionTier {
  if (!productId) return "free";
  if (productId === SUBSCRIPTION_TIERS.basic.product_id) return "basic";
  if (productId === SUBSCRIPTION_TIERS.premium.product_id) return "premium";
  return "free";
}
