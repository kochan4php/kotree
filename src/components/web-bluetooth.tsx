'use client';

import { Bluetooth } from 'lucide-react';
import { toast } from 'sonner';

export default function WebBluetooth() {
  const handleBluetooth = async () => {
    try {
      if (!(navigator as any).bluetooth) {
        toast.error('Web Bluetooth API not supported on this device/browser');
        return;
      }
      toast.info('Scanning for nearby BLE devices...');
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true
      });
      toast.success(`Connected to: ${device.name || 'Unknown Device'}`);
      
      // We don't actually do anything malicious, just show we can connect
      toast.message('Sending "Hire Me" signal to device... (Just kidding!)');
      
    } catch (error: any) {
      console.error(error);
      if (error.name === 'NotFoundError') {
        toast.error('Bluetooth scanning cancelled');
      } else {
        toast.error('Failed to connect to Bluetooth');
      }
    }
  };

  return (
    <button
      onClick={handleBluetooth}
      className="fixed bottom-[136px] right-6 z-50 p-3 rounded-full shadow-lg bg-accent text-accent-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer"
      title="Connect nearby Bluetooth Device"
    >
      <Bluetooth className="w-6 h-6" />
    </button>
  );
}
