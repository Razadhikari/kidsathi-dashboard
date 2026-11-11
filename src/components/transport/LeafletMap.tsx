"use client";

import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";
import { useEffect, useRef } from "react";
import { KATHMANDU } from "@/lib/transport";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** small HTML shown as the pin, e.g. "1" or "🚌" */
  html: string;
  color?: string;
  tooltip?: string;
  draggable?: boolean;
  big?: boolean;
};

export type MapLine = { points: [number, number][]; color: string; dashed?: boolean };

type Props = {
  markers: MapMarker[];
  lines?: MapLine[];
  /** change this value to re-zoom the map to fit everything (e.g. the selected route id) */
  fitKey?: string;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDrag?: (id: string, lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
};

/** OpenStreetMap + Leaflet. Free, no API key. Leaflet only works in the browser, so it's loaded inside useEffect. */
export default function LeafletMap({ markers, lines = [], fitKey, height = "480px", ...handlers }: Props) {
  const box = useRef<HTMLDivElement | null>(null);
  const lib = useRef<typeof L | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef<string | undefined>(undefined);
  const cb = useRef(handlers);
  cb.current = handlers; // always call the latest handlers

  // Create the map once
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const leaflet = (mod as unknown as { default?: typeof L }).default ?? (mod as unknown as typeof L);
      if (cancelled || !box.current || map.current) return;
      lib.current = leaflet;
      const m = leaflet.map(box.current).setView(KATHMANDU, 13);
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => cb.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
      layer.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      setTimeout(() => m.invalidateSize(), 50); // inside tabs/modals the size is known a moment later
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      fitted.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw pins and lines whenever they change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, lines, fitKey]);

  function draw() {
    const leaflet = lib.current;
    const m = map.current;
    const group = layer.current;
    if (!leaflet || !m || !group) return;
    group.clearLayers();

    for (const line of lines) {
      if (line.points.length < 2) continue;
      leaflet
        .polyline(line.points, { color: line.color, weight: 4, opacity: 0.8, dashArray: line.dashed ? "6 8" : undefined })
        .addTo(group);
    }

    for (const mk of markers) {
      const size = mk.big ? 38 : 28;
      const icon = leaflet.divIcon({
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${mk.color ?? "#1F2A5C"};color:#fff;display:grid;place-items:center;font-weight:800;font-size:${mk.big ? 20 : 13}px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${mk.html}</div>`,
      });
      const marker = leaflet.marker([mk.lat, mk.lng], { icon, draggable: Boolean(mk.draggable) }).addTo(group);
      if (mk.tooltip) marker.bindTooltip(mk.tooltip, { direction: "top", offset: [0, -size / 2] });
      marker.on("click", () => cb.current.onMarkerClick?.(mk.id));
      if (mk.draggable) {
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          cb.current.onMarkerDrag?.(mk.id, p.lat, p.lng);
        });
      }
    }

    // Zoom to fit only when fitKey changes (not on every live update)
    if (fitted.current !== fitKey) {
      const points: [number, number][] = [
        ...markers.map((mk) => [mk.lat, mk.lng] as [number, number]),
        ...lines.flatMap((l) => l.points),
      ];
      if (points.length === 1) m.setView(points[0], 16);
      else if (points.length > 1) m.fitBounds(leaflet.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
      fitted.current = fitKey;
    }
  }

  return <div ref={box} style={{ height }} className="relative isolate z-0 w-full rounded-xl overflow-hidden border border-[#E7E1D6]" />;
}
