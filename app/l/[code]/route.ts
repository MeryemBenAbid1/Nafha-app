import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// A lot label was scanned: send the buyer to that lot's newest certificate.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await createAdminClient()
    .from("certificates")
    .select("id")
    .eq("lot_code", decodeURIComponent(code))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return new NextResponse("This lot has no certificate yet.", { status: 404 });
  return NextResponse.redirect(new URL(`/c/${data.id}`, request.url));
}
