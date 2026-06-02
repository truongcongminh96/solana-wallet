# Day 40: Revocable Credential Token

Date: 2026-06-01  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)  
Issuer / authority wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have `solana` or `spl-token` in `PATH`, so this experiment was run through devnet RPC with the SPL Token library. The same Token-2022 instructions were used: initialize non-transferable mint, initialize permanent delegate, initialize metadata pointer, initialize mint, initialize/update token metadata, mint, transfer, and burn.

## Credential Mint

| Field | Value |
| --- | --- |
| Mint address | `HrqpxoNVoPwSua1beLLgiUmStMyij1fjHpxyKvSvwfYd` |
| Decimals | `0` |
| Extensions | `NonTransferable`, `PermanentDelegate`, `MetadataPointer`, `TokenMetadata` |
| Mint authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Permanent delegate | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| Freeze authority | none |
| Account data size | `476` bytes |
| Rent-exempt balance | `0.00420384` SOL |

## Metadata

| Field | Value |
| --- | --- |
| Name | `Solana Dev Credential` |
| Symbol | `CRED` |
| URI | `https://example.com/credential.json` |
| Metadata update authority | `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq` |
| `issued_date` | `2026-06-01` |
| `expiry_date` | `2027-06-01` |

## Recipient Flow

| Field | Value |
| --- | --- |
| Recipient owner | `EYFZhsV6wGU53F7xqpFSxDLApA2NKjtQqDLDXrtFVDSU` |
| Recipient token account | `2qmMXALsYonbL3DLzmpYvnqhCrTHwe3A2vqXijxDawTU` |
| Third-party owner | `2eJ9EZnJfzryFXq8dpnPjMFJXwbSu9rQnS9AXGKf9x9u` |
| Third-party token account | `BYmXjYSudGZpAAecrj9GC4oDwYzhb7AHxBadymm4dzjk` |
| Balance after mint | `1` |
| Balance after revocation burn | `0` |
| Recipient account extensions | `ImmutableOwner`, `NonTransferableAccount` |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create and initialize mint extensions | `3r2DivYDR14cvwWXMXvwA2Dfi7UXfPnE5hPp5F5wqiYVZaocK5XbCE7yKiKMCQ86YNoA511ccsuHhLsUXx39Uxom` |
| Initialize metadata | `4kziHxM89Lo8cdmHidtPVa7k3Lk7FVDdD57PwRwSsxC52xxwvPaavrAXBGH9UxgeoDxEXorqK3Nj8dza5aPDgRSn` |
| Add `issued_date` metadata | `54HhYiMY8HP4k7PK8uDCFYjX1A5UkbHDzSEYiE9xpzXiCUuzFPeKGYfxGjbm7QbWF3HVcnTGsifA1pqKxpAKxwkX` |
| Add `expiry_date` metadata | `31vTq6DY2FMQWbJbVyPfPa4uCN3PEhKgSJTyeZpumk7Av2beiY3YX7Qn9KtUgaDwcrEyco5c9uzZaWKitkWGiQ1L` |
| Mint one credential to recipient | `4JRZu6Rt4yRSamCwuuKDFreKd6fDk2xGfkx5dabMnKt3K5sFRkkSCK5T1jAzx4gKKKxabf9bVXPZJ3QWaWf38VZS` |
| Burn credential as permanent delegate | `5dXTJvxFZ3zjffveTH62uF1Aw1YJmBeCK6SUzA7QshaaYtTiAnpmyziZAn9KnPwK3YrrjK9Ycg4b7tbPGGu12zKB` |

## Transfer Test

The attempted transfer from the recipient account to the third-party account failed as expected.

Relevant program log:

```text
Instruction: Transfer
Transfer is disabled for this mint
custom program error: 0x25
```

This confirms the credential is soulbound after minting. The recipient can hold it, but cannot move it to another wallet.

## Revocation Test

The issuer burned `1` token from the recipient token account using the permanent delegate authority. The recipient did not sign the burn transaction.

Before burn:

```text
amount: 1
decimals: 0
```

After burn:

```text
amount: 0
decimals: 0
```

The credential was successfully revoked.

## Bonus Observation

On an earlier scratch mint, `SetAuthority` for `PermanentDelegate` succeeded when signed by the current authority, which changed the delegate. After that change, trying to set it back with the original issuer failed with `owner does not match`. For the final mint above, the permanent delegate was left as the issuer authority so revocation remains controlled by the credential issuer.
