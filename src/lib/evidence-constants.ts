/** Site evidence folder structure: Phase → Subfolder → Survey Type */

export const EVIDENCE_PHASES = [
  { value: "pre-start", label: "Pre-start" },
  { value: "demolition", label: "Demolition" },
  { value: "first-fix", label: "First Fix" },
  { value: "second-fix", label: "Second Fix" },
  { value: "finishing", label: "Finishing" },
  { value: "snagging", label: "Snagging" },
  { value: "handover", label: "Handover" },
] as const;

export const EVIDENCE_SUBFOLDERS = [
  { value: "EXT", label: "External Elements" },
  { value: "INT", label: "Internal Elements" },
  { value: "SRV", label: "Services" },
  { value: "GND", label: "External Ground Elements" },
] as const;

export const EVIDENCE_SURVEY_TYPES = {
  "External Elements": [
    "Roof", "Chimney", "Walls", "Rainwater goods", "Windows & Doors",
    "External Joinery", "Porches/Conservatories",
  ],
  "Internal Elements": [
    "Roof Space", "Ceilings", "Walls", "Floors", "Chimney breast/fireplace",
    "Built in Fittings", "Internal Joinery", "Bathroom & Sanitary fittings",
    "Loft Conversion", "Basement",
  ],
  "Services": [
    "Electricity", "Gas/Oil", "Heating/Cooling", "Water", "Drainage",
    "Solar Panel", "Other Services",
  ],
  "External Ground Elements": [
    "Garaging", "Outbuildings & Sheds", "Grounds", "Common & Shared Area",
    "Neighbourly Matters",
  ],
} as const;

export const EVIDENCE_LOCATIONS = [
  "Bathroom 1", "Bathroom 2", "Bedroom 1", "Bedroom 2", "Bedroom 3",
  "Front elevation", "Hallway first floor", "Hallway Ground", "Kitchen",
  "Living room 1", "Living room 2", "Rear elevation", "Side 1 elevation",
  "Side 2 elevation", "Utility Room", "Other",
] as const;
