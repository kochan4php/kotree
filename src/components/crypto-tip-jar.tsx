'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { Bitcoin, Wallet } from 'lucide-react';
import { useSensory } from '@/hooks/use-sensory';
import { useI18n } from '@/contexts/i18n-context';

export default function CryptoTipJar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { playFeedback } = useSensory();
  const { t } = useI18n();

  const handleConnect = async () => {
    playFeedback();
    
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast.error('Web3 Wallet not found! Install MetaMask or Phantom.');
      return;
    }

    try {
      setIsConnecting(true);
      // Request account access
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send('eth_requestAccounts', []);
      setIsConnected(true);
      toast.success('Wallet Connected!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTip = async () => {
    playFeedback();
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      toast.info('Please confirm transaction in your wallet...');
      
      const tx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dEaD', // Burn address as joke/placeholder
        value: ethers.parseEther('0.001')
      });
      
      toast.success('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      toast.success('Thank you for the tip! 🚀 (Tx Confirmed)');
      
    } catch (error: any) {
      console.error(error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Transaction failed');
      }
    }
  };

  return (
    <div className="w-full flex items-center justify-center mb-6">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-all active:scale-95"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Web3 Wallet'}
        </button>
      ) : (
        <button
          onClick={handleTip}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all active:scale-95"
        >
          <Bitcoin className="w-4 h-4" />
          Send 0.001 ETH Tip
        </button>
      )}
    </div>
  );
}
