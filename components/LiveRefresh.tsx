"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Listens for new rows in the given tables and reloads the page's data when one arrives.
export default function LiveRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("live");
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh());
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, tables]);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-plum/60">
      <span className="h-2 w-2 animate-pulse rounded-full bg-gold" /> live
    </span>
  );
}
