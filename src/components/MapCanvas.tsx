'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useJourneyStore } from '@/stores/journeyStore';
import type { Chapter } from '@/types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ---------------------------------------------------------------------------
// Interpolation primitives
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpCoord(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function smoothstep(lo: number, hi: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ---------------------------------------------------------------------------
// Scroll-driven path drawing
// ---------------------------------------------------------------------------

function getPathProgress(scroll: number, chapters: Chapter[]) {
  if (chapters.length < 2) return 0;
  const lo = chapters[0].scrollStart;
  const hi = chapters[chapters.length - 1].scrollEnd;
  if (scroll <= lo) return 0;
  if (scroll >= hi) return 1;
  return (scroll - lo) / (hi - lo);
}

function getDrawnCoordinates(
  coords: [number, number][],
  progress: number,
): [number, number][] {
  if (coords.length < 2) return coords;
  if (progress <= 0) return [coords[0], coords[0]];
  if (progress >= 1) return coords;

  const n = coords.length - 1;
  const pos = progress * n;
  const i = Math.floor(pos);
  const frac = pos - i;

  const pts = coords.slice(0, i + 1);
  if (i < n) pts.push(lerpCoord(coords[i], coords[i + 1], frac));
  return pts;
}

// ---------------------------------------------------------------------------
// Smooth camera interpolation
// ---------------------------------------------------------------------------

function getCameraState(scroll: number, chapters: Chapter[]) {
  const fallback = {
    center: [103.82, 1.35] as [number, number],
    zoom: 2,
    pitch: 0,
    bearing: 0,
  };
  if (!chapters.length) return fallback;

  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  const bearing = scroll * 80;

  // Hero — globe zoom-in toward the first city
  if (scroll < first.scrollStart) {
    const t = smoothstep(0, first.scrollStart, scroll);
    return {
      center: first.coordinates,
      zoom: lerp(2, 4.5, t),
      pitch: lerp(0, 45, t),
      bearing,
    };
  }

  // Conclusion — pull back from last city to globe
  if (scroll >= last.scrollEnd) {
    const t = smoothstep(last.scrollEnd, 1, scroll);
    return {
      center: last.coordinates,
      zoom: lerp(4.5, 1.8, t),
      pitch: lerp(45, 0, t),
      bearing,
    };
  }

  // Midpoints — camera "rests" at each chapter's midpoint scroll value
  const mids = chapters.map((c) => (c.scrollStart + c.scrollEnd) / 2);

  // Arriving at first chapter (before its midpoint)
  if (scroll < mids[0]) {
    const t = smoothstep(first.scrollStart, mids[0], scroll);
    return {
      center: first.coordinates,
      zoom: lerp(3.5, 5, t),
      pitch: lerp(35, 45, t),
      bearing,
    };
  }

  // Departing last chapter (after its midpoint)
  const lastMid = mids[mids.length - 1];
  if (scroll >= lastMid) {
    const t = smoothstep(lastMid, last.scrollEnd, scroll);
    return {
      center: last.coordinates,
      zoom: lerp(5, 4, t),
      pitch: lerp(45, 40, t),
      bearing,
    };
  }

  // Between two chapter midpoints — cinematic arc
  for (let i = 0; i < mids.length - 1; i++) {
    if (scroll >= mids[i] && scroll < mids[i + 1]) {
      const raw = (scroll - mids[i]) / (mids[i + 1] - mids[i]);
      const t = easeInOutCubic(raw);
      const arc = Math.sin(raw * Math.PI); // peaks mid-transition

      return {
        center: lerpCoord(
          chapters[i].coordinates,
          chapters[i + 1].coordinates,
          t,
        ),
        zoom: 5 - arc * 1.5, // zoom out during flight
        pitch: 45 + arc * 8, // tilt forward during flight
        bearing,
      };
    }
  }

  return fallback;
}

// ---------------------------------------------------------------------------
// Marker state
// ---------------------------------------------------------------------------

function getMarkerState(
  i: number,
  activeIdx: number,
  scroll: number,
  lastEnd: number,
): string {
  if (activeIdx >= 0) {
    if (i === activeIdx) return 'active';
    return i < activeIdx ? 'visited' : 'future';
  }
  return scroll >= lastEnd ? 'visited' : 'future';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const pulseRef = useRef(0);

  const scrollProgress = useJourneyStore((s) => s.scrollProgress);
  const chapters = useJourneyStore((s) => s.chapters);

  // ---- Initialise map ----
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [103.82, 1.35],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      interactive: false,
    });

    map.current.on('load', () => {
      const m = map.current;
      if (!m) return;
      m.resize();
      m.setFog({
        color: '#0a0a0f',
        'high-color': '#1a1a2e',
        'horizon-blend': 0.08,
        'star-intensity': 0.15,
        'space-color': '#0a0a0f',
      });
      setMapLoaded(true);
    });

    map.current.on('style.load', () => map.current?.resize());

    return () => {
      cancelAnimationFrame(pulseRef.current);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ---- Set up layers once chapters arrive ----
  useEffect(() => {
    if (!map.current || !mapLoaded || !chapters.length) return;
    const m = map.current;

    // Tear down any previous layers/sources
    [
      'journey-line',
      'journey-line-glow',
      'chapter-markers-pulse',
      'chapter-markers-glow',
      'chapter-markers',
      'trail-head-glow',
      'trail-head',
    ].forEach((id) => {
      if (m.getLayer(id)) m.removeLayer(id);
    });
    ['journey-path', 'chapter-markers', 'trail-head'].forEach((id) => {
      if (m.getSource(id)) m.removeSource(id);
    });

    const origin = chapters[0].coordinates;

    // --- Journey path (animated trail) ---
    m.addSource('journey-path', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [origin, origin] },
      },
    });

    m.addLayer({
      id: 'journey-line-glow',
      type: 'line',
      source: 'journey-path',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#FF9F1C',
        'line-width': 10,
        'line-opacity': 0.12,
        'line-blur': 8,
      },
    });

    m.addLayer({
      id: 'journey-line',
      type: 'line',
      source: 'journey-path',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#FF9F1C',
        'line-width': 2,
        'line-opacity': 0.85,
      },
    });

    // --- Chapter markers ---
    m.addSource('chapter-markers', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: chapters.map((ch, i) => ({
          type: 'Feature' as const,
          properties: { index: i, color: ch.color, state: 'future' },
          geometry: {
            type: 'Point' as const,
            coordinates: ch.coordinates,
          },
        })),
      },
    });

    m.addLayer({
      id: 'chapter-markers-pulse',
      type: 'circle',
      source: 'chapter-markers',
      filter: ['==', ['get', 'state'], 'active'],
      paint: {
        'circle-radius': 25,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.12,
        'circle-blur': 0.7,
      },
    });

    m.addLayer({
      id: 'chapter-markers-glow',
      type: 'circle',
      source: 'chapter-markers',
      filter: [
        'any',
        ['==', ['get', 'state'], 'visited'],
        ['==', ['get', 'state'], 'active'],
      ],
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.25,
        'circle-blur': 0.5,
      },
    });

    m.addLayer({
      id: 'chapter-markers',
      type: 'circle',
      source: 'chapter-markers',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'state'], 'active'],
          5,
          ['==', ['get', 'state'], 'visited'],
          4,
          2.5,
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'state'], 'future'],
          '#ffffff',
          ['get', 'color'],
        ],
        'circle-opacity': [
          'case',
          ['==', ['get', 'state'], 'future'],
          0.15,
          ['==', ['get', 'state'], 'visited'],
          0.75,
          1,
        ],
        'circle-stroke-width': [
          'case',
          ['==', ['get', 'state'], 'active'],
          2,
          0,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.5,
      },
    });

    // --- Trail head (leading dot at the tip of the drawn path) ---
    m.addSource('trail-head', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: origin },
      },
    });

    m.addLayer({
      id: 'trail-head-glow',
      type: 'circle',
      source: 'trail-head',
      paint: {
        'circle-radius': 6,
        'circle-color': '#FF9F1C',
        'circle-opacity': 0,
        'circle-blur': 0.4,
      },
    });

    m.addLayer({
      id: 'trail-head',
      type: 'circle',
      source: 'trail-head',
      paint: {
        'circle-radius': 3,
        'circle-color': '#ffffff',
        'circle-opacity': 0,
      },
    });
  }, [chapters, mapLoaded]);

  // ---- Scroll-driven frame updates ----
  useEffect(() => {
    if (!map.current || !mapLoaded || !chapters.length) return;
    const m = map.current;

    // Camera
    const cam = getCameraState(scrollProgress, chapters);
    m.jumpTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
    });

    // Path
    const progress = getPathProgress(scrollProgress, chapters);
    const allCoords = chapters.map((c) => c.coordinates);
    const pts = getDrawnCoordinates(allCoords, progress);

    const pathSrc = m.getSource('journey-path') as
      | mapboxgl.GeoJSONSource
      | undefined;
    pathSrc?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: pts },
    });

    // Trail head
    const inJourney = scrollProgress >= chapters[0].scrollStart;
    const head = pts[pts.length - 1] ?? chapters[0].coordinates;

    const headSrc = m.getSource('trail-head') as
      | mapboxgl.GeoJSONSource
      | undefined;
    headSrc?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: head },
    });

    if (m.getLayer('trail-head'))
      m.setPaintProperty('trail-head', 'circle-opacity', inJourney ? 1 : 0);
    if (m.getLayer('trail-head-glow'))
      m.setPaintProperty(
        'trail-head-glow',
        'circle-opacity',
        inJourney ? 0.5 : 0,
      );

    // Markers
    const activeIdx = chapters.findIndex(
      (ch) =>
        scrollProgress >= ch.scrollStart && scrollProgress < ch.scrollEnd,
    );
    const lastEnd = chapters[chapters.length - 1].scrollEnd;

    const mkSrc = m.getSource('chapter-markers') as
      | mapboxgl.GeoJSONSource
      | undefined;
    mkSrc?.setData({
      type: 'FeatureCollection',
      features: chapters.map((ch, i) => ({
        type: 'Feature' as const,
        properties: {
          index: i,
          color: ch.color,
          state: getMarkerState(i, activeIdx, scrollProgress, lastEnd),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: ch.coordinates,
        },
      })),
    });
  }, [scrollProgress, chapters, mapLoaded]);

  // ---- Pulse animation (rAF loop) ----
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    let t0 = 0;

    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const s = (ts - t0) / 1000;
      const r = 20 + Math.sin(s * 2.5) * 12;
      const a = Math.max(0, 0.08 + Math.sin(s * 2.5) * 0.06);

      if (m.getLayer('chapter-markers-pulse')) {
        m.setPaintProperty('chapter-markers-pulse', 'circle-radius', r);
        m.setPaintProperty('chapter-markers-pulse', 'circle-opacity', a);
      }
      pulseRef.current = requestAnimationFrame(tick);
    };

    pulseRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pulseRef.current);
  }, [mapLoaded]);

  // ---- Fallback ----
  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#0a0a0f] flex items-center justify-center z-0">
        <div className="text-center text-white/50 px-4">
          <p className="text-base sm:text-lg mb-2">
            Map requires Mapbox token
          </p>
          <p className="text-xs sm:text-sm font-mono">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
