import Link from "next/link";
import { Truck, MapPin, Users, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Truck className="h-6 w-6 text-blue-600" />
            Fleet Dispatch
          </div>
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-blue-600">
            Logistics-tech portfolio · DitchApp extension
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Fleet dispatch &amp; live route tracking for Alberta
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Three-role platform for dispatchers, drivers, and customers — smart
            job assignment, OSRM route optimization, live map simulation, and
            status timelines built for tow &amp; delivery operations.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Launch demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Role-based access",
              desc: "Dispatcher, driver, and customer portals with dedicated workflows.",
            },
            {
              icon: MapPin,
              title: "Live fleet map",
              desc: "Interpolated vehicle movement along OSRM-optimized routes.",
            },
            {
              icon: Truck,
              title: "Smart assignment",
              desc: "Proximity + load scoring to suggest the best available driver.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <Icon className="h-8 w-8 text-blue-600" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
