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
      className="w-9 h-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-blue-500 hover:bg-blue-500/10 hover:text-blue-400 active:scale-95"
      title="Connect nearby Bluetooth Device"
    >
      <Bluetooth className="w-4 h-4" />
    </button>
  );
}
