'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Coordinates for Monas, Jakarta
const TARGET_LAT = -6.175392;
const TARGET_LNG = 106.827153;
const ALLOWED_RADIUS = 100; // meters

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

export default function GeoLockedQuest() {
  const [distance, setDistance] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const dist = getDistanceFromLatLonInM(
          position.coords.latitude,
          position.coords.longitude,
          TARGET_LAT,
          TARGET_LNG
        );
        setDistance(dist);
        if (dist <= ALLOWED_RADIUS && !unlocked) {
          setUnlocked(true);
          toast.success("QUEST UNLOCKED! Welcome to Monas.");
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [unlocked]);

  return (
    <div className="w-full mt-4 p-4 border border-dashed border-destructive/50 rounded-lg bg-destructive/10 text-center relative overflow-hidden group">
      <h3 className="font-bold text-destructive mb-2">🔒 GEO-LOCKED QUEST</h3>
      {distance === null ? (
        <p className="text-xs text-muted-foreground">Mencari sinyal GPS...</p>
      ) : unlocked ? (
        <a href="https://github.com/kochan4php/kotree" target="_blank" rel="noreferrer" className="block p-2 bg-destructive text-destructive-foreground font-bold rounded animate-pulse">
          ENTER THE SANCTUARY
        </a>
      ) : (
        <>
          <p className="text-xs mb-1">Jarakmu dari Monas:</p>
          <p className="font-mono text-xl text-destructive font-bold">{distance.toFixed(0)} meter</p>
          <p className="text-xs mt-2 text-muted-foreground">Kamu harus berada di bawah {ALLOWED_RADIUS} meter untuk membuka link ini.</p>
        </>
      )}
    </div>
  );
}
