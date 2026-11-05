// A tiny line chart of one sniff: average response per row (baseline, sample, purge).
export default function Sparkline({ trace }: { trace: number[][] }) {
  const base = trace.slice(0, 3);
  const avg = (row: number[]) => row.reduce((a, b) => a + b, 0) / row.length;
  const r0 = base.reduce((a, r) => a + avg(r), 0) / base.length;
  const ys = trace.map((row) => Math.log(r0 / avg(row)));
  const max = Math.max(0.01, ...ys);
  const w = 120, h = 32;
  const pts = ys.map((y, i) => `${(i / (ys.length - 1)) * w},${h - (Math.max(y, 0) / max) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} className="text-stone-700" aria-label="sniff response">
      <rect x={(3 / 14) * w} width={(6 / 14) * w} height={h} className="fill-stone-100" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
