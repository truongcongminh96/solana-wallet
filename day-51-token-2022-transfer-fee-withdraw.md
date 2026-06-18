# Day 51: Send the Fee-Bearing Token and Withdraw Withheld Fees

Date: 2026-06-18  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js` and `@solana/spl-token`. The flow mirrors the CLI lesson: mint fresh supply to the existing Day 50 fee-bearing token, generate a throwaway recipient wallet, create the recipient ATA with the owner wallet paying rent, transfer 1,000 tokens with an asserted 10-token fee, inspect the recipient token account for a non-zero `withheld_amount`, then withdraw those withheld tokens back into the owner ATA using the mint's withdraw authority.

## Addresses

| Field | Value |
| --- | --- |
| Mint | `CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7` |
| Owner ATA | `4ewbLqnLWjzjvdRUvQbxvCqEnof4bSTKuVTd7HRbmiqw` |
| Recipient wallet | `7cAjT4cocUk6hrVQxYo8nFSM13fKvAsryMWeAXkruqpM` |
| Recipient ATA | `F8Rtxug8JJZN6xJ5ebNGFhX8RoSGXhARVTjLT9MZcFE7` |

## Transfer Fee Lifecycle

| Field | Value |
| --- | --- |
| Decimals | `6` |
| Fresh supply minted | `1000000` tokens (`1000000000000` raw units) |
| Transfer amount | `1000` tokens (`1000000000` raw units) |
| Expected fee | `10` tokens (`10000000` raw units) |
| Recipient spendable balance after transfer | `990` tokens |
| Recipient withheld amount before withdraw | `10` tokens (`10000000` raw units) |
| Recipient withheld amount after withdraw | `0` tokens (`0` raw units) |

## Owner Balance Check

| Checkpoint | Balance |
| --- | --- |
| Before fresh mint | `1000` tokens |
| After fresh mint | `1001000` tokens |
| After transfer | `1000000` tokens |
| After withdraw | `1000010` tokens |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Mint fresh Day 51 supply | `3NYDQ7PZjSVxWAsy6GgY7tydUeA13xka8a2KE63vZJ3m8qgw9TVjQGk1m9Kaqz2Mf4JefgjnMFUpokdgYdBXYx4g` |
| Create recipient ATA | `5HPkcY6YF5LARysxUEAye85gvZoFViikKcmX2az7rYEXMkTAhxEBrrTWqiYw2tXKoCGmtdkHXXRPpYCmzy2f7s7u` |
| Transfer with expected fee | `5naKgb4r5ir5DDcCkR5CCGrrwrfPhmLZELjaj2vu9cApqcP5BdgkdqfMPLoCn37P7kxwViNMVegrKcW345zhvCaL` |
| Withdraw withheld tokens from recipient ATA | `5ZsTeURmwLA5d4gARZFMPDLcKU9X5XfQiSkxSxmokUywcGeXEienWdBcPUyGY2vNFZKgj3FXCpYk49EMQ2tuFxKm` |

## Verification

Rendered terminal proof:

```text
day-51-terminal-proof.png
```

Read-back summary:

```text
Recipient withheld_amount before withdraw: 10 tokens
Recipient withheld_amount after withdraw: 0 tokens
Owner balance after withdraw: 1000010 tokens
```
