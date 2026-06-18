# Day 56: Token-2022 Social Thread Draft

Replace `DEV_URL` with your published dev.to link before posting.

Suggested visuals:

- Post 1: [day-52-terminal-proof.png](/C:/Users/minh.truong/SipherLearning/solana-wallet/day-52-terminal-proof.png)
- Post 4: [day-54-terminal-proof.png](/C:/Users/minh.truong/SipherLearning/solana-wallet/day-54-terminal-proof.png)
- Optional audit follow-up: [day-53-terminal-proof.png](/C:/Users/minh.truong/SipherLearning/solana-wallet/day-53-terminal-proof.png)

## X Thread

Post 1

I spent a week building 3 Token-2022 mints on Solana devnet:

- one charges a fee on every transfer
- one layers interest on top
- one refuses to move at all

No custom token program. Just mint extensions.

Write-up + receipts: DEV_URL

#100DaysOfSolana #Solana #Token2022

Post 2

Mint 1: fee-bearing token

`spl-token create-token --transfer-fee-basis-points 100 --transfer-fee-maximum-fee 1000000 --decimals 6`

A 1000 token transfer withheld 10 tokens exactly as configured.

Good fit for treasury skims, creator tokens, or protocol fees.

DEV_URL

Post 3

Mint 2: transfer fee + interest-bearing UI balance

`spl-token create-token --transfer-fee-basis-points 100 --transfer-fee-maximum-fee 1000000 --interest-rate 5000`

The subtle part: raw balance stayed fixed, but UI amount kept increasing over time.

DEV_URL

Post 4

Mint 3: non-transferable token

`spl-token create-token --program-2022 --enable-non-transferable`

I created the recipient ATA first, then tried to move 1 token.

Runtime reply:
`Instruction: TransferChecked`
`Transfer is disabled for this mint`

DEV_URL

Post 5

Biggest lesson from this week:

Token-2022 extensions feel like middleware baked into the asset itself.

Fees, interest, and transfer rules lived on the mint, and I could audit every config back from chain afterward.

Full post: DEV_URL

#100DaysOfSolana #Solana #web3

## LinkedIn Version

This week I built three Token-2022 mints on Solana devnet, and it completely changed how I think about tokens.

The first mint charged a 1% fee on every transfer. The second stacked that same fee model with an interest-bearing UI balance. The third did the opposite of money: it was non-transferable, so once it landed in a wallet, it could not be moved again.

What clicked for me is that Token-2022 extensions feel a lot like middleware for an asset. In a Web2 stack, I would normally expect separate services, background jobs, and app-layer enforcement for this kind of behavior. On Solana, those rules can live directly on the mint.

Three moments stood out:

- a transfer of 1000 tokens withheld 10 tokens automatically
- the interest-bearing mint showed the UI amount increasing while the raw on-chain amount stayed fixed
- the non-transferable mint rejected a transfer attempt with: `Transfer is disabled for this mint`

I bundled the whole week into one write-up with mint addresses, explorer links, exact commands, and terminal proofs:

DEV_URL

If you've shipped with other Token-2022 extensions like memo transfer, default account state, or confidential transfers, I'd love to hear what you built.

#100DaysOfSolana #Solana #web3 #tutorial

## Bluesky Variant

Built 3 Token-2022 mints on Solana devnet this week:

- fee-bearing
- fee + interest-bearing
- non-transferable

The surprising part is that the protocol can enforce all of that natively through mint extensions.

No custom token program. Just configuration on the asset.

Write-up: DEV_URL

#100DaysOfSolana #Solana
