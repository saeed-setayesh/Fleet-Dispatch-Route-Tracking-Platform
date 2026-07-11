"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Truck, Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

const DEMO_ACCOUNTS = [
  { email: "dispatch@fleet.local", role: "Dispatcher" },
  { email: "driver1@fleet.local", role: "Driver" },
  { email: "customer1@fleet.local", role: "Customer" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("dispatch@fleet.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;
    const dest =
      role === "dispatcher"
        ? "/dispatcher"
        : role === "driver"
          ? "/driver"
          : role === "customer"
            ? "/customer"
            : callbackUrl;

    router.push(dest);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 shadow-xl shadow-red-500/35">
            <Truck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Fleet Dispatch
            <span className="block gradient-text">Alberta Ops</span>
          </h1>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Real-time tow & delivery dispatch across Calgary. OSRM road routing,
            smart driver assignment, and live fleet tracking.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: MapPin, text: "Road-following OSRM navigation" },
              { icon: Shield, text: "Role-based dispatcher / driver / customer" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-400">
                <Icon className="h-4 w-4 text-red-400" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <Card glow className="!p-8">
          <CardTitle subtitle="Demo password: demo1234">Sign in</CardTitle>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Enter Command Center"}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Quick demo
            </p>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => setEmail(a.email)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-left text-sm transition hover:border-red-500/40 hover:bg-red-950/20"
              >
                <span className="text-slate-300">{a.email}</span>
                <span className="text-xs text-slate-500">{a.role}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
