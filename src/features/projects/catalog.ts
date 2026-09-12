export const projectCategories = [
  {
    value: "maintenance",
    label: "Maintenance & repairs",
    description: "Planned repairs, replacements and ongoing property care.",
  },
  {
    value: "renovation",
    label: "Renovations & extensions",
    description:
      "Extensions, loft conversions, kitchens and whole-home renovations.",
  },
  {
    value: "retrofit",
    label: "Energy retrofit",
    description:
      "Insulation, ventilation, heating and energy improvements, including Gabley assessment referrals.",
  },
  {
    value: "empty_homes",
    label: "Empty homes",
    description:
      "Surveys and refurbishment to bring vacant properties back into use.",
  },
  {
    value: "adaptations",
    label: "Accessible homes",
    description:
      "Wet rooms, downstairs bathrooms, ramps and assessed accessible extensions.",
  },
  {
    value: "commercial",
    label: "Commercial fit-outs",
    description: "Shops, offices, restaurants, salons and commercial units.",
  },
  {
    value: "public_sector",
    label: "Council & housing projects",
    description:
      "Council, housing association and public procurement projects.",
  },
] as const;
export type ProjectCategory = (typeof projectCategories)[number]["value"];
export const categoryLabel = (value: string) =>
  projectCategories.find((c) => c.value === value)?.label ?? value;
export const fundingStages = [
  "self_funded",
  "exploring",
  "applied",
  "approved",
] as const;
export const planningStages = [
  "unknown",
  "not_required",
  "preparing",
  "submitted",
  "approved",
] as const;
export const humanise = (value: string) => value.replace(/_/g, " ");
export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function validBudget(min: string, max: string) {
  return (
    [min, max].every(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
    ) &&
    (!min || !max || Number(max) >= Number(min))
  );
}
