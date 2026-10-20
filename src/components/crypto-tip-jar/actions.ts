import { toast } from '@/lib/toast';

// Only the two EIP-1193 calls this card needs; importing ethers for them cost
// a ~380 KB lazy chunk and a dependency for a joke tip.
type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type EthereumWindow = { ethereum?: Eip1193Provider };

const getEthereum = () => (window as unknown as EthereumWindow).ethereum;

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const TIP_WEI_HEX = `0x${(10 ** 15).toString(16)}`; // 0.001 ETH, safely inside Number's integer range
const CONFIRMATION_POLLS = 60;
const POLL_MS = 2_000;

export async function connectWallet(onConnected: (address: string) => void, onConnecting: (v: boolean) => void) {
  const ethereum = getEthereum();
  if (!ethereum) {
    toast.error('Web3 Wallet not found! Install MetaMask or Phantom.');
    return;
  }

  try {
    onConnecting(true);
    const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];
    onConnected(accounts[0] ?? '');
    toast.success('Wallet Connected!');
  } catch (error) {
    console.error(error);
    toast.error('Failed to connect wallet');
  } finally {
    onConnecting(false);
  }
}

export async function sendTip() {
  const ethereum = getEthereum();
  if (!ethereum) {
    toast.error('Web3 Wallet not found! Install MetaMask or Phantom.');
    return;
  }

  try {
    const accounts = (await ethereum.request({ method: 'eth_accounts' })) as string[];
    const from = accounts[0];
    if (!from) {
      toast.error('Connect your wallet first');
      return;
    }

    toast.info('Please confirm transaction in your wallet...');

    const hash = (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from, to: BURN_ADDRESS, value: TIP_WEI_HEX }],
    })) as string;

    toast.success('Transaction sent! Waiting for confirmation...');
    for (let i = 0; i < CONFIRMATION_POLLS; i++) {
      const receipt = await ethereum.request({ method: 'eth_getTransactionReceipt', params: [hash] });
      if (receipt) {
        toast.success('Thank you for the tip! 🚀 (Tx Confirmed)');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    toast.info('Transaction sent — your wallet will confirm it shortly.');
  } catch (error) {
    console.error(error);
    // EIP-1193: 4001 is the user closing the wallet prompt.
    if ((error as { code?: number }).code === 4001) {
      toast.error('Transaction cancelled');
    } else {
      toast.error('Transaction failed');
    }
  }
}
