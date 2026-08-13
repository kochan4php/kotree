import type { Eip1193Provider } from 'ethers';
import { toast } from 'sonner';

type EthereumWindow = { ethereum?: Eip1193Provider };

const getEthereum = () => (window as unknown as EthereumWindow).ethereum;

export async function connectWallet(onConnected: () => void, onConnecting: (v: boolean) => void) {
  const ethereum = getEthereum();
  if (!ethereum) {
    toast.error('Web3 Wallet not found! Install MetaMask or Phantom.');
    return;
  }

  try {
    onConnecting(true);
    // Load the ~380KB ethers bundle only when the user actually wants to connect
    const { BrowserProvider } = await import('ethers');
    // Request account access
    const provider = new BrowserProvider(ethereum);
    await provider.send('eth_requestAccounts', []);
    onConnected();
    toast.success('Wallet Connected!');
  } catch (error) {
    console.error(error);
    toast.error('Failed to connect wallet');
  } finally {
    onConnecting(false);
  }
}

export async function sendTip() {
  try {
    const { BrowserProvider, parseEther } = await import('ethers');
    const provider = new BrowserProvider(getEthereum() as Eip1193Provider);
    const signer = await provider.getSigner();

    toast.info('Please confirm transaction in your wallet...');

    const tx = await signer.sendTransaction({
      to: '0x000000000000000000000000000000000000dEaD', // Burn address as joke/placeholder
      value: parseEther('0.001'),
    });

    toast.success('Transaction sent! Waiting for confirmation...');
    await tx.wait();
    toast.success('Thank you for the tip! 🚀 (Tx Confirmed)');
  } catch (error) {
    console.error(error);
    if ((error as { code?: string }).code === 'ACTION_REJECTED') {
      toast.error('Transaction cancelled');
    } else {
      toast.error('Transaction failed');
    }
  }
}
