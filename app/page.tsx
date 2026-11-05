import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, HOME } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();
  if (profile) redirect(HOME[profile.role]);
  return (
    <div className="mx-auto max-w-md space-y-6 py-12 text-center">
      <h1 className="text-3xl font-semibold">Real oud, proven.</h1>
      <p className="text-stone-600">
        Nafha checks oud with a signed electronic nose. Buyers scan the QR code on the bottle to see the certificate.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/login" className="btn">
          Staff login
        </Link>
      </div>
      <p className="text-sm text-stone-500">Buying oud? Scan the QR code or tap the seal with your phone. No app needed.</p>
    </div>
  );
}
