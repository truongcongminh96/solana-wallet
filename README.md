# Solana Wallet

Mini project for Day 1 and Day 2 of the "100 Days of Solana" challenge using [`@solana/kit`](https://www.npmjs.com/package/@solana/kit).

This repo currently includes:

- `create-wallet.mjs` for Day 1
- `persistent-wallet.mjs` for Day 2

## Prerequisites

- Node.js 18+ recommended
- npm

Install dependencies:

```bash
npm install
```

## Day 1: Create a Wallet

`create-wallet.mjs` generates a brand new Solana keypair in memory and prints the wallet address.

Run it with:

```bash
node create-wallet.mjs
```

What it does:

- Creates a fresh keypair with `generateKeyPairSigner()`
- Prints the public wallet address
- Keeps the private key in memory only

Example output:

```text
Your new wallet address: <WALLET_ADDRESS>

This address is your public key. It's safe to share.
The private key stays in memory. In a real app, you'd save it securely.
```

Use this wallet address with the Solana devnet faucet if you want to test funding manually.

## Day 2: Persistent Wallet

`persistent-wallet.mjs` creates a wallet once, saves it to `wallet.json`, and reloads the same wallet on future runs.

Run it with:

```bash
node persistent-wallet.mjs
```

What it does:

- Tries to read an existing wallet from `wallet.json`
- Creates a new extractable keypair if the file does not exist
- Saves the keypair in Solana's 64-byte secret key format
- Reconstructs the signer with `createKeyPairSignerFromBytes(...)`
- Fetches the wallet balance from Solana devnet

Expected behavior:

- First run: creates a new wallet and saves `wallet.json`
- Later runs: loads the same wallet address again
- If the balance is `0 SOL`, the script prints the faucet link so you can fund it

Example output:

```text
Loaded existing wallet: <WALLET_ADDRESS>

Address: <WALLET_ADDRESS>
Balance: 0 SOL

This wallet has no SOL. Visit https://faucet.solana.com/ and airdrop some to:
<WALLET_ADDRESS>
```

If devnet RPC is temporarily unavailable, the script shows a friendly message instead of crashing.

## Project Files

- `create-wallet.mjs`: Day 1 wallet creation
- `persistent-wallet.mjs`: Day 2 persistent wallet and balance check
- `wallet.json`: generated local wallet file for Day 2

## Security Note

`wallet.json` contains the wallet's private key material. In this repo it is only meant for devnet practice and is already ignored by Git.

Do not use this storage approach for real funds or production apps. Use a secure keystore, hardware wallet, or wallet provider instead.

## Useful Links

- [Solana Faucet](https://faucet.solana.com/)
- [@solana/kit on npm](https://www.npmjs.com/package/@solana/kit)
