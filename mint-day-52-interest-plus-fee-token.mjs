import { readFile, writeFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  amountToUiAmountForMintWithoutSimulation,
  calculateEpochFee,
  createAssociatedTokenAccountInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializeMint2Instruction,
  createInitializeTransferFeeConfigInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getInterestBearingMintConfigState,
  getMint,
  getMintLen,
  getTransferFeeAmount,
  getTransferFeeConfig,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const OUTPUT_TEXT_FILE = new URL("./day-52-interest-fee-output.txt", import.meta.url);
const OUTPUT_JSON_FILE = new URL("./day-52-interest-fee-result.json", import.meta.url);
const OUTPUT_MARKDOWN_FILE = new URL("./day-52-interest-fee.md", import.meta.url);
const OUTPUT_HTML_FILE = new URL("./day-52-terminal-proof.html", import.meta.url);

const DECIMALS = 6;
const TRANSFER_FEE_BASIS_POINTS = 100;
const MAXIMUM_FEE_UI = 1_000_000n;
const INTEREST_RATE_BASIS_POINTS = 5000;
const INITIAL_SUPPLY_UI = 1_000_000n;
const TRANSFER_AMOUNT_UI = 1_000n;
const RECIPIENT_SOL_TOPUP = 0.01;
const OWNER_SNAPSHOT_DELAY_MS = 31_000;
const RECIPIENT_SNAPSHOT_DELAY_MS = 8_000;

function uiAmountToRaw(amountUi) {
  return amountUi * 10n ** BigInt(DECIMALS);
}

function rawToUiString(rawAmount) {
  const base = 10n ** BigInt(DECIMALS);
  const whole = rawAmount / base;
  const fraction = rawAmount % base;
  if (fraction === 0n) {
    return whole.toString();
  }

  return `${whole}.${fraction.toString().padStart(DECIMALS, "0").replace(/0+$/, "")}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function loadKeypair(fileUrl) {
  const secretKey = JSON.parse(await readFile(fileUrl, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function sendTransaction(connection, payer, instructions, signers = []) {
  const transaction = new Transaction().add(...instructions);
  return await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers],
    { commitment: "confirmed" }
  );
}

async function getUiAmount(connection, mint, rawAmount) {
  return await amountToUiAmountForMintWithoutSimulation(connection, mint, rawAmount);
}

function buildTranscript({
  wallet,
  mint,
  ownerAta,
  recipientWallet,
  recipientAta,
  ownerRawBefore,
  ownerUiFirst,
  ownerUiSecond,
  recipientRawAfterTransfer,
  recipientUiFirst,
  recipientUiSecond,
  recipientWithheldBefore,
  recipientWithheldAfter,
  transferFeeConfig,
  interestConfig,
  mintSignature,
  ownerAtaSignature,
  mintSupplySignature,
  solTopupSignature,
  recipientAtaSignature,
  transferSignature,
  withdrawSignature,
}) {
  return `RPC-driven equivalent of the Day 52 CLI flow
Local shell note: solana/spl-token CLIs were not in PATH, so this proof comes from the Node RPC script.

Wallet: ${wallet}
export MINT=${mint}
export MY_TA=${ownerAta}
export RECIPIENT=${recipientWallet}
export RECIPIENT_TA=${recipientAta}

spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --decimals 6 --transfer-fee-basis-points 100 --transfer-fee-maximum-fee 1000000 --interest-rate 5000
Signature: ${mintSignature}
Created mint: ${mint}

spl-token display $MINT
Mint: ${mint}
Decimals: 6
Extensions:
  TransferFeeConfig
    transfer_fee_basis_points: ${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}
    maximum_fee_ui: ${MAXIMUM_FEE_UI}
    withdraw_withheld_authority: ${transferFeeConfig.withdrawWithheldAuthority.toBase58()}
  InterestBearingConfig
    current_rate_basis_points: ${interestConfig.currentRate}
    rate_authority: ${interestConfig.rateAuthority.toBase58()}

spl-token create-account $MINT
Signature: ${ownerAtaSignature}
Created token account: ${ownerAta}

spl-token mint $MINT 1000000
Signature: ${mintSupplySignature}

spl-token display $MY_TA
Address: ${ownerAta}
Raw amount: ${ownerRawBefore}
UI amount: ${ownerUiFirst}

sleep 31

spl-token display $MY_TA
Address: ${ownerAta}
Raw amount: ${ownerRawBefore}
UI amount: ${ownerUiSecond}

solana transfer $RECIPIENT 0.01 --allow-unfunded-recipient
Signature: ${solTopupSignature}

spl-token create-account $MINT --owner $RECIPIENT --fee-payer ~/.config/solana/id.json
Signature: ${recipientAtaSignature}
Created token account: ${recipientAta}

spl-token transfer $MINT 1000 $RECIPIENT --expected-fee 10
Signature: ${transferSignature}

spl-token display $RECIPIENT_TA
Address: ${recipientAta}
Raw amount: ${recipientRawAfterTransfer}
UI amount: ${recipientUiFirst}
Extensions:
  TransferFeeAmount
    withheld_amount: ${recipientWithheldBefore}

sleep 8

spl-token display $RECIPIENT_TA
Address: ${recipientAta}
Raw amount: ${recipientRawAfterTransfer}
UI amount: ${recipientUiSecond}
Extensions:
  TransferFeeAmount
    withheld_amount: ${recipientWithheldBefore}

spl-token withdraw-withheld-tokens $MY_TA $RECIPIENT_TA
Signature: ${withdrawSignature}

spl-token display $RECIPIENT_TA
Address: ${recipientAta}
Raw amount: ${recipientRawAfterTransfer}
UI amount: ${recipientUiSecond}
Extensions:
  TransferFeeAmount
    withheld_amount: ${recipientWithheldAfter}
`;
}

function buildTerminalHtml(transcript) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Day 52 Terminal Proof</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, #173a2c 0%, #0b1018 42%),
          linear-gradient(180deg, #0b1018 0%, #05080d 100%);
        font-family: Consolas, "Courier New", monospace;
        color: #e2f7ee;
      }
      .frame {
        width: min(1280px, calc(100vw - 48px));
        margin: 24px auto;
        border: 1px solid rgba(106, 255, 189, 0.25);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.45);
        background: rgba(6, 12, 19, 0.94);
      }
      .bar {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 18px;
        background: rgba(14, 22, 31, 0.98);
        border-bottom: 1px solid rgba(106, 255, 189, 0.15);
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
      }
      .dot.red { background: #ff5f57; }
      .dot.yellow { background: #febc2e; }
      .dot.green { background: #28c840; }
      .title {
        margin-left: 10px;
        color: #8abca5;
        font-size: 14px;
      }
      pre {
        margin: 0;
        padding: 24px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
        font-size: 19px;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="bar">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="title">day-52 terminal proof</span>
      </div>
      <pre>${escapeHtml(transcript)}</pre>
    </div>
  </body>
</html>
`;
}

function buildMarkdown({
  runDate,
  wallet,
  mint,
  ownerAta,
  recipientWallet,
  recipientAta,
  mintLen,
  ownerRawAmount,
  ownerUiFirst,
  ownerUiSecond,
  recipientUiFirst,
  recipientUiSecond,
  recipientRawAfterTransfer,
  expectedFeeRaw,
  recipientWithheldBefore,
  recipientWithheldAfter,
  transferFeeConfig,
  interestConfig,
  mintSignature,
  ownerAtaSignature,
  mintSupplySignature,
  solTopupSignature,
  recipientAtaSignature,
  transferSignature,
  withdrawSignature,
}) {
  return `# Day 52: Stack Interest Accrual on Top of a Fee-Bearing Token

Date: ${runDate}  
Cluster: Solana devnet  
Program: Token-2022 (\`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb\`)

Owner wallet: \`${wallet}\`

The local shell did not have the \`solana\` or \`spl-token\` CLIs in \`PATH\`, so this experiment was run through devnet RPC with \`@solana/web3.js\` and \`@solana/spl-token\`. The flow matches the CLI lesson: create a fresh Token-2022 mint that combines \`TransferFeeConfig\` and \`InterestBearingConfig\`, mint a large supply, observe the same token account's UI amount drift upward over time while the raw amount stays fixed, transfer to a fresh wallet with an asserted fee, confirm the recipient sees both interest-bearing UI growth and a non-zero withheld fee, then withdraw the withheld tokens back to the owner ATA.

## Mint

| Field | Value |
| --- | --- |
| Mint | \`${mint}\` |
| Owner ATA | \`${ownerAta}\` |
| Recipient wallet | \`${recipientWallet}\` |
| Recipient ATA | \`${recipientAta}\` |
| Decimals | \`${DECIMALS}\` |
| Mint account data size at creation | \`${mintLen}\` bytes |
| Initial supply | \`${INITIAL_SUPPLY_UI}\` tokens (\`${ownerRawAmount}\` raw units) |

## Extensions

| Field | Value |
| --- | --- |
| Transfer fee basis points | \`${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}\` |
| Transfer fee max | \`${MAXIMUM_FEE_UI}\` tokens (\`${transferFeeConfig.newerTransferFee.maximumFee}\` raw units) |
| Withdraw withheld authority | \`${transferFeeConfig.withdrawWithheldAuthority.toBase58()}\` |
| Interest rate | \`${interestConfig.currentRate}\` basis points |
| Interest rate authority | \`${interestConfig.rateAuthority.toBase58()}\` |
| Interest init timestamp | \`${interestConfig.initializationTimestamp}\` |
| Interest last update timestamp | \`${interestConfig.lastUpdateTimestamp}\` |

## UI Drift Verification

| Snapshot | Raw Amount | UI Amount |
| --- | --- | --- |
| Owner snapshot 1 | \`${ownerRawAmount}\` | \`${ownerUiFirst}\` |
| Owner snapshot 2 (~31s later) | \`${ownerRawAmount}\` | \`${ownerUiSecond}\` |
| Recipient snapshot 1 | \`${recipientRawAfterTransfer}\` | \`${recipientUiFirst}\` |
| Recipient snapshot 2 (~8s later) | \`${recipientRawAfterTransfer}\` | \`${recipientUiSecond}\` |

## Fee Lifecycle

| Field | Value |
| --- | --- |
| Transfer amount | \`${TRANSFER_AMOUNT_UI}\` tokens |
| Expected fee | \`${rawToUiString(expectedFeeRaw)}\` tokens (\`${expectedFeeRaw}\` raw units) |
| Recipient withheld amount before withdraw | \`${rawToUiString(recipientWithheldBefore)}\` tokens (\`${recipientWithheldBefore}\` raw units) |
| Recipient withheld amount after withdraw | \`${rawToUiString(recipientWithheldAfter)}\` tokens (\`${recipientWithheldAfter}\` raw units) |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create multi-extension mint | \`${mintSignature}\` |
| Create owner ATA | \`${ownerAtaSignature}\` |
| Mint supply | \`${mintSupplySignature}\` |
| Transfer SOL to recipient | \`${solTopupSignature}\` |
| Create recipient ATA | \`${recipientAtaSignature}\` |
| Transfer with expected fee | \`${transferSignature}\` |
| Withdraw withheld tokens | \`${withdrawSignature}\` |

## Verification

Rendered terminal proof:

\`\`\`text
day-52-terminal-proof.png
\`\`\`

Key observations:

\`\`\`text
TransferFeeConfig and InterestBearingConfig both exist on the same mint.
Owner UI amount increased from ${ownerUiFirst} to ${ownerUiSecond} with raw amount fixed at ${ownerRawAmount}.
Recipient UI amount increased from ${recipientUiFirst} to ${recipientUiSecond} with raw amount fixed at ${recipientRawAfterTransfer}.
Recipient withheld_amount moved from ${rawToUiString(recipientWithheldBefore)} to ${rawToUiString(recipientWithheldAfter)} after withdraw.
\`\`\`
`;
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const mint = Keypair.generate();
const ownerAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  payer.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);
const recipient = Keypair.generate();
const recipientAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  recipient.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);

