# Day 45: Token-2022 NFT Collection

Date: 2026-06-08  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js`, `@solana/spl-token`, and the Token-2022 group helpers. The flow matches the CLI lesson: create a collection mint with metadata and group pointer extensions, initialize in-mint metadata and token group state, create two member NFT mints with metadata and group member pointer extensions, link each member to the collection, mint exactly one token for each member, and disable mint authorities.

## Collection Mint

| Field | Value |
| --- | --- |
| Collection mint | `At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW` |
| Name | `Solana Sketchbook` |
| Symbol | `SKTCH` |
| Metadata URI | `https://gist.githubusercontent.com/MinhTruongFullstackAther/2e5d0bc893c62989fcdf4ef6cca85212/raw/day-45-collection.json` |
| Group size | `2` |
| Group max size | `3` |
| Mint authority | none |
| Group update authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Account data size at mint creation | `302` bytes |

Explorer:

```text
https://explorer.solana.com/address/At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW?cluster=devnet
```

Explorer screenshot:

```text
day-45-collection-extensions.png
```

## Member Mints

| Field | Member One | Member Two |
| --- | --- | --- |
| Mint | `6S4Z6Bhd71NUskriThsvhHwRpKekMotNk8HTf9tDUPiV` | `2T32bnrBGZ9uP75tXSSUR4x7WtZP5fNK9ZwjskrBcyTa` |
| Associated token account | `D47fowvAVQGwXp1gjZFwTYjHsaS1D911KxLQPbWBTtuw` | `457EX2DYQk69MfRpcTcCvzRJzne2xEKqqiq97Vxvz5rz` |
| Name | `Sketch #1` | `Sketch #2` |
| Symbol | `SK1` | `SK2` |
| Metadata URI | `https://gist.githubusercontent.com/MinhTruongFullstackAther/2e5d0bc893c62989fcdf4ef6cca85212/raw/day-45-sketch-1.json` | `https://gist.githubusercontent.com/MinhTruongFullstackAther/2e5d0bc893c62989fcdf4ef6cca85212/raw/day-45-sketch-2.json` |
| Supply | `1` | `1` |
| Decimals | `0` | `0` |
| Mint authority | none | none |
| Group | `At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW` | `At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW` |
| Member number | `1` | `2` |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create collection mint and pointer extensions | `2KohgTGSSGW4tbioRn6VFXCMMMdRiUEJrw2frKJJu1TBKCAcpV1cBtJkFqB6kCGxgXCfBsz7HHub5b2Po7hp8FGb` |
| Initialize collection metadata | `2K1sXEbVXsWSfiJmrZNtQj1oKwVHk9tNTUA7CEChNaqV2paiXxEDA4Tp8kSycGESmY9SGAQS3Deu8WZHg7VK6Hwg` |
| Initialize collection group | `xp9J5FZwQDM1NfvsBx6dPVBEPpAnfxDhpjFaAN1bQGd3cyyz3FDVsLRSrybMeRYKsntiFpqXpc1LxYTPjZConZH` |
| Lock collection mint authority | `3n43eVvokKDpk8xEhFEUdxgjbfwwFSYnXoRtN3TuixqUPWhD8mWFx6wbw3UMzDVZ2dJifkCP7Juxhr83Ywv2RfyF` |
| Create member one mint | `ozMbYrMAEtp6Eq1fDSRGb6jSJRUvLAeWAhvy8dDDSJTwsBvsTf43QndfTAs3ynqrQURZkrLtxmouL5Ls9eDH8Md` |
| Initialize member one metadata | `37oz9YMkng5LtJCLMFqaYrAcpUKQbozDTX3CMmHNFiLfUPDzwiw2p79m5nKBxLQM7UQJvY6YnvEdne38Ji1AM4KP` |
| Initialize member one group member | `Q1D1TmuxDAAHt1crdTt94G5t9mAJtBix45SjtvHLATKG9HJmvhvBMYZWvFEG2htyVhWsansFUsQcoEmm7LQQEbP` |
| Mint member one supply | `3kaNog3S6uCnHmWkFZtvyE2yMBUFaGyhuWPEYuRzfvt6s4m4n2Zp3GvFRhhSStweLrweM74paaeLisCjv2QEH7HU` |
| Lock member one mint authority | `3S3DzWCuqKrMwm2mHewPaspEVG1V5AJJ2HPfTmzpruS8QsccxT4AEGB56E1PEu71fYw7FgoVUU85pMy3fH4E3WzC` |
| Create member two mint | `JboSp26CG12F9PB49fwv8KhSjk6ntXctFmYHUroa5GXEijHvbB5j7pjyqEEw9M79rdDjHLptuUD7QyPgKEPidA8` |
| Initialize member two metadata | `3xx7pQuQ7DkXBgj1uDzptQUJDAMKc1vVgAGiihziMaYCsHxUT8Lg9baB8bZthyq4nHPT8qiFCHJ1vG9CHyTFCkrD` |
| Initialize member two group member | `2vdupT5TJ7mNtwGnQaoH9XWGTFxuTbVXCNHXXrUPL1pXPYsfVPcdbEVwau1dbNzGfPbxnbsPZnNsM3ND1Yh9PnTY` |
| Mint member two supply | `PDJzX5SahmrwzjKSMeh6Y5zqZT7DJY4RnWq1CZSuWSZ7gapfFu4WuhS1WJKVcQ3B5CHXXo6A1TLHGRe8937zC37` |
| Lock member two mint authority | `2f9UvB7RFcdDjM4GLUFoqx6cu7252k6FKEkFwgjFoqnR4kHBeK1JdjYp1yeBGzcWqEhfAoLrp9ygckvwxrKeSkpW` |

## Verification

Script read-back after minting and locking:

```text
Group size: 2
Group max size: 3
Member one group: At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW
Member one number: 1
Member two group: At9uNgcT1zcmHXrAfsSXr9hCSLHeGsuN6KHSbz5Mr2eW
Member two number: 2
```
