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
      toast.error("GPS tidak didukung. Mencoba deteksi IP...");
      fallbackToIP();
      return;
    }

    toast.info("Meminta izin GPS...");
    
    // Set a manual timeout to fallback faster
    const timeoutId = setTimeout(() => {
      fallbackToIP();
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        checkDistance(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.warn('Geolocation error, falling back to IP:', err);
        fallbackToIP();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
    );
  };

  const checkDistance = (lat: number, lon: number) => {
    const dist = getDistanceFromLatLonInM(lat, lon, TARGET_LAT, TARGET_LNG);
    setDistance(dist);
    if (dist <= ALLOWED_RADIUS) {
      setUnlocked(true);
      toast.success("QUEST UNLOCKED! Welcome to Monas.");
    } else {
      toast.error(`Gagal! Jarakmu ${dist.toFixed(0)} meter dari target.`);
    }
  };

  const fallbackToIP = async () => {
    toast.info("Mencoba melacak via alamat IP...");
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        toast.success(`Lokasi IP terdeteksi: ${data.city}`);
        checkDistance(data.latitude, data.longitude);
      } else {
        toast.error("Gagal mendeteksi lokasi via IP.");
      }
    } catch (e) {
      toast.error("Gagal mengakses server lokasi IP.");
    }
  };

  return (
    <div className="w-full h-full p-4 border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100 rounded-lg text-center relative overflow-hidden flex flex-col justify-center items-center">
      <h3 className="font-bold text-sm text-orange-700 dark:text-orange-300 mb-1 flex items-center justify-center gap-1">
        <span className="text-[10px]">📍</span> GEO-QUEST
      </h3>
      {distance === null ? (
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-2">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mb-3 px-2 leading-tight">Verify physical location to unlock.</p>
          <button 
            onClick={handleCheckLocation}
            className="w-full px-3 py-2 bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 font-semibold rounded-xl hover:bg-orange-300 dark:hover:bg-orange-800 transition-colors text-xs cursor-pointer"
          >
            Check GPS
          </button>
        </div>
      ) : unlocked ? (
        <a href="https://github.com/kochan4php/kotree" target="_blank" rel="noreferrer" className="block w-full p-2 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-semibold rounded-xl hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-xs mt-2 cursor-pointer">
          ENTER SANCTUARY
        </a>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-2">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mb-1">Distance to Monas:</p>
          <p className="font-mono text-lg text-orange-800 dark:text-orange-200 font-bold">{distance.toFixed(0)}m</p>
          <p className="text-[9px] mt-1 text-orange-500 dark:text-orange-500">Must be {'<'} {ALLOWED_RADIUS}m</p>
        </div>
      )}
    </div>
  );
}
