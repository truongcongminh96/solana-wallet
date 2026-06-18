import { readFile, writeFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeAmount,
  getTransferFeeConfig,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const DAY_50_FILE = new URL("./day-50-transfer-fee-result.json", import.meta.url);
const OUTPUT_TEXT_FILE = new URL("./day-51-transfer-fee-withdraw-output.txt", import.meta.url);
const OUTPUT_JSON_FILE = new URL("./day-51-transfer-fee-withdraw-result.json", import.meta.url);
const OUTPUT_MARKDOWN_FILE = new URL("./day-51-token-2022-transfer-fee-withdraw.md", import.meta.url);
const OUTPUT_HTML_FILE = new URL("./day-51-terminal-proof.html", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const FRESH_SUPPLY_UI = 1_000_000n;
const TRANSFER_AMOUNT_UI = 1_000n;

function uiAmountToRaw(amountUi, decimals) {
  return amountUi * 10n ** BigInt(decimals);
}

function rawToUiString(rawAmount, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = rawAmount / base;
  const fraction = rawAmount % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  return `${whole}.${fraction.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function loadJson(fileUrl) {
  return JSON.parse(await readFile(fileUrl, "utf8"));
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

function buildTerminalTranscript({
  mint,
  recipientWallet,
  recipientAta,
  ownerAta,
  transferAmountUi,
  expectedFeeUi,
  recipientAmountAfterTransferUi,
  recipientWithheldBeforeUi,
  recipientWithheldAfterUi,
  ownerBalanceAfterWithdrawUi,
  createRecipientAtaSignature,
  mintFreshSupplySignature,
  transferSignature,
  withdrawSignature,
}) {
  return `RPC-driven equivalent of the Day 51 CLI flow
Local shell note: solana/spl-token CLIs were not in PATH, so this proof comes from the Node RPC script.

export MINT=${mint}
export RECIPIENT=${recipientWallet}
export RECIPIENT_TA=${recipientAta}
export MY_TA=${ownerAta}

spl-token mint $MINT 1000000
Signature: ${mintFreshSupplySignature}

spl-token create-account $MINT --owner $RECIPIENT --fee-payer ~/.config/solana/id.json
Signature: ${createRecipientAtaSignature}
Created token account: ${recipientAta}

spl-token transfer --expected-fee ${expectedFeeUi} $MINT ${transferAmountUi} $RECIPIENT --allow-unfunded-recipient
Signature: ${transferSignature}

spl-token display $RECIPIENT_TA
Address: ${recipientAta}
Spendable balance: ${recipientAmountAfterTransferUi}
Extensions:
  TransferFeeAmount
    withheld_amount: ${recipientWithheldBeforeUi}

spl-token withdraw-withheld-tokens $MY_TA $RECIPIENT_TA
Signature: ${withdrawSignature}

spl-token display $RECIPIENT_TA
Address: ${recipientAta}
Spendable balance: ${recipientAmountAfterTransferUi}
Extensions:
  TransferFeeAmount
    withheld_amount: ${recipientWithheldAfterUi}

spl-token balance $MINT
${ownerBalanceAfterWithdrawUi}
`;
}

function buildTerminalHtml(transcript) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Day 51 Terminal Proof</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, #183a2d 0%, #0d1117 45%),
          linear-gradient(180deg, #0d1117 0%, #070a0f 100%);
        font-family: Consolas, "Courier New", monospace;
        color: #d7f9e9;
      }
      .frame {
        width: min(1200px, calc(100vw - 48px));
        margin: 24px auto;
        border: 1px solid rgba(125, 255, 190, 0.25);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        background: rgba(7, 12, 18, 0.92);
      }
      .bar {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 14px 18px;
        background: rgba(17, 24, 32, 0.98);
        border-bottom: 1px solid rgba(125, 255, 190, 0.16);
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
        line-height: 1.55;
        font-size: 20px;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="bar">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="title">day-51 terminal proof</span>
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
  decimals,
  freshSupplyRaw,
  transferAmountRaw,
  expectedFeeRaw,
  recipientAmountAfterTransferRaw,
  recipientWithheldBeforeRaw,
  recipientWithheldAfterRaw,
  ownerBalanceBeforeRaw,
  ownerBalanceAfterMintRaw,
  ownerBalanceAfterTransferRaw,
  ownerBalanceAfterWithdrawRaw,
  mintFreshSupplySignature,
  createRecipientAtaSignature,
  transferSignature,
  withdrawSignature,
}) {
  return `# Day 51: Send the Fee-Bearing Token and Withdraw Withheld Fees

Date: ${runDate}  
Cluster: Solana devnet  
Program: Token-2022 (\`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb\`)

Owner wallet: \`${wallet}\`

The local shell did not have the \`solana\` or \`spl-token\` CLIs in \`PATH\`, so this experiment was run through devnet RPC with \`@solana/web3.js\` and \`@solana/spl-token\`. The flow mirrors the CLI lesson: mint fresh supply to the existing Day 50 fee-bearing token, generate a throwaway recipient wallet, create the recipient ATA with the owner wallet paying rent, transfer 1,000 tokens with an asserted 10-token fee, inspect the recipient token account for a non-zero \`withheld_amount\`, then withdraw those withheld tokens back into the owner ATA using the mint's withdraw authority.

## Addresses

| Field | Value |
| --- | --- |
| Mint | \`${mint}\` |
| Owner ATA | \`${ownerAta}\` |
| Recipient wallet | \`${recipientWallet}\` |
| Recipient ATA | \`${recipientAta}\` |

## Transfer Fee Lifecycle

| Field | Value |
| --- | --- |
| Decimals | \`${decimals}\` |
| Fresh supply minted | \`${FRESH_SUPPLY_UI}\` tokens (\`${freshSupplyRaw}\` raw units) |
| Transfer amount | \`${TRANSFER_AMOUNT_UI}\` tokens (\`${transferAmountRaw}\` raw units) |
| Expected fee | \`${rawToUiString(expectedFeeRaw, decimals)}\` tokens (\`${expectedFeeRaw}\` raw units) |
| Recipient spendable balance after transfer | \`${rawToUiString(recipientAmountAfterTransferRaw, decimals)}\` tokens |
| Recipient withheld amount before withdraw | \`${rawToUiString(recipientWithheldBeforeRaw, decimals)}\` tokens (\`${recipientWithheldBeforeRaw}\` raw units) |
| Recipient withheld amount after withdraw | \`${rawToUiString(recipientWithheldAfterRaw, decimals)}\` tokens (\`${recipientWithheldAfterRaw}\` raw units) |

## Owner Balance Check

| Checkpoint | Balance |
| --- | --- |
| Before fresh mint | \`${rawToUiString(ownerBalanceBeforeRaw, decimals)}\` tokens |
| After fresh mint | \`${rawToUiString(ownerBalanceAfterMintRaw, decimals)}\` tokens |
| After transfer | \`${rawToUiString(ownerBalanceAfterTransferRaw, decimals)}\` tokens |
| After withdraw | \`${rawToUiString(ownerBalanceAfterWithdrawRaw, decimals)}\` tokens |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Mint fresh Day 51 supply | \`${mintFreshSupplySignature}\` |
| Create recipient ATA | \`${createRecipientAtaSignature}\` |
| Transfer with expected fee | \`${transferSignature}\` |
| Withdraw withheld tokens from recipient ATA | \`${withdrawSignature}\` |

## Verification

Rendered terminal proof:

\`\`\`text
day-51-terminal-proof.png
\`\`\`

Read-back summary:

\`\`\`text
Recipient withheld_amount before withdraw: ${rawToUiString(recipientWithheldBeforeRaw, decimals)} tokens
Recipient withheld_amount after withdraw: ${rawToUiString(recipientWithheldAfterRaw, decimals)} tokens
Owner balance after withdraw: ${rawToUiString(ownerBalanceAfterWithdrawRaw, decimals)} tokens
\`\`\`
`;
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const day50 = await loadJson(DAY_50_FILE);
const mintAddress = day50.mint;
const mintKey = new PublicKey(mintAddress);
const ownerAta = getAssociatedTokenAddressSync(
  mintKey,
  payer.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);
const recipient = Keypair.generate();
const recipientAta = getAssociatedTokenAddressSync(
  mintKey,
  recipient.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);

const mintInfo = await getMint(connection, mintKey, "confirmed", TOKEN_2022_PROGRAM_ID);
const transferFeeConfig = getTransferFeeConfig(mintInfo);
if (!transferFeeConfig) {
  throw new Error("TransferFeeConfig extension was not found on the Day 50 mint.");
}

const decimals = mintInfo.decimals;
const freshSupplyRaw = uiAmountToRaw(FRESH_SUPPLY_UI, decimals);
const transferAmountRaw = uiAmountToRaw(TRANSFER_AMOUNT_UI, decimals);
const epochInfo = await connection.getEpochInfo("confirmed");
const expectedFeeRaw = calculateEpochFee(
  transferFeeConfig,
  BigInt(epochInfo.epoch),
  transferAmountRaw
);

const ownerAccountBefore = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);

const mintFreshSupplySignature = await sendTransaction(connection, payer, [
  createMintToInstruction(
    mintKey,
    ownerAta,
    payer.publicKey,
    freshSupplyRaw,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
]);

const ownerAccountAfterMint = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);

const createRecipientAtaSignature = await sendTransaction(connection, payer, [
  createAssociatedTokenAccountInstruction(
    payer.publicKey,
    recipientAta,
    recipient.publicKey,
    mintKey,
    TOKEN_2022_PROGRAM_ID
  ),
]);

const transferSignature = await transferCheckedWithFee(
  connection,
  payer,
  ownerAta,
  mintKey,
  recipientAta,
  payer,
  transferAmountRaw,
  decimals,
  expectedFeeRaw,
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);

const ownerAccountAfterTransfer = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientAccountBeforeWithdraw = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientFeeBeforeWithdraw = getTransferFeeAmount(recipientAccountBeforeWithdraw);
if (!recipientFeeBeforeWithdraw) {
  throw new Error("Recipient token account is missing TransferFeeAmount.");
}

const withdrawSignature = await withdrawWithheldTokensFromAccounts(
  connection,
  payer,
  mintKey,
  ownerAta,
  payer,
  [],
  [recipientAta],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);

const ownerAccountAfterWithdraw = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientAccountAfterWithdraw = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientFeeAfterWithdraw = getTransferFeeAmount(recipientAccountAfterWithdraw);
if (!recipientFeeAfterWithdraw) {
  throw new Error("Recipient token account lost TransferFeeAmount unexpectedly.");
}

const result = {
  date: new Date().toISOString().slice(0, 10),
  wallet: payer.publicKey.toBase58(),
  mint: mintKey.toBase58(),
  ownerAta: ownerAta.toBase58(),
  recipientWallet: recipient.publicKey.toBase58(),
  recipientAta: recipientAta.toBase58(),
  decimals,
  currentEpoch: epochInfo.epoch,
  freshSupplyUi: FRESH_SUPPLY_UI.toString(),
  freshSupplyRaw: freshSupplyRaw.toString(),
  transferAmountUi: TRANSFER_AMOUNT_UI.toString(),
  transferAmountRaw: transferAmountRaw.toString(),
  expectedFeeRaw: expectedFeeRaw.toString(),
  expectedFeeUi: rawToUiString(expectedFeeRaw, decimals),
  balances: {
    ownerBefore: ownerAccountBefore.amount.toString(),
    ownerAfterMint: ownerAccountAfterMint.amount.toString(),
    ownerAfterTransfer: ownerAccountAfterTransfer.amount.toString(),
    ownerAfterWithdraw: ownerAccountAfterWithdraw.amount.toString(),
    recipientAfterTransfer: recipientAccountBeforeWithdraw.amount.toString(),
    recipientAfterWithdraw: recipientAccountAfterWithdraw.amount.toString(),
  },
  withheld: {
    beforeWithdrawRaw: recipientFeeBeforeWithdraw.withheldAmount.toString(),
    afterWithdrawRaw: recipientFeeAfterWithdraw.withheldAmount.toString(),
  },
  signatures: {
    mintFreshSupply: mintFreshSupplySignature,
    createRecipientAta: createRecipientAtaSignature,
    transfer: transferSignature,
    withdrawWithheld: withdrawSignature,
  },
  explorerUrls: {
    mint: `https://explorer.solana.com/address/${mintKey.toBase58()}?cluster=devnet`,
    ownerAta: `https://explorer.solana.com/address/${ownerAta.toBase58()}?cluster=devnet`,
    recipientAta: `https://explorer.solana.com/address/${recipientAta.toBase58()}?cluster=devnet`,
  },
};

const transcript = buildTerminalTranscript({
  mint: result.mint,
  recipientWallet: result.recipientWallet,
  recipientAta: result.recipientAta,
  ownerAta: result.ownerAta,
  transferAmountUi: TRANSFER_AMOUNT_UI.toString(),
  expectedFeeUi: result.expectedFeeUi,
  recipientAmountAfterTransferUi: rawToUiString(recipientAccountBeforeWithdraw.amount, decimals),
  recipientWithheldBeforeUi: rawToUiString(recipientFeeBeforeWithdraw.withheldAmount, decimals),
  recipientWithheldAfterUi: rawToUiString(recipientFeeAfterWithdraw.withheldAmount, decimals),
  ownerBalanceAfterWithdrawUi: rawToUiString(ownerAccountAfterWithdraw.amount, decimals),
  createRecipientAtaSignature,
  mintFreshSupplySignature,
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
  decimals,
  freshSupplyRaw,
  transferAmountRaw,
  expectedFeeRaw,
  recipientAmountAfterTransferRaw: recipientAccountBeforeWithdraw.amount,
  recipientWithheldBeforeRaw: recipientFeeBeforeWithdraw.withheldAmount,
  recipientWithheldAfterRaw: recipientFeeAfterWithdraw.withheldAmount,
  ownerBalanceBeforeRaw: ownerAccountBefore.amount,
  ownerBalanceAfterMintRaw: ownerAccountAfterMint.amount,
  ownerBalanceAfterTransferRaw: ownerAccountAfterTransfer.amount,
  ownerBalanceAfterWithdrawRaw: ownerAccountAfterWithdraw.amount,
  mintFreshSupplySignature,
  createRecipientAtaSignature,
  transferSignature,
  withdrawSignature,
});

await writeFile(OUTPUT_TEXT_FILE, `${transcript}\n`, "utf8");
await writeFile(OUTPUT_JSON_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(OUTPUT_MARKDOWN_FILE, markdown, "utf8");
await writeFile(OUTPUT_HTML_FILE, buildTerminalHtml(transcript), "utf8");

console.log(transcript);
