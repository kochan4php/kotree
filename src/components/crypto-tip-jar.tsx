'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { Bitcoin, Wallet } from 'lucide-react';
import { useSensory } from '@/hooks/use-sensory';

export default function CryptoTipJar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { playFeedback } = useSensory();

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
    <div className="w-full h-full p-4 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-100 rounded-lg text-center flex flex-col items-center justify-center">
      <h3 className="font-bold text-sm text-purple-700 dark:text-purple-300 mb-1 flex items-center justify-center gap-1 uppercase tracking-wider">
        <Wallet className="w-3.5 h-3.5" /> Web3
      </h3>
      <div className="flex flex-col items-center justify-center flex-1 w-full mt-2">
        <p className="text-[10px] text-purple-600 dark:text-purple-400 mb-3 px-2 leading-tight">Connect wallet to send crypto tips.</p>
        {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-300 dark:hover:bg-purple-800 transition-colors cursor-pointer"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <button
          onClick={handleTip}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-900 transition-colors cursor-pointer"
        >
          <Bitcoin className="w-4 h-4" />
          Tip 0.001 ETH
        </button>
      )}
      </div>
    </div>
  );
}
