'use client';

import { Bluetooth } from 'lucide-react';
import { toast } from '@/lib/toast';
import { discoverSecret } from '@/lib/secrets';

type BluetoothNavigator = {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean }) => Promise<{ name?: string }>;
  };
};

export default function WebBluetooth() {
  const handleBluetooth = async () => {
    discoverSecret('bluetooth');
    try {
      const bluetooth = (navigator as unknown as BluetoothNavigator).bluetooth;
      if (!bluetooth) {
        toast.error('Web Bluetooth API not supported on this device/browser');
        return;
      }
      toast.info('Scanning for nearby BLE devices...');
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true
      });
      toast.success(`Connected to: ${device.name || 'Unknown Device'}`);
      
      // We don't actually do anything malicious, just show we can connect
      toast.message('Sending "Hire Me" signal to device... (Just kidding!)');
      
    } catch (error) {
      console.error(error);
      if ((error as { name?: string }).name === 'NotFoundError') {
        toast.error('Bluetooth scanning cancelled');
      } else {
        toast.error('Failed to connect to Bluetooth');
      }
    }
  };

  return (
    <button
      onClick={handleBluetooth}
      aria-label="Connect Bluetooth device"
      title="Connect nearby Bluetooth Device"
      className="h-9 w-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-blue-600 hover:bg-secondary"
    >
      <Bluetooth className="w-5 h-5" />
    </button>
  );
}
