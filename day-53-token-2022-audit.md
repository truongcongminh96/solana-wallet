# Day 53: Audit Token-2022 Mints

Date: 2026-06-18  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this audit was run through devnet RPC with `@solana/web3.js` and `@solana/spl-token`. It serves as the Day 53 equivalent of `spl-token display` for the two active Token-2022 mints created on June 18, 2026: the Day 50 fee-bearing mint and the Day 52 stacked mint.

## Audited Mints

| Day | Mint | Extensions found |
| --- | --- | --- |
| Day 50 / 51 | `CFTBSCy68VqUzGeMwjmgzufeBgGi64i281f4iUxzavj7` | `TransferFeeConfig` |
| Day 52 | `51r9jZ2C3pj5D1GrrwgDFxPDN3xVwaUMUeZ875oYYwPd` | `TransferFeeConfig`, `InterestBearingConfig` |

## Read-back Summary

| Field | Day 50 / 51 mint | Day 52 mint |
| --- | --- | --- |
| Mint authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Decimals | `6` | `6` |
| Raw supply | `1001000000000` | `1000000000000` |
| UI supply | `1001000` | `1000005.371292` |
| Transfer fee basis points | `100` | `100` |
| Transfer fee max UI | `1000000` | `1000000` |
| Interest rate basis points | `-` | `5000` |
| Interest last update timestamp | `-` | `1781755210` |

## Reflection

```text
TransferFeeConfig makes the mint skim a protocol-enforced percentage from every transfer and lets the withdraw authority reclaim those withheld tokens later.
InterestBearingConfig makes the mint report a time-growing UI amount so every holder sees interest accrue even when the raw token amount stored on chain stays unchanged.
```

## Verification

Rendered stacked proof:

```text
day-53-terminal-proof.png
```
