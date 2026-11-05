export const VERDICTS = ["GENUINE", "DILUTED", "SYNTHETIC", "UNKNOWN"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_STYLE: Record<Verdict, { label: string; className: string }> = {
  GENUINE: { label: "Genuine", className: "bg-genuine text-white" },
  DILUTED: { label: "Diluted", className: "bg-diluted text-white" },
  SYNTHETIC: { label: "Synthetic", className: "bg-synthetic text-white" },
  UNKNOWN: { label: "Unknown", className: "bg-unknown text-white" },
};
