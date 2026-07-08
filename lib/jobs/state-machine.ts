import type { JobStatus } from "@/lib/db/schema";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  requested: "Requested",
  assigned: "Assigned",
  en_route: "En Route",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  requested: ["assigned", "cancelled"],
  assigned: ["en_route", "cancelled"],
  en_route: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(status: JobStatus): JobStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function getDriverAction(status: JobStatus): JobStatus | null {
  switch (status) {
    case "assigned":
      return "en_route";
    case "en_route":
      return "in_progress";
    case "in_progress":
      return "completed";
    default:
      return null;
  }
}

export function getDriverActionLabel(status: JobStatus): string | null {
  const next = getDriverAction(status);
  if (!next) return null;
  return JOB_STATUS_LABELS[next];
}
