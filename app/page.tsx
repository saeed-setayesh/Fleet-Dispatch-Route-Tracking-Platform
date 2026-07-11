import Link from "next/link";
import { Truck, MapPin, Users, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <header className="border-b border-red-950/50 bg-[#0a0808]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-700 shadow-lg shadow-red-500/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Fleet Dispatch</span>
          </div>
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-3xl">
          <p className="stat-chip inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Alberta logistics-tech portfolio
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Dispatch smarter.
            <span className="block gradient-text">Route on real roads.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400 leading-relaxed">
            Full-stack fleet platform for tow & delivery — OSRM turn-by-turn routing,
            live vehicle simulation, smart driver scoring, and customer tracking.
          </p>
          <Link href="/login" className="mt-10 inline-block">
            <Button size="lg">
              Launch demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Three roles",
              desc: "Dispatcher command center, mobile driver nav, customer live track.",
              color: "text-red-400",
            },
            {
              icon: MapPin,
              title: "OSRM routing",
              desc: "Road-following polylines — not straight lines. Live progress split.",
              color: "text-rose-400",
            },
            {
              icon: Truck,
              title: "Smart assign",
              desc: "Proximity + load scoring picks the best available driver.",
              color: "text-red-300",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <Card key={title} className="hover:border-red-500/25 transition-colors">
              <Icon className={`h-8 w-8 ${color}`} />
              <CardTitle className="!mb-0 mt-3">{title}</CardTitle>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
