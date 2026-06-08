# Day 44: Token-2022 NFT Metadata

Date: 2026-06-08  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js`, `@solana/spl-token`, and `@solana/spl-token-metadata`. The flow matches the CLI lesson: create a Token-2022 mint with the metadata pointer extension, initialize in-mint token metadata, mint exactly one token to the wallet ATA, and disable mint plus metadata update authorities.

## NFT Mint

| Field | Value |
| --- | --- |
| Mint address | `Hk1E4nVjSdzz8hDPWyywbhFav1wenpqUSvsbJbnDoekD` |
| Associated token account | `GTsdscj58um9fRBigFVj7PcZtMS2Rmyrt3DaKBejK945` |
| Owner wallet | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Decimals | `0` |
| Supply | `1` |
| Mint authority | none |
| Freeze authority | none |
| Metadata update authority | none |
| Account data size at mint creation | `234` bytes |

Explorer:

```text
https://explorer.solana.com/address/Hk1E4nVjSdzz8hDPWyywbhFav1wenpqUSvsbJbnDoekD?cluster=devnet
```

Explorer screenshots:

```text
day-44-explorer.png
day-44-explorer-metadata.png
```

## Metadata

| Field | Value |
| --- | --- |
| Name | `First Light` |
| Symbol | `LIGHT` |
| URI | `https://gist.githubusercontent.com/MinhTruongFullstackAther/9dab68d2e45dda6a023f8082ff347c73/raw/day-44-metadata.json` |
| Source JSON | `day-44-metadata.json` |
| Image | `https://upload.wikimedia.org/wikipedia/commons/4/49/Dichroic_filters.jpg` |
| Attributes | `Filters: 44`, `Network: Devnet` |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create mint and initialize metadata pointer | `5E3UCxogp1q4XSFpC37SdioJybZc3rTNTBToASBrARM43fD9zHZTFxEAy9JTQSdx6xyZUoXLfm3BUVUsh8savFD4` |
| Initialize token metadata | `5khuwTeQHxDbQdzzVU5KJJM3K8jVGbj2XB1m4KBndBNFCLkMCAwAothgA7hEhXh2QzW3PRnAjR6g4pm6ozs3zYEt` |
| Add `Filters` metadata trait | `24xEy6KcSFHejxErUxcdnko3tiAc91SgSNSX2CxX7eLJzB7mFARB6W4vgbPwpJEejsXf85B2UKN7p1Vmgjqdwf9r` |
| Add `Network` metadata trait | `GManpMvyRN5bbFJzeeeabiq58W2c6NJ9ZvEckB8n6HfxGfkom2ndJs3C2xYtL37reKWyHxpGDEY75T5ZiZLK2Ca` |
| Create ATA and mint one token | `JucyFaEY1NsRvngQAmCbiRSogXs2B5AfhQuy2G7NrbgJSxHYxExHfgpEqJQgrrA2Ywgn99Brp7o3Fo2rxYaQJV7` |
| Disable mint and metadata update authorities | `29JHuyZvJ2ZMFskWtrgHvpKoVC8zYdhMELAb5Xu81rMweWrpccm3V1xDsyEaBHPT9XqDbzDRvdUKw94qWVEemSth` |

## Verification

Script read-back after locking authorities:

```text
Supply: 1
Decimals: 0
Mint authority: none
Metadata name: First Light
Metadata symbol: LIGHT
Metadata URI: https://gist.githubusercontent.com/MinhTruongFullstackAther/9dab68d2e45dda6a023f8082ff347c73/raw/day-44-metadata.json
Metadata update authority: none
```
