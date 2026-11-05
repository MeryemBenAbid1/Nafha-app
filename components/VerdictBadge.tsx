import { VERDICT_STYLE, type Verdict } from "@/lib/verdict";

export default function VerdictBadge({ label, size = "sm" }: { label: Verdict; size?: "sm" | "lg" }) {
  const style = VERDICT_STYLE[label] ?? VERDICT_STYLE.UNKNOWN;
  const sizing = size === "lg" ? "px-5 py-2 text-2xl" : "px-2 py-0.5 text-xs";
  return <span className={`inline-block rounded-full font-semibold ${sizing} ${style.className}`}>{style.label}</span>;
}
