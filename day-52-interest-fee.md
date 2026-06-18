# Day 52: Stack Interest Accrual on Top of a Fee-Bearing Token

Date: 2026-06-18  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js` and `@solana/spl-token`. The flow matches the CLI lesson: create a fresh Token-2022 mint that combines `TransferFeeConfig` and `InterestBearingConfig`, mint a large supply, observe the same token account's UI amount drift upward over time while the raw amount stays fixed, transfer to a fresh wallet with an asserted fee, confirm the recipient sees both interest-bearing UI growth and a non-zero withheld fee, then withdraw the withheld tokens back to the owner ATA.

## Mint

| Field | Value |
| --- | --- |
| Mint | `51r9jZ2C3pj5D1GrrwgDFxPDN3xVwaUMUeZ875oYYwPd` |
| Owner ATA | `FRd5pTCeN6B9pfqn5xVm2xN93TXe4QL2kzB6NBhLeyqh` |
| Recipient wallet | `3zNHmQyutMKkSsviAhkTxiscknn88t6f6xWrvXstDQxM` |
| Recipient ATA | `DU4JfPuKqxGEkgrmYPpKj8TJDxhZfsZJ3ChshUMMFHU1` |
| Decimals | `6` |
| Mint account data size at creation | `334` bytes |
| Initial supply | `1000000` tokens (`1000000000000` raw units) |

## Extensions

| Field | Value |
| --- | --- |
| Transfer fee basis points | `100` |
| Transfer fee max | `1000000` tokens (`1000000000000` raw units) |
| Withdraw withheld authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Interest rate | `5000` basis points |
| Interest rate authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Interest init timestamp | `1781755210` |
| Interest last update timestamp | `1781755210` |

## UI Drift Verification

| Snapshot | Raw Amount | UI Amount |
| --- | --- | --- |
| Owner snapshot 1 | `1000000000000` | `1000000.031688` |
| Owner snapshot 2 (~31s later) | `1000000000000` | `1000000.522867` |
| Recipient snapshot 1 | `990000000` | `990.000549` |
| Recipient snapshot 2 (~8s later) | `990000000` | `990.000674` |

## Fee Lifecycle

| Field | Value |
| --- | --- |
| Transfer amount | `1000` tokens |
| Expected fee | `10` tokens (`10000000` raw units) |
| Recipient withheld amount before withdraw | `10` tokens (`10000000` raw units) |
| Recipient withheld amount after withdraw | `0` tokens (`0` raw units) |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create multi-extension mint | `2SKUsvypBvtd2PGiz3hZcV6df2sdiw9pEpzQc8wh1in8PzupJzkigVanZnG6UW6xiLhVtP7JStoUoaZt63q6Di5m` |
| Create owner ATA | `63GYk4XuFxfzM2zvtZkoDs1BpmWBdNfSDFdPjEqJ11e12iHv4CRjG4YWMXuhWiEGbWmoCR8bafGfcGcDDVJUNeAx` |
| Mint supply | `WVxWX526USpqXkarBGfNRmihGox9GRxHSxu1dn668UWhS9dLfSgBnkaU71gF72xnMtG3DJuDxEt31BRdPpBNeTf` |
| Transfer SOL to recipient | `2oLggx2bkeEfvMVVMiUTMYGAUCRwN745CyFJrQ9qFmNLzVAeV6CRfJf8SRR5bJCEd2cgAwJLLeEEn9wB5fq2kzWd` |
| Create recipient ATA | `91xoeZfNm7TWU44xXi8pwW8GLfNPArbDkaui8NcXNYLi6cKjK798Hk2L3fTR5Zvnp4BVDEQU5KoZXm9hHxLjH3y` |
| Transfer with expected fee | `3RsLLC5vn72hhru8YALqS9kHsUebfphpRY3eVfQFhZNW4JzNKVBDaaXLQBsRc1EMviSqycYJNyGfUKHjYmvKagtV` |
| Withdraw withheld tokens | `5BrVJxoKKkS4Luc9YeRCiyrNj5nPuLEWzrG6BgjjEEgowiyM98pdHpngyaeUzLNda2pFikpBPj4PsXNBb9Ac55D` |

## Verification

Rendered terminal proof:

```text
day-52-terminal-proof.png
```

Key observations:

```text
TransferFeeConfig and InterestBearingConfig both exist on the same mint.
Owner UI amount increased from 1000000.031688 to 1000000.522867 with raw amount fixed at 1000000000000.
Recipient UI amount increased from 990.000549 to 990.000674 with raw amount fixed at 990000000.
Recipient withheld_amount moved from 10 to 0 after withdraw.
```
