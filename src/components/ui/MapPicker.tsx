"use client";
/**
 * MapPicker — interactive Leaflet map for picking a lat/lng coordinate.
 * Uses OpenStreetMap tiles (free, no API key needed).
 */
import { useEffect, useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";

interface Props {
  lat: string;
  lng: string;
  onChange?: (lat: string, lng: string) => void;
  readOnly?: boolean;
}

const DEFAULT_LAT = -6.2615;
const DEFAULT_LNG = 106.8106;

export default function MapPicker({ lat, lng, onChange, readOnly }: Props) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const parsedLat = parseFloat(lat) || DEFAULT_LAT;
  const parsedLng = parseFloat(lng) || DEFAULT_LNG;
  const hasValue = lat !== "" && lng !== "" && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy any existing Leaflet instance on this container before creating a new one
    // (handles React Strict Mode double-invoke and tab re-mount)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = containerRef.current as any;
    if (container._leaflet_id) {
      // Container already has a Leaflet instance attached — clean it up first
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      // Force-clear the leaflet id so L.map() can reinitialize
      delete container._leaflet_id;
    }

    let destroyed = false;

    import("leaflet").then((L) => {
      if (destroyed || !containerRef.current) return;

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [parsedLat, parsedLng],
        zoom: hasValue ? 16 : 12,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (hasValue) {
        const marker = L.marker([parsedLat, parsedLng], { draggable: !readOnly }).addTo(map);
        markerRef.current = marker;
        if (!readOnly) {
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onChange?.(pos.lat.toFixed(6), pos.lng.toFixed(6));
          });
        }
      }

      if (!readOnly) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([clickLat, clickLng]);
          } else {
            const m = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
            markerRef.current = m;
            m.on("dragend", () => {
              const pos = m.getLatLng();
              onChange?.(pos.lat.toFixed(6), pos.lng.toFixed(6));
            });
          }
          onChange?.(clickLat.toFixed(6), clickLng.toFixed(6));
        });
      }

      mapRef.current = map;
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker/view when lat/lng props change (user types in input)
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      const newLat = parseFloat(lat);
      const newLng = parseFloat(lng);
      if (isNaN(newLat) || isNaN(newLng)) return;

      mapRef.current.setView([newLat, newLng], mapRef.current.getZoom());

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        const m = L.marker([newLat, newLng], { draggable: !readOnly }).addTo(mapRef.current);
        markerRef.current = m;
        if (!readOnly) {
          m.on("dragend", () => {
            const pos = m.getLatLng();
            onChange?.(pos.lat.toFixed(6), pos.lng.toFixed(6));
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className="rounded-xl overflow-hidden border border-line">
      <style>{`.leaflet-container { font-family: inherit; }`}</style>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={containerRef} style={{ height: 260, width: "100%" }} />
      {!readOnly && (
        <div className="px-3 py-2 bg-paper-tint text-[11px] text-ink-mute flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("common.mapPicker.hint")}
        </div>
      )}
    </div>
  );
}
