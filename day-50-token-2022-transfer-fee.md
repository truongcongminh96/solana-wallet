# Day 50: Fee-Bearing Token with Token-2022

Date: 2026-06-18  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js` and `@solana/spl-token`. The flow matches the CLI lesson: create a Token-2022 fungible mint with the Transfer Fee extension, create the owner ATA, mint an initial 1,000-token supply, and read the mint back on-chain to confirm the embedded fee rule.

## Mint

| Field | Value |
| --- | --- |
| Mint | `CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7` |
| Owner ATA | `4ewbLqnLWjzjvdRUvQbxvCqEnof4bSTKuVTd7HRbmiqw` |
| Decimals | `6` |
| Initial supply | `1000` tokens (`1000000000` raw units) |
| Mint authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Mint account data size at creation | `278` bytes |

Explorer:

```text
https://explorer.solana.com/address/CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7?cluster=devnet
```

Explorer screenshot:

```text
day-50-transfer-fee-extensions.png
```

## Transfer Fee Config

| Field | Value |
| --- | --- |
| Transfer fee config authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Withdraw withheld authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Withheld amount on mint | `0` raw units |
| Older fee epoch | `1088` |
| Older fee basis points | `100` |
| Older maximum fee | `1000000000000` raw units (`1000000` tokens) |
| Newer fee epoch | `1088` |
| Newer fee basis points | `100` |
| Newer maximum fee | `1000000000000` raw units (`1000000` tokens) |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create mint and initialize Transfer Fee config | `38kiBPtJEkB3dm3auGeyEgts1rt48mERLAdBk6cNCuDUdN4kEks1ppWnRU2dkPdLLD3cZzpyLGHuE1PkeBUqNku5` |
| Create owner ATA | `4nNqbZ8XktbFWkFkxij8BLBE1xVbBMo3BkjUHu3B9wCJcH8ScAhRgv6ReqfiBTp5ESRYi6hL4byYMLEUbseGyZQ9` |
| Mint initial supply | `2HSWeXLK3wkFEraTqB1vXnqFjFooEpwc2aeGiVQNEunJAVpJXSj8J7XQ31sZpkLHC6HyHZasEmsSs17ACkHTGFNF` |

## Verification

Script read-back after minting:

```text
Current epoch: 1088
Transfer fee basis points: 100
Maximum fee (raw): 1000000000000
Maximum fee (UI): 1000000
Fee on 1000 tokens: 10 tokens
```
