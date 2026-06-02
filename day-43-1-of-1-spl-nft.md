# Day 43: 1-of-1 SPL Token NFT

Date: 2026-06-02  
Cluster: Solana devnet  
Program: SPL Token (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)  
Owner / mint authority wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell still did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with the installed `@solana/kit` and `@solana-program/token` libraries. The flow matches the CLI lesson: create a mint with zero decimals, create the associated token account, mint exactly one token, and then disable the mint authority.

## NFT Mint

| Field | Value |
| --- | --- |
| Mint address | `5c1ARmBw2aAqFPmAy9qGicDYWMx7XfRAXUqAUDHuy9NJ` |
| Associated token account | `HGG4aa7B384M63C3YB2YnoQqrCmDJVnBWRBTgSWNp48s` |
| Owner wallet | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Decimals | `0` |
| Supply | `1` |
| Mint authority | none |
| Freeze authority | none |

Explorer:

```text
https://explorer.solana.com/address/5c1ARmBw2aAqFPmAy9qGicDYWMx7XfRAXUqAUDHuy9NJ?cluster=devnet
```

Explorer screenshot: `day-43-explorer.png`

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create zero-decimal mint | `2b9fH5CQxHfSomnBt1jLWEQ5oxJaWhfAJmVVJyWTaWn4Jv2SWw9ot2eKmAekPAPCYcK2syaDJjxjqB2Ft4YhCzAa` |
| Create ATA and mint one token | `2mdB6tGtyPTeSQej1bxppxRb1UbFvUuSvQJ2Q3YZ1o2ttyBeDfvKkcNpoYKhoVTeHsMBuyoY5Krgp3V1cL397q6r` |
| Disable mint authority | `5JDqkjKQPb1dnb8pctE1CZyhf3PG2yPAAj7u91EtGNRnGw1GXpDqkXbY5drVRu5PCRSSAGkbEEuE7AUTzqAjUNqy` |

## Verification

RPC verification after disabling the mint authority:

```json
{
  "supply": {
    "amount": "1",
    "decimals": 0,
    "uiAmount": 1,
    "uiAmountString": "1"
  },
  "parsed": {
    "decimals": 0,
    "freezeAuthority": null,
    "isInitialized": true,
    "mintAuthority": null,
    "supply": "1"
  }
}
```

This confirms the raw SPL definition of a simple NFT: the token cannot be subdivided because the mint has zero decimals, and it cannot be duplicated because the mint authority is permanently disabled after a supply of one.
