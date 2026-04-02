/** Site evidence folder structure inspired by BASIC CAM */

export const EVIDENCE_PHASES = [
  { value: "pre-start", label: "Pre-start" },
  { value: "demolition", label: "Demolition" },
  { value: "first-fix", label: "First Fix" },
  { value: "second-fix", label: "Second Fix" },
  { value: "finishing", label: "Finishing" },
  { value: "snagging", label: "Snagging" },
  { value: "handover", label: "Handover" },
] as const;

export const EVIDENCE_LOCATIONS = [
  "Front elevation", "Rear elevation", "Side 1 elevation", "Side 2 elevation",
  "Kitchen", "Bathroom 1", "Bathroom 2", "Bedroom 1", "Bedroom 2", "Bedroom 3",
  "Living room", "Hallway", "Utility room", "Garage", "Loft", "Garden", "Other",
] as const;

export const EVIDENCE_ELEMENTS = {
  "External": ["Roof", "Walls", "Windows & Doors", "Guttering", "Drains", "Driveway"],
  "Internal": ["Ceilings", "Walls", "Floors", "Joinery", "Fittings"],
  "Services": ["Electrics", "Plumbing", "Heating", "Gas", "Ventilation"],
  "Other": ["Defect", "Damage", "Before/After", "General"],
} as const;
