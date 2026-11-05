import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { DM_Sans, DM_Serif_Display, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const display = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["500"], variable: "--font-arabic" });

export const metadata: Metadata = {
  title: "Nafha",
  description: "Real oud, proven.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Nafha", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#F5EFE6", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile().catch(() => null);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable}`}>
      <body className="min-h-screen">
        <header className="no-print border-b border-sand/70 bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="wordmark text-xl">Nafha</span>
              <span className="font-arabic text-base text-plum/70">نَفْحَة</span>
            </Link>
            {profile ? (
              <nav className="flex items-center gap-4 text-sm text-plum/80">
                {(profile.role === "technician" || profile.role === "admin") && <Link href="/technician">Technician</Link>}
                {(profile.role === "expert" || profile.role === "admin") && <Link href="/expert">Expert</Link>}
                {(profile.role === "brand" || profile.role === "admin") && <Link href="/brand">Brand</Link>}
                <span className="hidden text-plum/60 sm:inline">
                  {profile.email} · {profile.role}
                </span>
                <form action="/auth/signout" method="post">
                  <button className="text-plum/60 underline">Sign out</button>
                </form>
              </nav>
            ) : null}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
