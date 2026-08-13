import { toast } from 'sonner';

// Coordinates for Monas, Jakarta
export const TARGET_LAT = -6.175392;
export const TARGET_LNG = 106.827153;
export const ALLOWED_RADIUS = 100; // meters

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface QuestCallbacks {
  onDistance: (distance: number) => void;
  onUnlocked: () => void;
}

export function checkDistance(lat: number, lon: number, { onDistance, onUnlocked }: QuestCallbacks) {
  const dist = getDistanceFromLatLonInM(lat, lon, TARGET_LAT, TARGET_LNG);
  onDistance(dist);
  if (dist <= ALLOWED_RADIUS) {
    onUnlocked();
    toast.success('QUEST UNLOCKED! Welcome to Monas.');
  } else {
    toast.error(`Failed! You're ${dist.toFixed(0)} meters away from target.`);
  }
}

export async function fallbackToIP(callbacks: QuestCallbacks) {
  toast.info('Trying IP-based location...');
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data && data.latitude && data.longitude) {
      toast.success(`IP location detected: ${data.city}`);
      checkDistance(data.latitude, data.longitude, callbacks);
    } else {
      toast.error('Failed to detect location via IP.');
    }
  } catch {
    toast.error('Failed to reach IP location service.');
  }
}
