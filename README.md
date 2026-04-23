# Solana Wallet Connect — Day 4

A production-style browser wallet demo built with Vite, `@solana/kit`, and the Wallet Standard.

## Features

- Detects installed Solana browser wallets
- Connects through the Wallet Standard
- Displays the connected public address
- Fetches and displays the live devnet balance
- Supports disconnect
- Supports manual balance refresh
- Never asks for a private key or seed phrase

## Tech Stack

- Vite
- Vanilla JavaScript
- `@solana/kit`
- `@wallet-standard/app`

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in the same browser where your wallet extension is installed.

## Before testing

1. Install a browser wallet such as Phantom.
2. Switch the wallet network to **Devnet**.
3. Fund the wallet with test SOL from a faucet.

## Why this is the correct Day 4 approach

On earlier days, you created and stored keypairs yourself. This project moves to the real dApp model:

- the wallet extension owns the private key
- the user approves the connection request
- the app only receives a public account and permissioned wallet features

That means the app behaves much closer to a real production Solana frontend.
