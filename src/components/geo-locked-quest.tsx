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

  const handleCheckLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error("GPS tidak didukung di browser ini.");
      return;
    }

    toast.info("Meminta izin GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const dist = getDistanceFromLatLonInM(
          position.coords.latitude,
          position.coords.longitude,
          TARGET_LAT,
          TARGET_LNG
        );
        setDistance(dist);
        if (dist <= ALLOWED_RADIUS) {
          setUnlocked(true);
          toast.success("QUEST UNLOCKED! Welcome to Monas.");
        } else {
          toast.error("Gagal! Kamu masih terlalu jauh dari target.");
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        toast.error(`Akses GPS ditolak atau gagal: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="w-full mt-12 mb-8 p-4 border border-dashed border-destructive/50 rounded-lg bg-destructive/10 text-center relative overflow-hidden group">
      <h3 className="font-bold text-destructive mb-2">🔒 GEO-LOCKED QUEST</h3>
      {distance === null ? (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-xs text-muted-foreground">Verifikasi lokasi fisikmu untuk membuka link rahasia.</p>
          <button 
            onClick={handleCheckLocation}
            className="px-4 py-2 bg-destructive text-destructive-foreground font-bold rounded hover:opacity-90 transition-opacity"
          >
            Cek Lokasi GPS
          </button>
        </div>
      ) : unlocked ? (
        <a href="https://github.com/kochan4php/kotree" target="_blank" rel="noreferrer" className="block p-2 bg-destructive text-destructive-foreground font-bold rounded animate-pulse mt-4">
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
