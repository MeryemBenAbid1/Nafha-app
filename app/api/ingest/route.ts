// POST /api/ingest — where every sniff arrives. The steps are in lib/ingest.ts.
import { NextResponse } from "next/server";
import { ingestRecord } from "@/lib/ingest";
import type { DeviceRecord } from "@/lib/record";

export async function POST(req: Request) {
  let record: DeviceRecord;
  try {
    record = await req.json();
  } catch {
    return NextResponse.json({ error: "body is not JSON" }, { status: 400 });
  }
  const { status, body } = await ingestRecord(record);
  return NextResponse.json(body, { status });
}
