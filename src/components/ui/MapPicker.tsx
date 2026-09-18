"use client";
/**
 * MapPicker — Interactive Map Picker with Google Maps Tiles,
 * Location Search Autocomplete, Satellite View Switcher, and GPS Geolocation.
 */
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

interface Props {
  lat: string;
  lng: string;
  onChange?: (lat: string, lng: string) => void;
  onSelectAddress?: (address: string) => void;
  readOnly?: boolean;
  height?: number | string;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

const DEFAULT_LAT = -6.2615;
const DEFAULT_LNG = 106.8106;

// Google Maps Tile URLs (Roadmap & Hybrid Satellite)
const TILE_LAYERS = {
  googleRoad: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  googleSat: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

export default function MapPicker({
  lat,
  lng,
  onChange,
  onSelectAddress,
  readOnly,
  height = 300,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);

  const [mapType, setMapType] = useState<"road" | "satellite">("road");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);

  const parsedLat = parseFloat(lat) || DEFAULT_LAT;
  const parsedLng = parseFloat(lng) || DEFAULT_LNG;
  const hasValue = lat !== "" && lng !== "" && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy any existing Leaflet instance on this container before creating a new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = containerRef.current as any;
    if (container._leaflet_id) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
      delete container._leaflet_id;
    }

    let destroyed = false;

    import("leaflet").then((L) => {
      if (destroyed || !containerRef.current) return;

      // Fix default icon paths broken by bundler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [parsedLat, parsedLng],
        zoom: hasValue ? 16 : 13,
        zoomControl: true,
        attributionControl: false,
      });

      const tileUrl = mapType === "satellite" ? TILE_LAYERS.googleSat : TILE_LAYERS.googleRoad;
      const tile = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
      tileLayerRef.current = tile;

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
        tileLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Map Tile Layer when mapType changes
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }
      const tileUrl = mapType === "satellite" ? TILE_LAYERS.googleSat : TILE_LAYERS.googleRoad;
      const tile = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(mapRef.current);
      tileLayerRef.current = tile;
    });
  }, [mapType]);

  // Sync marker/view when lat/lng props change from outside
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

  // Debounced Place Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            "Accept-Language": "id,en",
          },
        });
        if (res.ok) {
          const data = (await res.json()) as SearchResult[];
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.warn("Geocoding search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select Place from Dropdown
  const handleSelectPlace = (result: SearchResult) => {
    const chosenLat = parseFloat(result.lat).toFixed(6);
    const chosenLng = parseFloat(result.lon).toFixed(6);
    setShowDropdown(false);
    setSearchQuery(result.display_name);

    if (mapRef.current) {
      mapRef.current.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 17, {
        duration: 1.2,
      });

      import("leaflet").then((L) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([parseFloat(result.lat), parseFloat(result.lon)]);
        } else {
          const m = L.marker([parseFloat(result.lat), parseFloat(result.lon)], {
            draggable: !readOnly,
          }).addTo(mapRef.current);
          markerRef.current = m;
          if (!readOnly) {
            m.on("dragend", () => {
              const pos = m.getLatLng();
              onChange?.(pos.lat.toFixed(6), pos.lng.toFixed(6));
            });
          }
        }
      });
    }

    onChange?.(chosenLat, chosenLng);
    onSelectAddress?.(result.display_name);
  };

  // GPS Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userLat = pos.coords.latitude.toFixed(6);
        const userLng = pos.coords.longitude.toFixed(6);

        if (mapRef.current) {
          mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 17);
          import("leaflet").then((L) => {
            if (markerRef.current) {
              markerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude]);
            } else {
              const m = L.marker([pos.coords.latitude, pos.coords.longitude], {
                draggable: !readOnly,
              }).addTo(mapRef.current);
              markerRef.current = m;
              if (!readOnly) {
                m.on("dragend", () => {
                  const p = m.getLatLng();
                  onChange?.(p.lat.toFixed(6), p.lng.toFixed(6));
                });
              }
            }
          });
        }

        onChange?.(userLat, userLng);
      },
      (err) => {
        setLocating(false);
        console.warn("Geolocation error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-line bg-white shadow-xs space-y-0">
      <style>{`.leaflet-container { font-family: inherit; z-index: 1; }`}</style>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />

      {/* Top Search & Controls Bar */}
      {!readOnly && (
        <div className="p-2.5 bg-paper-tint border-b border-line flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative z-10">
          {/* Location Search Input */}
          <div className="relative flex-1">
            <div className="relative">
              <Icon
                name="search"
                className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!showDropdown && e.target.value.length >= 3) setShowDropdown(true);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder={"Search place, pool, or street..."}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-line bg-white text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-line rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-line">
                  {searching ? (
                    <div className="p-3 text-xs text-ink-mute text-center">
                      {"Searching locations..."}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-xs text-ink-mute text-center">
                      {"No locations found"}
                    </div>
                  ) : (
                    searchResults.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSelectPlace(res)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-ocean-50 transition-colors flex items-start gap-2 group"
                      >
                        <Icon
                          name="pin"
                          className="w-3.5 h-3.5 text-ocean-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-ink font-medium leading-relaxed truncate">
                          {res.display_name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Buttons: GPS and Layer Switcher */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              title={"Use My GPS Location"}
              className="px-2.5 py-1.5 rounded-xl border border-line bg-white hover:bg-paper-deep text-xs font-semibold text-ink-soft flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Icon
                name="navigation"
                className={`w-3.5 h-3.5 text-ocean-600 ${locating ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {locating ? "Detecting location..." : "Use My GPS Location"}
              </span>
            </button>

            {/* Map Type Switcher */}
            <div className="flex rounded-xl border border-line bg-white p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setMapType("road")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  mapType === "road"
                    ? "bg-ocean-700 text-white shadow-xs"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {"Map (Google)"}
              </button>
              <button
                type="button"
                onClick={() => setMapType("satellite")}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  mapType === "satellite"
                    ? "bg-ocean-700 text-white shadow-xs"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {"Satellite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative">
        <div ref={containerRef} style={{ height, width: "100%" }} />
      </div>

      {/* Bottom Information Footer */}
      <div className="px-3 py-2 bg-paper-tint border-t border-line text-[11px] text-ink-mute flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Icon name="pin" className="w-3.5 h-3.5 text-ocean-600 shrink-0" />
          <span>{"Click the map to pin a location, or drag the marker. Coordinates fill in automatically below."}</span>
        </div>
        {hasValue && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-ink-soft font-semibold">
              {parsedLat.toFixed(5)}, {parsedLng.toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${parsedLat},${parsedLng}`}
              target="_blank"
              rel="noreferrer"
              className="text-ocean-600 hover:underline flex items-center gap-1 font-sans font-semibold"
            >
              <Icon name="link" className="w-3 h-3" />
              {"Open in Google Maps"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
