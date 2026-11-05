import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nafha",
  description: "Real oud, proven.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Nafha", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1c1917", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile().catch(() => null);
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="no-print border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Nafha
            </Link>
            {profile ? (
              <nav className="flex items-center gap-4 text-sm">
                {(profile.role === "technician" || profile.role === "admin") && <Link href="/technician">Technician</Link>}
                {(profile.role === "expert" || profile.role === "admin") && <Link href="/expert">Expert</Link>}
                {(profile.role === "brand" || profile.role === "admin") && <Link href="/brand">Brand</Link>}
                <span className="hidden text-stone-500 sm:inline">
                  {profile.email} · {profile.role}
                </span>
                <form action="/auth/signout" method="post">
                  <button className="text-stone-500 underline">Sign out</button>
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
