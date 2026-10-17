'use client';

import { useState } from 'react';
import { Bitcoin, Wallet, CreditCard } from 'lucide-react';
import { useSensory } from '@/hooks/use-sensory';
import { connectWallet, sendTip } from './actions';

export default function CryptoTipJar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { playFeedback } = useSensory();

  return (
    <div
      className="fluid-glass bg-[#e2d4ff]! w-full h-full p-4 text-foreground rounded-lg text-center relative flex flex-col justify-center items-center"
    >
      <div className="liquid-gradient opacity-50 saturate-150"></div>
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
        <h2 className="font-bold text-sm text-foreground mb-1 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <Wallet className="w-4 h-4" /> Web3
        </h2>
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-1">
          <p className="text-xs font-medium text-muted-foreground mb-3 px-1 leading-snug">Connect wallet to send crypto tips.</p>
          <div className="w-full space-y-2 mt-auto">
            {!isConnected ? (
              <button
                onClick={() => {
                  playFeedback();
                  connectWallet(() => setIsConnected(true), setIsConnecting);
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-[#b39dfb] border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11"
              >
                <CreditCard className="w-4 h-4" /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <button
                onClick={() => {
                  playFeedback();
                  sendTip();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-[#ffd93d] border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11"
              >
                <Bitcoin className="w-4 h-4" />
                Tip 0.001 ETH
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
