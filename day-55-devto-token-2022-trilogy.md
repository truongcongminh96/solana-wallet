---
title: Three Token-2022 mints in one week: fees, yield, and soul-bound tokens
published: false
tags: 100daysofsolana,solana,web3,tutorial
description: A hands-on DEV post for Web2 developers about three Token-2022 mints on Solana devnet: transfer fees, interest-bearing UI balances, and non-transferable tokens.
---

Last week I stopped thinking about tokens as "just balances" and started thinking about them as assets with middleware baked directly into the mint.

If you're coming from Web2, here's the mental model that helped me: Token-2022 is the upgraded SPL token program, and extensions are like middleware for a currency. In a typical backend, you might bolt on a fee layer, a yield layer, or a transfer policy in separate services. On Solana, those rules can live inside the mint itself. That means wallets, dApps, CLIs, and programs all read the same behavior from the same on-chain account instead of relying on your custom wrapper.

Over a few days on devnet, I shipped three different Token-2022 mints:

- a fee-bearing mint that skims 1% on every transfer
- a stacked mint that combines transfer fees with interest-bearing UI balances
- a non-transferable mint that refuses to move at all

I also audited all of them afterward to confirm the extensions on chain matched the behavior I thought I had configured.

One honest note before we jump in: my local shell did not have `solana` and `spl-token` in `PATH`, so I executed the experiments through `@solana/web3.js` and `@solana/spl-token`. The commands below are the canonical `spl-token` equivalents for the exact flows I mirrored on devnet.

## 1. Fee-Bearing Mint

Mint address:

`CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7`

Explorer:

[https://explorer.solana.com/address/CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7?cluster=devnet](https://explorer.solana.com/address/CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7?cluster=devnet)

Extensions used:

- `TransferFeeConfig`

Create command:

```bash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  create-token \
  --transfer-fee-basis-points 100 \
  --transfer-fee-maximum-fee 1000000 \
  --decimals 6
```

What it does:

This mint charges a 1% fee on every transfer. The fee rule is not enforced by my app code or some custom contract next to the token. It's enforced by the Token-2022 program itself because the fee config is part of the mint account.

When I tested this mint, a transfer of `1000` tokens withheld `10` tokens exactly as expected.

Why a builder would want this:

This is a clean fit for something like a creator economy token or a community currency where each transfer sends a small treasury skim back to the project. Instead of trusting every integration to remember your fee logic, the asset carries the rule with it.

## 2. Interest-Bearing + Fee Mint

Mint address:

`51r9jZ2C3pj5D1GrrwgDFxPDN3xVwaUMUeZ875oYYwPd`

Explorer:

[https://explorer.solana.com/address/51r9jZ2C3pj5D1GrrwgDFxPDN3xVwaUMUeZ875oYYwPd?cluster=devnet](https://explorer.solana.com/address/51r9jZ2C3pj5D1GrrwgDFxPDN3xVwaUMUeZ875oYYwPd?cluster=devnet)

Extensions used:

- `TransferFeeConfig`
- `InterestBearingConfig`

Create command:

```bash
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --decimals 6 \
  --transfer-fee-basis-points 100 \
  --transfer-fee-maximum-fee 1000000 \
  --interest-rate 5000
```

What it does:

This mint combines two behaviors:

- every transfer pays a 1% fee
- every holder sees the UI amount grow over time at the configured interest rate

The subtle part, and the part I wish more tutorials emphasized, is that the interest-bearing extension does **not** mint new supply into token accounts. The raw amount stored on chain stays fixed. What changes is the UI amount that clients compute from the mint's rate configuration and the network clock.

That means this:

- raw amount can stay `1000000000000`
- displayed UI amount can drift upward over time

In my test, the same account moved from `1000000.031688` to `1000000.522867` in about 31 seconds without any transaction landing in between. On the recipient side, a transfer still withheld `10` tokens in fees, and the recipient's UI amount also started drifting upward immediately.

That's why this mint felt like the clearest "Token-2022 is middleware for assets" demo of the week: two totally different behaviors, one mint, no custom program written by me.

## 3. Non-Transferable Mint

Mint address:

`GnHWVxdfWgDqbpDVgZbEdWbZ8wrX4Ct5fP5uyMEY4MPW`

Explorer:

[https://explorer.solana.com/address/GnHWVxdfWgDqbpDVgZbEdWbZ8wrX4Ct5fP5uyMEY4MPW?cluster=devnet](https://explorer.solana.com/address/GnHWVxdfWgDqbpDVgZbEdWbZ8wrX4Ct5fP5uyMEY4MPW?cluster=devnet)

Extensions used:

- `NonTransferable`

Create command:

```bash
spl-token create-token --program-2022 --enable-non-transferable
```

What it does:

This is the opposite of money. Once the token lands in an account, it cannot be transferred out. That makes it a good fit for badges, credentials, proof-of-completion tokens, or any soul-bound style identity artifact.

I intentionally created a recipient token account first and then tried to transfer `1` token into it just to make sure the failure came from the program rule itself, not from some unrelated missing-account error.

This was the exact runtime rejection I got:

```text
Program log: Instruction: TransferChecked
Program log: Transfer is disabled for this mint
Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb failed: custom program error: 0x25
```

That error is the feature. The mint is carrying a transfer policy that the protocol itself enforces.

## What Day 53 Taught Me

After building these mints, I audited them the same way I would inspect a database schema after a migration.

- The Day 50 / 51 mint read back with `TransferFeeConfig`
- The Day 52 mint read back with both `TransferFeeConfig` and `InterestBearingConfig`
- The Day 54 mint read back with `NonTransferable`

That audit step mattered more than I expected. It's one thing to remember which flag I typed into a command. It's another thing entirely to read the mint account back from chain and see the protocol decode the exact behavior I thought I had shipped.

## Closing Reflection

What surprised me most was how composable these extensions are. I expected Token-2022 to feel like "more options on a token." Instead, it felt more like a design space for asset behavior. The transfer-fee mint felt useful for treasury or royalty-style flows. The interest-bearing mint made me think about internal reward systems and financial UX where displayed value changes over time without mutating raw balances. The non-transferable mint was the most conceptually fun because it flips the token primitive from money into identity. If I were building a real product tomorrow, I'd reach for these extensions long before reaching for a custom token program.

If you're a Web2 developer learning Solana, Token-2022 is one of the best places to start because it teaches a deep lesson quickly: on-chain assets do not just store value, they can store rules.
