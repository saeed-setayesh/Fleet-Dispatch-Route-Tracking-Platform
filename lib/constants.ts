export const CALGARY_LOCATIONS = [
  {
    label: "Calgary Downtown Tower",
    address: "101 9 Ave SW, Calgary, AB",
    lat: 51.0447,
    lng: -114.0719,
  },
  {
    label: "Calgary International Airport (YYC)",
    address: "2000 Airport Rd NE, Calgary, AB",
    lat: 51.1215,
    lng: -114.0076,
  },
  {
    label: "Stampede Park",
    address: "1410 Olympic Way SE, Calgary, AB",
    lat: 51.0374,
    lng: -114.0519,
  },
  {
    label: "Banff Trailhead",
    address: "224 Banff Ave, Banff, AB",
    lat: 51.1784,
    lng: -115.5708,
  },
  {
    label: "Red Deer City Centre",
    address: "4911 51 St, Red Deer, AB",
    lat: 52.2681,
    lng: -113.8112,
  },
  {
    label: "Edmonton South",
    address: "4825 Gateway Blvd, Edmonton, AB",
    lat: 53.4634,
    lng: -113.4919,
  },
  {
    label: "NE Calgary — Marlborough",
    address: "3800 Memorial Dr NE, Calgary, AB",
    lat: 51.058,
    lng: -113.982,
  },
  {
    label: "SW Calgary — Signal Hill",
    address: "5700 Signal Hill Centre SW, Calgary, AB",
    lat: 51.012,
    lng: -114.165,
  },
] as const;

export const JOB_STATUS_COLORS: Record<string, string> = {
  requested: "bg-slate-500",
  assigned: "bg-blue-500",
  en_route: "bg-amber-500",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