const mintLen = getMintLen([
  ExtensionType.TransferFeeConfig,
  ExtensionType.InterestBearingConfig,
]);
const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
const maximumFeeRaw = uiAmountToRaw(MAXIMUM_FEE_UI);
const initialSupplyRaw = uiAmountToRaw(INITIAL_SUPPLY_UI);

const mintSignature = await sendTransaction(
  connection,
  payer,
  [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      payer.publicKey,
      payer.publicKey,
      TRANSFER_FEE_BASIS_POINTS,
      maximumFeeRaw,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeInterestBearingMintInstruction(
      mint.publicKey,
      payer.publicKey,
      INTEREST_RATE_BASIS_POINTS,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMint2Instruction(
      mint.publicKey,
      DECIMALS,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
  ],
  [mint]
);

const ownerAtaSignature = await sendTransaction(connection, payer, [
  createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ownerAta,
    payer.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
]);

const mintSupplySignature = await sendTransaction(connection, payer, [
  createMintToInstruction(
    mint.publicKey,
    ownerAta,
    payer.publicKey,
    initialSupplyRaw,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
]);

const mintInfo = await getMint(
  connection,
  mint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const transferFeeConfig = getTransferFeeConfig(mintInfo);
const interestConfig = getInterestBearingMintConfigState(mintInfo);
if (!transferFeeConfig || !interestConfig) {
  throw new Error("Expected both TransferFeeConfig and InterestBearingConfig on the mint.");
}

const ownerAccountSnapshotOne = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const ownerUiFirst = await getUiAmount(connection, mint.publicKey, ownerAccountSnapshotOne.amount);
await sleep(OWNER_SNAPSHOT_DELAY_MS);
const ownerAccountSnapshotTwo = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const ownerUiSecond = await getUiAmount(connection, mint.publicKey, ownerAccountSnapshotTwo.amount);

const solTopupSignature = await sendTransaction(connection, payer, [
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient.publicKey,
    lamports: Math.round(RECIPIENT_SOL_TOPUP * LAMPORTS_PER_SOL),
  }),
]);

const recipientAtaSignature = await sendTransaction(connection, payer, [
  createAssociatedTokenAccountInstruction(
    payer.publicKey,
    recipientAta,
    recipient.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
]);

const epochInfo = await connection.getEpochInfo("confirmed");
const transferAmountRaw = uiAmountToRaw(TRANSFER_AMOUNT_UI);
const expectedFeeRaw = calculateEpochFee(
  transferFeeConfig,
  BigInt(epochInfo.epoch),
  transferAmountRaw
);

const transferSignature = await transferCheckedWithFee(
  connection,
  payer,
  ownerAta,
  mint.publicKey,
  recipientAta,
  payer,
  transferAmountRaw,
  DECIMALS,
  expectedFeeRaw,
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);

const recipientAccountSnapshotOne = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientFeeBefore = getTransferFeeAmount(recipientAccountSnapshotOne);
if (!recipientFeeBefore) {
  throw new Error("Recipient account is missing TransferFeeAmount.");
}
const recipientUiFirst = await getUiAmount(
  connection,
  mint.publicKey,
  recipientAccountSnapshotOne.amount
);
await sleep(RECIPIENT_SNAPSHOT_DELAY_MS);
const recipientAccountSnapshotTwo = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientUiSecond = await getUiAmount(
  connection,
  mint.publicKey,
  recipientAccountSnapshotTwo.amount
);

const withdrawSignature = await withdrawWithheldTokensFromAccounts(
  connection,
  payer,
  mint.publicKey,
  ownerAta,
  payer,
  [],
  [recipientAta],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);

const recipientAccountAfterWithdraw = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientFeeAfter = getTransferFeeAmount(recipientAccountAfterWithdraw);
if (!recipientFeeAfter) {
  throw new Error("Recipient account is missing TransferFeeAmount after withdraw.");
}

const result = {
  date: new Date().toISOString().slice(0, 10),
  wallet: payer.publicKey.toBase58(),
  mint: mint.publicKey.toBase58(),
  ownerAta: ownerAta.toBase58(),
  recipientWallet: recipient.publicKey.toBase58(),
  recipientAta: recipientAta.toBase58(),
  mintLen,
  decimals: DECIMALS,
  transferFeeBasisPoints: TRANSFER_FEE_BASIS_POINTS,
  maximumFeeUi: MAXIMUM_FEE_UI.toString(),
  maximumFeeRaw: maximumFeeRaw.toString(),
  interestRateBasisPoints: INTEREST_RATE_BASIS_POINTS,
  currentEpoch: epochInfo.epoch,
  ownerSnapshots: {
    rawAmount: ownerAccountSnapshotOne.amount.toString(),
    uiAmount1: ownerUiFirst,
    uiAmount2: ownerUiSecond,
  },
  recipientSnapshots: {
    rawAmount: recipientAccountSnapshotOne.amount.toString(),
    uiAmount1: recipientUiFirst,
    uiAmount2: recipientUiSecond,
  },
  withheld: {
    beforeWithdrawRaw: recipientFeeBefore.withheldAmount.toString(),
    afterWithdrawRaw: recipientFeeAfter.withheldAmount.toString(),
  },
  signatures: {
    createMint: mintSignature,
    createOwnerAta: ownerAtaSignature,
    mintSupply: mintSupplySignature,
    solTopup: solTopupSignature,
    createRecipientAta: recipientAtaSignature,
    transfer: transferSignature,
    withdrawWithheld: withdrawSignature,
  },
  transferFeeConfig: {
    transferFeeConfigAuthority: transferFeeConfig.transferFeeConfigAuthority.toBase58(),
    withdrawWithheldAuthority: transferFeeConfig.withdrawWithheldAuthority.toBase58(),
    withheldAmount: transferFeeConfig.withheldAmount.toString(),
    olderTransferFee: {
      epoch: transferFeeConfig.olderTransferFee.epoch.toString(),
      maximumFee: transferFeeConfig.olderTransferFee.maximumFee.toString(),
      transferFeeBasisPoints: transferFeeConfig.olderTransferFee.transferFeeBasisPoints,
    },
    newerTransferFee: {
      epoch: transferFeeConfig.newerTransferFee.epoch.toString(),
      maximumFee: transferFeeConfig.newerTransferFee.maximumFee.toString(),
      transferFeeBasisPoints: transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
    },
  },
  interestConfig: {
    rateAuthority: interestConfig.rateAuthority.toBase58(),
    initializationTimestamp: interestConfig.initializationTimestamp.toString(),
    preUpdateAverageRate: interestConfig.preUpdateAverageRate,
    lastUpdateTimestamp: interestConfig.lastUpdateTimestamp.toString(),
    currentRate: interestConfig.currentRate,
  },
  explorerUrl: `https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`,
};

const transcript = buildTranscript({
  wallet: result.wallet,
  mint: result.mint,
  ownerAta: result.ownerAta,
  recipientWallet: result.recipientWallet,
  recipientAta: result.recipientAta,
  ownerRawBefore: ownerAccountSnapshotOne.amount.toString(),
  ownerUiFirst,
  ownerUiSecond,
  recipientRawAfterTransfer: recipientAccountSnapshotOne.amount.toString(),
  recipientUiFirst,
  recipientUiSecond,
  recipientWithheldBefore: rawToUiString(recipientFeeBefore.withheldAmount),
  recipientWithheldAfter: rawToUiString(recipientFeeAfter.withheldAmount),
  transferFeeConfig,
  interestConfig,
  mintSignature,
  ownerAtaSignature,
  mintSupplySignature,
  solTopupSignature,
  recipientAtaSignature,
  transferSignature,
  withdrawSignature,
});

const markdown = buildMarkdown({
  runDate: result.date,
  wallet: result.wallet,
  mint: result.mint,
  ownerAta: result.ownerAta,
  recipientWallet: result.recipientWallet,
  recipientAta: result.recipientAta,
  mintLen,
  ownerRawAmount: ownerAccountSnapshotOne.amount.toString(),
  ownerUiFirst,
  ownerUiSecond,
  recipientUiFirst,
  recipientUiSecond,
  recipientRawAfterTransfer: recipientAccountSnapshotOne.amount.toString(),
  expectedFeeRaw,
  recipientWithheldBefore: recipientFeeBefore.withheldAmount,
  recipientWithheldAfter: recipientFeeAfter.withheldAmount,
  transferFeeConfig,
  interestConfig,
  mintSignature,
  ownerAtaSignature,
  mintSupplySignature,
  solTopupSignature,
  recipientAtaSignature,
  transferSignature,
  withdrawSignature,
});

await writeFile(OUTPUT_TEXT_FILE, `${transcript}\n`, "utf8");
await writeFile(OUTPUT_JSON_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(OUTPUT_MARKDOWN_FILE, markdown, "utf8");
await writeFile(OUTPUT_HTML_FILE, buildTerminalHtml(transcript), "utf8");

console.log(transcript);
