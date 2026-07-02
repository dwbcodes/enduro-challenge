'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '@/lib/polyline';

interface SegmentMapProps {
  polyline: string;
  height?: number;
}

export default function SegmentMap({ polyline, height = 280 }: SegmentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const coords = decodePolyline(polyline);
    if (coords.length === 0) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const line = L.polyline(coords as L.LatLngExpression[], {
      color: '#e8521a',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // Start marker
    L.circleMarker(coords[0] as L.LatLngExpression, {
      radius: 6, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2,
    }).addTo(map);

    // End marker
    L.circleMarker(coords[coords.length - 1] as L.LatLngExpression, {
      radius: 6, color: '#dc3545', fillColor: '#dc3545', fillOpacity: 1, weight: 2,
    }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [20, 20] });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [polyline]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    />
  );
}
