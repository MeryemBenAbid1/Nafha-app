import type { Metadata } from "next";
import { joinWaitlist } from "./actions";

export const metadata: Metadata = { title: "Join the Nafha waitlist", description: "Real oud, proven. Be first to try Nafha." };

const ROLES = [
  { value: "buyer", en: "I buy oud", ar: "أشتري عود" },
  { value: "seller", en: "I sell oud", ar: "أبيع عود" },
  { value: "perfume_house", en: "Perfume house", ar: "دار عطور" },
  { value: "other", en: "Other", ar: "غير ذلك" },
];

export default async function Join({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { done, error, src } = await searchParams;

  if (done) {
    return (
      <div className="card mx-auto mt-8 max-w-md space-y-3 text-center">
        <h1 className="text-3xl">Thank you</h1>
        <p className="font-arabic text-xl text-plum/80">شكراً لك</p>
        <p className="text-plum/80">You're on the list. We'll message you when Nafha is ready to test oud.</p>
        <p className="font-arabic text-plum/70" dir="rtl">
          تم تسجيلك. بنرسل لك أول ما يصير نفحة جاهز لفحص العود.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div className="space-y-2 text-center">
        <p className="wordmark text-4xl">Nafha</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-plum/60">Real oud · proven</p>
        <p className="text-plum/80">
          A machine nose that checks oud is genuine and gives every bottle a certificate you can scan. Join the waitlist
          to try it first.
        </p>
        <p className="font-arabic text-plum/70" dir="rtl">
          جهاز يشم العود ويتأكد إنه أصلي، ويعطي كل قنينة شهادة تقدر تسوي لها سكان. سجّل وكن أول من يجربه.
        </p>
      </div>

      <form action={joinWaitlist} className="card space-y-4">
        <input type="hidden" name="src" value={src ?? ""} />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <fieldset>
          <legend className="label">Who are you? · مين أنت؟</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r, i) => (
              <label
                key={r.value}
                className="flex cursor-pointer flex-col items-center rounded-xl border border-sand bg-white px-3 py-2 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/10"
              >
                <input type="radio" name="role" value={r.value} defaultChecked={i === 0} className="sr-only" />
                <span>{r.en}</span>
                <span className="font-arabic text-plum/70">{r.ar}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="name">Name (optional) · الاسم</label>
          <input id="name" name="name" className="input" maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="contact">Phone or email · الهاتف أو الإيميل</label>
          <input id="contact" name="contact" className="input" required maxLength={120} placeholder="+965 … or you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="note">Anything to tell us? (optional) · ملاحظة</label>
          <textarea id="note" name="note" className="input" rows={2} maxLength={500} placeholder="e.g. I was sold fake oud once" />
        </div>

        {error && (
          <p className="text-sm text-synthetic">
            {error === "1" ? "Please add a phone or email." : "Something went wrong. Please try again."}
          </p>
        )}
        <button className="btn w-full">Join the waitlist · سجّلني</button>
        <p className="text-center text-xs text-plum/50">
          We only use this to contact you about Nafha, a Kuwait University student project. Nothing is shared.
        </p>
      </form>
    </div>
  );
}
