# Day 39: Token Extension Configuration Comparison

Date: 2026-06-01  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)  
Inspector wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The original Day 36-38 mint addresses were not available in this workspace or shell history, and the local shell did not have `solana` or `spl-token` in `PATH`. I created fresh devnet examples and inspected the same on-chain account data through RPC using the SPL Token library.

## Mint Comparison

| Mint address | Extensions enabled | Account data size (bytes) | Rent cost (SOL) | Key authorities |
| --- | --- | ---: | ---: | --- |
| `7q79U8YD5VQLr61EZu189TXcFZW7eyHWzZwAmcArQkuN` | `InterestBearingConfig` | 222 | 0.002436 | Mint: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`; Freeze: none; Rate: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| `4YoiHnHuk2n3388qAsji6NsviBfByU4HxAbaxSVjLgv2` | `TransferFeeConfig`, `MetadataPointer`, `TokenMetadata` | 500 | 0.00437088 | Mint: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`; Freeze: none; Transfer fee config: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`; Withdraw withheld: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`; Metadata update: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| `5b4tFYFWB11purkMhXnyZBchRyyH4zg4X3pTwJENHMT8` | `DefaultAccountState` | 171 | 0.00208104 | Mint: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`; Freeze: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |

## Decoded Extension Values

### Interest-bearing mint

- Current rate: `500` basis points
- Pre-update average rate: `500` basis points
- Rate authority: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`
- Supply: `0`
- Decimals: `9`

### Multi-extension mint

- Transfer fee basis points: `250`
- Maximum fee: `1000000` base units
- Withheld amount: `0`
- Transfer fee config authority: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`
- Withdraw withheld authority: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`
- Metadata pointer authority: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`
- Metadata address: `4YoiHnHuk2n3388qAsji6NsviBfByU4HxAbaxSVjLgv2`
- Metadata name: `Day 39 Multi Extension Token`
- Metadata symbol: `D39ME`
- Metadata URI: `https://example.com/day-39-token.json`

### Default-frozen mint

- Freeze authority: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`
- Default account state: `Frozen`
- Supply: `0`
- Decimals: `9`

## Notes

- The default-frozen mint is the smallest of the three examples because `DefaultAccountState` adds only a small amount of extension data.
- The interest-bearing mint is larger than the default-frozen mint because `InterestBearingConfig` stores rate authority and timestamp/rate fields.
- The multi-extension mint is the largest because it combines transfer fee configuration, a metadata pointer, and in-mint token metadata.
- Rent cost scales with account data size, so extension choices directly affect the SOL needed for rent exemption.
