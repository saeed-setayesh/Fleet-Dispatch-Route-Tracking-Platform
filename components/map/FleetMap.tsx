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
  kind?: "vehicle" | "pickup" | "dropoff";
}

export interface RouteLine {
  id: string;
  points: { lat: number; lng: number }[];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
}

const CALGARY_CENTER: [number, number] = [51.0447, -114.0719];

function createVehicleIcon(color: string, heading = 0, vehicleType?: string) {
  const isDelivery = vehicleType === "delivery";
  return L.divIcon({
    className: "fleet-marker",
    html: `<div class="vehicle-marker" style="--marker-color:${color};--heading:${heading}deg">
      <div class="vehicle-marker__pulse"></div>
      <div class="vehicle-marker__body">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
          ${
            isDelivery
              ? '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>'
              : '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>'
          }
        </svg>
      </div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createStopIcon(kind: "pickup" | "dropoff", label: string) {
  const color = kind === "pickup" ? "#34d399" : "#f87171";
  const letter = kind === "pickup" ? "P" : "D";
  return L.divIcon({
    className: "fleet-marker",
    html: `<div class="stop-marker" style="--stop-color:${color}">
      <span>${letter}</span>
      <small>${label.slice(0, 12)}</small>
    </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 28],
  });
}

const STATUS_COLORS: Record<string, string> = {
  available: "#34d399",
  busy: "#fbbf24",
  offline: "#64748b",
  default: "#ef4444",
};

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FitRouteBounds({
  routes,
  markers,
}: {
  routes: RouteLine[];
  markers: FleetMarker[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    routes.forEach((r) =>
      r.points.forEach((p) => points.push([p.lat, p.lng]))
    );
    markers.forEach((m) => points.push([m.lat, m.lng]));
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }
  }, [map, routes, markers]);
  return null;
}

interface FleetMapProps {
  markers?: FleetMarker[];
  routes?: RouteLine[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  height?: string;
  fitRoute?: boolean;
  variant?: "dark" | "light";
}

export default function FleetMap({
  markers = [],
  routes = [],
  center = CALGARY_CENTER,
  zoom = 11,
  className,
  height = "400px",
  fitRoute = true,
  variant = "dark",
}: FleetMapProps) {
  const tileUrl =
    variant === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const markerIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return (m: FleetMarker) => {
      if (m.kind === "pickup" || m.kind === "dropoff") {
        const key = `stop-${m.kind}-${m.label}`;
        if (!cache.has(key)) {
          cache.set(key, createStopIcon(m.kind, m.label));
        }
        return cache.get(key)!;
      }
      const key = `${m.status}-${m.vehicleType}-${m.heading ?? 0}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          createVehicleIcon(
            STATUS_COLORS[m.status ?? ""] ?? STATUS_COLORS.default,
            m.heading ?? 0,
            m.vehicleType
          )
        );
      }
      return cache.get(key)!;
    };
  }, []);

  return (
    <div
      className={`map-shell ${className ?? ""}`}
      style={{ height, width: "100%" }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OSM &copy; CARTO'
          url={tileUrl}
        />
        <MapResizeFix />
        {fitRoute && <FitRouteBounds routes={routes} markers={markers} />}
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: route.color ?? "#ef4444",
              weight: route.weight ?? 5,
              opacity: route.opacity ?? 0.9,
              lineCap: "round",
              lineJoin: "round",
              dashArray: route.dashArray,
            }}
          />
        ))}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcons(m)}>
            <Popup className="fleet-popup">
              <strong>{m.label}</strong>
              {m.status && <div className="capitalize">{m.status}</div>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
