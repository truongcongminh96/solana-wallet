# Day 54: Non-Transferable Token

Date: 2026-06-18  
Cluster: Solana devnet  
Program: Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

Owner wallet: `BrbBahEL58U9vyXJchryQXreMHxHFKsNe2Kc2dyRCmKq`

The local shell did not have the `solana` or `spl-token` CLIs in `PATH`, so this experiment was run through devnet RPC with `@solana/web3.js` and `@solana/spl-token`. The flow mirrors the CLI lesson: create a fresh Token-2022 mint with the non-transferable extension, create an owner ATA, mint exactly one token, create a recipient ATA up front, then attempt a transfer and capture the runtime rejection.

## Addresses

| Field | Value |
| --- | --- |
| Mint | `GnHWVxdfWgDqbpDVgZbEdWbZ8wrX4Ct5fP5uyMEY4MPW` |
| Owner ATA | `5wmC3KoEqu3QHC3K3WpDcjqYTMheKBf59vodNHbpxKKo` |
| Recipient wallet | `E2R4uL9BqbDrLQyPTzNe8uCM3L4MnYxLJz5xBGjQpcQ` |
| Recipient ATA | `3Ed3uQ88Ns9XTDUemyk2Sd6JSMoqwheC37iSiTXL8aGd` |
| Mint account data size at creation | `170` bytes |

## Verification

| Check | Result |
| --- | --- |
| Mint has NonTransferable extension | `yes` |
| Owner ATA has NonTransferableAccount extension | `yes` |
| Recipient ATA has NonTransferableAccount extension | `yes` |
| Transfer 1 token to recipient | `failed as expected` |

Transfer failure message:

```text
Simulation failed. 
Message: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x25. 
Logs: 
[
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [1]",
  "Program log: Instruction: TransferChecked",
  "Program log: Transfer is disabled for this mint",
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 1570 of 200000 compute units",
  "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb failed: custom program error: 0x25"
]. 
Catch the `SendTransactionError` and call `getLogs()` on it for full details.
```

Transfer failure logs:

```text
Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [1]
Program log: Instruction: TransferChecked
Program log: Transfer is disabled for this mint
Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb consumed 1570 of 200000 compute units
Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb failed: custom program error: 0x25
```

Rendered proof:

```text
day-54-terminal-proof.png
```
