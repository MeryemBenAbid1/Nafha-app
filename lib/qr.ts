import QRCode from "qrcode";
import { headers } from "next/headers";

// The app's public address, used inside QR codes. NEXT_PUBLIC_APP_URL wins; otherwise the address this
// request came in on (so a fresh Vercel deploy works without extra setup).
export async function appUrl(path: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}

export async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, { margin: 1, width: 240, errorCorrectionLevel: "M" });
}
