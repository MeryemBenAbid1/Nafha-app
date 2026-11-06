import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, HOME } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();
  if (profile) redirect(HOME[profile.role]);
  return (
    <div className="mx-auto max-w-lg space-y-8 py-16 text-center">
      <div className="space-y-3">
        <p className="wordmark text-5xl sm:text-6xl">Nafha</p>
        <p className="font-arabic text-3xl text-plum/80">نَفْحَة</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-plum/60">Real oud · proven</p>
      </div>
      <p className="text-plum/80">
        Nafha checks oud with a signed electronic nose. Scan the QR code or tap the seal on the bottle to see its
        certificate. No app needed.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/join" className="btn">
          Join the waitlist
        </Link>
        <Link href="/login" className="btn-light">
          Staff login
        </Link>
      </div>
    </div>
  );
}
