"use client";

import { JOB_STATUS_LABELS } from "@/lib/jobs/state-machine";
import { formatRelativeTime } from "@/lib/constants";
import type { JobStatus } from "@/lib/db/schema";

interface TimelineEvent {
  id: string;
  fromStatus: JobStatus | string | null;
  toStatus: JobStatus | string;
  note: string | null;
  createdAt: Date | string;
  actorName: string | null;
}

const STATUS_DOT: Record<string, string> = {
  requested: "bg-slate-400",
  assigned: "bg-red-500",
  en_route: "bg-rose-500",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">No status updates yet.</p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-6 border-l border-slate-700/80">
      {events.map((event) => {
        const date = new Date(event.createdAt);
        return (
          <li key={event.id} className="ml-6">
            <span
              className={`absolute -left-1.5 flex h-3 w-3 rounded-full ring-4 ring-[#0f1629] ${STATUS_DOT[event.toStatus] ?? "bg-slate-400"}`}
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-slate-200">
                {JOB_STATUS_LABELS[event.toStatus as JobStatus] ?? event.toStatus}
              </span>
              {event.note && (
                <span className="text-sm text-slate-400">{event.note}</span>
              )}
              <span className="text-xs text-slate-500">
                {formatRelativeTime(date)} · {date.toLocaleString()}
                {event.actorName && ` · ${event.actorName}`}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
