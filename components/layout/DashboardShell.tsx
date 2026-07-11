"use client";

import { signOut } from "next-auth/react";
import { Truck, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DashboardShellProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  badge,
  actions,
  children,
}: DashboardShellProps) {
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-20 border-b border-red-950/50 bg-[#0a0808]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-700 shadow-lg shadow-red-500/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">{title}</h1>
                {badge && <span className="stat-chip">{badge}</span>}
              </div>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
