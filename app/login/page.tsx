"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("technician");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { role } } });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (mode === "up" && !data.session) return setMessage("Check your email to confirm, then log in.");
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-8 max-w-sm space-y-4">
      <h1 className="text-2xl">{mode === "in" ? "Staff login" : "Create a staff account"}</h1>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {mode === "up" && (
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="technician">Technician (runs the device)</option>
            <option value="expert">Expert (reviews unknown results)</option>
            <option value="brand">Brand (registers lots, prints labels)</option>
          </select>
        </div>
      )}
      {message && <p className="text-sm text-synthetic">{message}</p>}
      <button className="btn w-full" disabled={busy}>
        {busy ? "Please wait…" : mode === "in" ? "Log in" : "Sign up"}
      </button>
      <button type="button" className="w-full text-sm text-plum/60 underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "New here? Create an account" : "Have an account? Log in"}
      </button>
    </form>
  );
}
