'use client';

import { useState } from 'react';
import { Bitcoin, Wallet, CreditCard, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';
import { connectWallet, sendTip } from './actions';

export default function CryptoTipJar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const { playFeedback } = useSensory();

  const copyAddress = async () => {
    playFeedback();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Wallet address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the address');
    }
  };

  return (
    <div
      className="fluid-glass bg-[#e2d4ff]! w-full h-full p-4 text-[#14110f] rounded-lg text-center relative flex flex-col justify-center items-center"
    >
      <div className="liquid-gradient opacity-50 saturate-150"></div>
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
        <h2 className="font-bold text-sm text-[#14110f] mb-1 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <Wallet className="w-4 h-4" /> Web3
        </h2>
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-1">
          <p className="text-xs font-medium text-[#5f5147] mb-3 px-1 leading-snug">Connect wallet to send crypto tips.</p>
          <div className="w-full space-y-2 mt-auto">
            {!isConnected ? (
              <button
                onClick={() => {
                  playFeedback();
                  connectWallet((addr) => {
                    setAddress(addr);
                    setIsConnected(true);
                  }, setIsConnecting);
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-[#b39dfb] border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11"
              >
                <CreditCard className="w-4 h-4" /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <>
                {address && (
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-[#5f5147]">
                    <span>
                      {address.slice(0, 6)}…{address.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={copyAddress}
                      aria-label="Copy wallet address"
                      className="p-1 rounded cursor-pointer hover:bg-white/50 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
