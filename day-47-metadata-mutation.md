# Day 47: Live Metadata Mutation

Date: 2026-06-08  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner / update authority wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js`, `@solana/spl-token`, and the Token Metadata update helpers. No new mint was created.

## Mutated NFT

| Field | Value |
| --- | --- |
| Mint address | `6S4Z6Bhd71NUskriThsvhHwRpKekMotNk8HTf9tDUPiV` |
| Collection mint | `At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW` |
| Original name | `Sketch #1` |
| New name | `Field Notes` |
| Symbol | `SK1` |
| Original URI | `https://gist.githubusercontent.com/MinhTruongFullstackAther/2e5d0bc893c62989fcdf4ef6cca85212/raw/day-45-sketch-1.json` |
| New URI | `https://gist.githubusercontent.com/MinhTruongFullstackAther/96fd4ca1ce6b792f825e5a629e3091a3/raw/day-47-sketch-1-mutated.json` |
| Temporary custom field | `rarity=legendary` |
| Final additional metadata | `[]` |
| Metadata update authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |

Explorer:

```text
https://explorer.solana.com/address/6S4Z6Bhd71NUskriThsvhHwRpKekMotNk8HTf9tDUPiV?cluster=devnet
```

Explorer screenshot:

```text
day-47-mutated-nft-metadata.png
```

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Update `name` to `Field Notes` | `4WASRaNQuRTGTWSon9hJprZHhaxddWmmmfZV2BJMuxvVNMQVicSKtsrZL6w87AMPjVtBUpxTBWE1y8zjCadYrXTN` |
| Add `rarity=legendary` | `3sjiJ8i8aqqkf2kg1vYn5SgMsYwJ9sU7qeo2oWmL9tAxar6SALJvA5mDY5kJkcg1ApvfmziJSBWmmiymCG5RY1um` |
| Remove `rarity` | `3PZPLx4fBrPfZMrXNpim8tmcEXoLhEfEvr9t4kkn4Dpn14nSeMU6GVwHTCz3KV1CPqE3DE62gZEgrdHRXF6CWCxs` |
| Update `uri` | `4S2naQwJbeH2iJ32nLiFDTjGiJkiJMLmGAPWfH7KjpTPxb7CYQBVudGbyyr14md8HgDMCBzyLh7smGfzcUyWzSLw` |

## Verification

RPC read-back after all mutations:

```text
After name: Field Notes
After symbol: SK1
After uri: https://gist.githubusercontent.com/MinhTruongFullstackAther/96fd4ca1ce6b792f825e5a629e3091a3/raw/day-47-sketch-1-mutated.json
After update authority: BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq
After additional metadata: []
```
