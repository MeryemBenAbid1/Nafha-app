// The classifier the app calls for every sniff.
//
// Until the real model exists, this is a STUB: a few simple rules that understand the made-up
// readings from scripts/fake-device.mjs. Its results mean nothing about real oud.
// When the Python model service is running (nafha-ml: `nafha serve --release <dir>`, port 8001),
// set CLASSIFIER_URL=http://localhost:8001 and the app calls POST /v1/classify instead.
// The contract is in nafha-ml's HOW_IT_WORKS.md.

import type { DeviceRecord } from "./record";
import type { Verdict } from "./verdict";

export type Classification = {
  verdict: Verdict;
  confidence: number | null;
  modelVersion: string;
  needsReview?: boolean;
  certifiable?: boolean; // the model service says whether a certificate may be issued
  details?: unknown; // neighbours, distance, tau, qc... kept for the expert screen and the report
};

export async function classify(record: DeviceRecord): Promise<Classification> {
  const url = process.env.CLASSIFIER_URL;
  if (url) {
    // One session per day by default; the lavender REF sniff for that session is posted to /v1/sessions/{id}/ref.
    const session = process.env.CLASSIFIER_SESSION || new Date().toISOString().slice(0, 10);
    const res = await fetch(`${url.replace(/\/$/, "")}/v1/classify?session_id=${encodeURIComponent(session)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error(`classifier service returned ${res.status}`);
    const out = await res.json();
    const votes: unknown[] = Array.isArray(out.votes) ? out.votes : [];
    const agree = votes.filter((v: any) => (v?.verdict ?? v) === out.verdict).length;
    return {
      // INVALID means the sniff failed quality checks: an expert looks at it, nobody gets a certificate.
      verdict: out.verdict === "INVALID" ? "UNKNOWN" : out.verdict,
      confidence: votes.length ? agree / votes.length : null,
      modelVersion: out.modelVersion ?? "service",
      needsReview: Boolean(out.needsReview) || out.verdict === "INVALID",
      certifiable: out.certifiable !== false,
      details: out,
    };
  }
  return stubClassify(record);
}

// Response x = ln(R_baseline / R_sample) per heater step, averaged over sensors.
// Fake genuine oud responds strongly at low heater steps, fake synthetic at high steps,
// fake diluted like genuine but weaker, and an unknown sample barely at all.
export function stubClassify(record: DeviceRecord): Classification {
  const trace = record.trace;
  const width = trace[0].length;
  const steps = width % 10 === 0 ? 10 : width;
  const mean = (rows: number[][], c: number) => rows.reduce((s, r) => s + r[c], 0) / rows.length;
  const baseline = trace.slice(0, 3);
  const sample = trace.slice(3, 9);

  const perStep = new Array(steps).fill(0);
  for (let c = 0; c < width; c++) {
    perStep[c % steps] += Math.log(mean(baseline, c) / mean(sample, c)) / (width / steps);
  }
  const amplitude = perStep.reduce((a, b) => a + Math.max(b, 0), 0) / steps;
  const total = perStep.reduce((a, b) => a + Math.max(b, 0), 0) || 1e-9;
  const centre = perStep.reduce((a, b, i) => a + i * Math.max(b, 0), 0) / total;

  let verdict: Verdict;
  let confidence: number;
  if (amplitude < 0.05) {
    verdict = "UNKNOWN";
    confidence = 0.5;
  } else if (centre > (steps - 1) / 2) {
    verdict = "SYNTHETIC";
    confidence = Math.min(0.99, 0.6 + (centre - (steps - 1) / 2) / steps);
  } else if (amplitude > 0.17) {
    verdict = "GENUINE";
    confidence = Math.min(0.99, 0.6 + amplitude);
  } else {
    verdict = "DILUTED";
    confidence = Math.min(0.95, 0.85 - Math.abs(amplitude - 0.12));
  }
  return { verdict, confidence: Math.round(confidence * 100) / 100, modelVersion: "stub-0" };
}
