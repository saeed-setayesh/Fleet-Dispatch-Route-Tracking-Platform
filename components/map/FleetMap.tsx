"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface FleetMarker {
  id: string;
  lat: number;
  lng: number;
  heading?: number;
  label: string;
  status?: string;
  vehicleType?: string;
}

export interface RouteLine {
  id: string;
  points: { lat: number; lng: number }[];
  color?: string;
}

const CALGARY_CENTER: [number, number] = [51.0447, -114.0719];

function createIcon(color: string, vehicleType?: string) {
  const emoji = vehicleType === "delivery" ? "📦" : "🚛";
  return L.divIcon({
    className: "fleet-marker",
    html: `<div style="
      background:${color};
      width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
      font-size:14px;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981",
  busy: "#f59e0b",
  offline: "#94a3b8",
  default: "#3b82f6",
};

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface FleetMapProps {
  markers?: FleetMarker[];
  routes?: RouteLine[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  height?: string;
}

export default function FleetMap({
  markers = [],
  routes = [],
  center = CALGARY_CENTER,
  zoom = 11,
  className,
  height = "400px",
}: FleetMapProps) {
  const markerIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return (m: FleetMarker) => {
      const key = `${m.status}-${m.vehicleType}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          createIcon(STATUS_COLORS[m.status ?? ""] ?? STATUS_COLORS.default, m.vehicleType)
        );
      }
      return cache.get(key)!;
    };
  }, []);

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix />
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: route.color ?? "#3b82f6", weight: 4, opacity: 0.7 }}
          />
        ))}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={markerIcons(m)}
          >
            <Popup>
              <strong>{m.label}</strong>
              {m.status && <div className="capitalize">{m.status}</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
