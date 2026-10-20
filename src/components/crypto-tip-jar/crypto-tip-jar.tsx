'use client';

import { useState } from 'react';
import { Bitcoin, Wallet, CreditCard, Check, Copy } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Card } from '@/components/ui/card';
import { useSensory } from '@/hooks/use-sensory';
import { connectWallet, sendTip } from './actions';

// Same card surface and button geometry as every other tile; only the fills
// keep this tile's own palette.
const BUTTON =
  'flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-foreground px-3 py-2 text-xs font-bold text-[#14110f] shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer';

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
    <Card className="fluid-glass cv-auto bg-[#e2d4ff]! h-full gap-1 p-4 text-center text-[#14110f]">
      <div className="liquid-gradient opacity-50 saturate-150"></div>
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <h2 className="mb-1 flex items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wider">
          <Wallet className="w-4 h-4" aria-hidden="true" /> Web3
        </h2>
        <p className="mb-3 px-1 text-xs font-medium leading-snug text-[#5f5147]">
          Connect wallet to send crypto tips.
        </p>
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
            className={`${BUTTON} bg-[#b39dfb] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CreditCard className="w-4 h-4" aria-hidden="true" /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="w-full space-y-2">
            {address && (
              <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-bold text-[#5f5147]">
                <span>
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy wallet address"
                  className="cursor-pointer rounded p-1 transition-colors hover:bg-white/50"
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
              className={`${BUTTON} bg-[#ffd93d]`}
            >
              <Bitcoin className="w-4 h-4" aria-hidden="true" />
              Tip 0.001 ETH
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
