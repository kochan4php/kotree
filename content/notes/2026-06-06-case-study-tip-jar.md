---
title: Case study: a tip jar without a wallet library
date: 2026-06-06
tags: case-study, ethereum, security
series: Building Kotree
seriesOrder: 3
summary: A handful of EIP-1193 calls, a hand-written wei parser and a deliberate list of things the tip jar does not do.
---

The tip jar has one job: let someone send a small amount of Ether without asking them to install anything else. The obvious implementation is a wallet library. The library would add tens of kilobytes to a page that is mostly links, for three JSON-RPC calls. The version that shipped talks to the injected provider directly and owns the small amount of parsing that requires.

## Three calls

An EIP-1193 provider is available as `window.ethereum` in a browser with a wallet extension. The send flow uses three methods:

- `eth_requestAccounts` asks for permission and returns the selected address.
- `wallet_switchEthereumChain` asks the wallet to change networks.
- `eth_sendTransaction` sends the transfer.

Nothing is requested on page load. The connect button is a user gesture, and the account prompt appears only after it. Auto-connecting on load is a privacy leak and a hostile first impression; the page should not learn an address before the visitor asks it to.

The provider API is promise-based and rejects with an error object. EIP-1193 defines a `code` on that object, and the codes are the difference between a useful message and "something went wrong". `4001` is a user rejection. `4902` is an unrecognised chain. `-32002` means a request is already pending in the wallet. Those three cover most of the unhappy paths.

## Switching chains

The jar expects mainnet, chain id `0x1`. The wallet may be on another network, so the flow checks `eth_chainId` before sending and calls `wallet_switchEthereumChain` with `{ chainId: '0x1' }` if needed.

If the wallet does not know the chain, it rejects with `4902`. The fallback is `wallet_addEthereumChain`, with the chain id, a name, the RPC URL and a block explorer. That is a wallet-specific prompt and a place to be careful: the values should come from a constant, not from a response, and the user should understand that they are adding a network, not just switching one.

A rejection at either step ends the flow without a transaction. The button returns to its normal state, and the message says the request was cancelled. That is not an error; it is the user exercising the only control they have.

The provider can change underneath the page. `chainChanged` and `accountsChanged` are subscribed while the jar is mounted. A chain change resets the connected state and asks the user to try again; an account change updates the displayed address. Ignoring these events produces a page that looks connected to an account that is no longer selected.

## Wei without a library

The amount is a decimal string, not a number. `0.001` cannot be represented exactly as a binary float, and multiplying it by `1e18` is a way to send the wrong amount. The parser splits on the decimal point, pads the fractional part to eighteen digits, and builds a `BigInt`.

```ts
const [whole, frac = ''] = amount.split('.');
const wei = BigInt(whole) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18));
```

The result is converted to a hex string for the transaction's `value` field. The same treatment applies to any gas fields the wallet returns; they are hex strings, not numbers, and parsing them with `Number` loses precision above 2^53.

The recipient address is a constant. The jar does not resolve ENS names, because that would require an RPC call and another failure mode. It displays the address truncated and offers a copy button, so a visitor can verify it in their wallet.

## The failure states

The UI has a state for each of these, and none of them is a generic toast:

- **No provider.** The connect button is disabled with a short explanation and a link to a wallet, not a broken click.
- **Request pending.** The wallet is already showing a prompt; the button says so and does not send a second request.
- **Rejected.** The user cancelled. The jar says the request was cancelled and leaves the form as it was.
- **Wrong chain.** The jar offers the switch and explains why. If the switch is rejected, nothing is sent.
- **Insufficient funds.** The wallet usually catches this before the page does; if the transaction fails, the error is shown with the hash if one exists.
- **Pending.** The hash is shown with an explorer link, and the jar says the transaction is pending rather than confirmed. A pending transaction is not a completed tip.
- **Replaced or dropped.** A transaction can be replaced with a higher fee or dropped by the network. The explorer is the source of truth; the page does not poll forever.

The state machine is small but explicit. A boolean `isConnected` is not enough, because "connected" does not mean "on the right chain" or "able to send".

## What was deliberately left out

The jar does not use WalletConnect, so it only works with an injected provider. It does not use ethers or viem, so it has no contract calls and no ABI handling. It does not support ERC-20 tokens, because approvals and decimals are a different feature with a different risk profile. It does not resolve ENS, index transactions, send notifications, or offer fiat on-ramps.

It also does not report transaction volume, because the site has no indexer and the numbers would be invented. The only honest metric is the block explorer.

## Testing

The unit tests cover the wei parser at the boundaries: whole numbers, one decimal place, eighteen, more than eighteen, an empty fraction and a leading dot. The end-to-end tests inject a fake `window.ethereum` with `addInitScript`, then assert the exact sequence of methods and the shape of the transaction. No test touches a real chain.

A manual pass on a testnet is still necessary. The mocked provider cannot reproduce the wallet's own prompts, the chain-switch rejection or the way a pending transaction looks. Those are the states that matter, and they are the ones a mock will happily pretend to have.
