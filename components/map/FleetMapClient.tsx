"use client";

import dynamic from "next/dynamic";

export const FleetMap = dynamic(() => import("./FleetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl bg-slate-100 text-slate-500">
      Loading map...
    </div>
  ),
});

export type { FleetMarker, RouteLine } from "./FleetMap";
