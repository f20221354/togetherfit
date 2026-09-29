"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Circle, CircleMarker, Map as LeafletMap } from "leaflet";
import { coarsen } from "@/lib/network/geo";

export interface AreaPoint {
  lat: number;
  lng: number;
  label: string;
}

type LeafletModule = typeof import("leaflet");

const INDIA_CENTER: [number, number] = [20.59, 78.96];

/**
 * Pick a target area on an OpenStreetMap map (free tiles, no API key).
 * Every point — tap, search result or "use my location" — is rounded to a
 * ~500 m grid before it's handed to the parent, so exact coordinates never
 * leave this component.
 */
export function AreaPicker({
  value,
  radiusKm,
  onChange,
}: {
  value: AreaPoint | null;
  radiusKm: number;
  onChange: (point: AreaPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const dotRef = useRef<CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaPoint[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: LeafletModule }).default ?? mod) as LeafletModule;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current).setView(INDIA_CENTER, 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (e) => {
        const point = coarsen(e.latlng.lat, e.latlng.lng);
        onChangeRef.current({ ...point, label: "Pinned area" });
      });
      mapRef.current = map;
      setReady(true);
    }
    init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    circleRef.current?.remove();
    dotRef.current?.remove();
    if (!value) return;
    const circle = L.circle([value.lat, value.lng], {
      radius: radiusKm * 1000,
      color: "#34d399",
      weight: 2,
      fillOpacity: 0.12,
    }).addTo(map);
    dotRef.current = L.circleMarker([value.lat, value.lng], {
      radius: 6,
      color: "#34d399",
      fillColor: "#34d399",
      fillOpacity: 1,
    }).addTo(map);
    circleRef.current = circle;
    map.fitBounds(circle.getBounds(), { padding: [20, 20] });
  }, [ready, value, radiusKm]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (searching || query.trim().length < 3) return; // the disabled button doubles as the debounce
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.error ?? "Search failed");
        setResults([]);
      } else {
        setResults(data.results);
        if (data.results.length === 0) setMessage("No places found — try a nearby landmark or tap the map.");
      }
    } catch {
      setMessage("Search is unavailable — tap the map instead.");
    } finally {
      setSearching(false);
    }
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setMessage("Location isn't available in this browser — search or tap the map instead.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const point = coarsen(pos.coords.latitude, pos.coords.longitude);
        onChange({ ...point, label: "Near you" });
      },
      (err) => {
        setLocating(false);
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied — search for a place or tap the map instead."
            : "Couldn't get your location — search for a place or tap the map instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
        📍 We only use your location to centre the map. It&apos;s rounded to about 500 m, and your exact position is
        never stored or shown to anyone.
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="mt-2 block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {locating ? "Finding you…" : "Use my location"}
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place, e.g. Lodhi Garden, Delhi"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={searching || query.trim().length < 3}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((r) => (
            <button
              key={`${r.lat},${r.lng},${r.label}`}
              type="button"
              onClick={() => {
                onChange(r);
                setResults([]);
              }}
              className="truncate rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-surface-2"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {message && <p className="text-xs text-muted">{message}</p>}

      <div ref={containerRef} className="isolate z-0 h-72 w-full overflow-hidden rounded-2xl border border-border" />
      <p className="text-xs text-muted">
        {value ? `Selected: ${value.label} · ${radiusKm} km radius` : "Tap the map to pin the area you want to meet in."}
      </p>
    </div>
  );
}
