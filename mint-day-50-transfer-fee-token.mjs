import { readFile, writeFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createInitializeTransferFeeConfigInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getTransferFeeConfig,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const DECIMALS = 6;
const TRANSFER_FEE_BASIS_POINTS = 100;
const MAXIMUM_FEE_UI = 1_000_000n;
const INITIAL_SUPPLY_UI = 1_000n;
const VERIFICATION_TRANSFER_UI = 1_000n;
const OUTPUT_TEXT_FILE = new URL("./day-50-transfer-fee-output.txt", import.meta.url);
const OUTPUT_JSON_FILE = new URL("./day-50-transfer-fee-result.json", import.meta.url);
const OUTPUT_MARKDOWN_FILE = new URL("./day-50-token-2022-transfer-fee.md", import.meta.url);

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

function buildReport({
  runDate,
  wallet,
  balanceSol,
  mintAddress,
  ownerAta,
  mintLen,
  mintSignature,
  accountSignature,
  mintToSignature,
  currentEpoch,
  transferFeeConfig,
  maximumFeeRaw,
  initialSupplyRaw,
  verificationAmountRaw,
  verificationFeeRaw,
}) {
  const explorerUrl = `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`;

  return `# Day 50: Fee-Bearing Token with Token-2022

Date: ${runDate}
Cluster: Solana devnet
Program: Token-2022 (${TOKEN_2022_PROGRAM_ID.toBase58()})

Owner wallet: ${wallet}
Starting balance: ${balanceSol} SOL

Mint: ${mintAddress}
Owner ATA: ${ownerAta}
Mint account size: ${mintLen} bytes
Decimals: ${DECIMALS}
Initial supply minted: ${INITIAL_SUPPLY_UI} tokens (${initialSupplyRaw} raw units)

Extensions
  TransferFeeConfig
    transferFeeConfigAuthority: ${transferFeeConfig.transferFeeConfigAuthority.toBase58()}
    withdrawWithheldAuthority: ${transferFeeConfig.withdrawWithheldAuthority.toBase58()}
    withheldAmount: ${transferFeeConfig.withheldAmount} raw units
    olderTransferFee:
      epoch: ${transferFeeConfig.olderTransferFee.epoch}
      transferFeeBasisPoints: ${transferFeeConfig.olderTransferFee.transferFeeBasisPoints}
      maximumFee: ${transferFeeConfig.olderTransferFee.maximumFee} raw units (${MAXIMUM_FEE_UI} tokens)
    newerTransferFee:
      epoch: ${transferFeeConfig.newerTransferFee.epoch}
      transferFeeBasisPoints: ${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}
      maximumFee: ${transferFeeConfig.newerTransferFee.maximumFee} raw units (${MAXIMUM_FEE_UI} tokens)

Verification
  Current epoch: ${currentEpoch}
  Fee on a ${VERIFICATION_TRANSFER_UI}-token transfer at ${TRANSFER_FEE_BASIS_POINTS} bps: ${verificationFeeRaw} raw units (${rawToUiString(verificationFeeRaw)} tokens)

Transaction signatures
  Create mint with Transfer Fee extension: ${mintSignature}
  Create owner ATA: ${accountSignature}
  Mint initial supply: ${mintToSignature}

Explorer
  ${explorerUrl}
`;
}

function buildMarkdown({
  runDate,
  wallet,
  mintAddress,
  ownerAta,
  mintLen,
  mintSignature,
  accountSignature,
  mintToSignature,
  currentEpoch,
  transferFeeConfig,
  maximumFeeRaw,
  initialSupplyRaw,
  verificationFeeRaw,
}) {
  const explorerUrl = `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`;

  return `# Day 50: Fee-Bearing Token with Token-2022

Date: ${runDate}  
Cluster: Solana devnet  
Program: Token-2022 (\`${TOKEN_2022_PROGRAM_ID.toBase58()}\`)

Owner wallet: \`${wallet}\`

The local shell did not have the \`solana\` or \`spl-token\` CLIs in \`PATH\`, so this experiment was run through devnet RPC with \`@solana/web3.js\` and \`@solana/spl-token\`. The flow matches the CLI lesson: create a Token-2022 fungible mint with the Transfer Fee extension, create the owner ATA, mint an initial 1,000-token supply, and read the mint back on-chain to confirm the embedded fee rule.

## Mint

| Field | Value |
| --- | --- |
| Mint | \`${mintAddress}\` |
| Owner ATA | \`${ownerAta}\` |
| Decimals | \`${DECIMALS}\` |
| Initial supply | \`${INITIAL_SUPPLY_UI}\` tokens (\`${initialSupplyRaw}\` raw units) |
| Mint authority | \`${wallet}\` |
| Mint account data size at creation | \`${mintLen}\` bytes |

Explorer:

\`\`\`text
${explorerUrl}
\`\`\`

Explorer screenshot:

\`\`\`text
day-50-transfer-fee-extensions.png
\`\`\`

## Transfer Fee Config

| Field | Value |
| --- | --- |
| Transfer fee config authority | \`${transferFeeConfig.transferFeeConfigAuthority.toBase58()}\` |
| Withdraw withheld authority | \`${transferFeeConfig.withdrawWithheldAuthority.toBase58()}\` |
| Withheld amount on mint | \`${transferFeeConfig.withheldAmount}\` raw units |
| Older fee epoch | \`${transferFeeConfig.olderTransferFee.epoch}\` |
| Older fee basis points | \`${transferFeeConfig.olderTransferFee.transferFeeBasisPoints}\` |
| Older maximum fee | \`${transferFeeConfig.olderTransferFee.maximumFee}\` raw units (\`${MAXIMUM_FEE_UI}\` tokens) |
| Newer fee epoch | \`${transferFeeConfig.newerTransferFee.epoch}\` |
| Newer fee basis points | \`${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}\` |
| Newer maximum fee | \`${transferFeeConfig.newerTransferFee.maximumFee}\` raw units (\`${MAXIMUM_FEE_UI}\` tokens) |

## Transaction Signatures

| Action | Signature |
| --- | --- |
| Create mint and initialize Transfer Fee config | \`${mintSignature}\` |
| Create owner ATA | \`${accountSignature}\` |
| Mint initial supply | \`${mintToSignature}\` |

## Verification

Script read-back after minting:

\`\`\`text
Current epoch: ${currentEpoch}
Transfer fee basis points: ${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}
Maximum fee (raw): ${maximumFeeRaw}
Maximum fee (UI): ${MAXIMUM_FEE_UI}
Fee on ${VERIFICATION_TRANSFER_UI} tokens: ${rawToUiString(verificationFeeRaw)} tokens
\`\`\`
`;
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const balanceLamports = await connection.getBalance(payer.publicKey);
const mint = Keypair.generate();
const ownerAta = getAssociatedTokenAddressSync(
  mint.publicKey,
  payer.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);

const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
const maximumFeeRaw = uiAmountToRaw(MAXIMUM_FEE_UI);
const initialSupplyRaw = uiAmountToRaw(INITIAL_SUPPLY_UI);
const verificationAmountRaw = uiAmountToRaw(VERIFICATION_TRANSFER_UI);

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

const accountSignature = await sendTransaction(connection, payer, [
  createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ownerAta,
    payer.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
]);

const mintToSignature = await sendTransaction(connection, payer, [
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
if (!transferFeeConfig) {
  throw new Error("TransferFeeConfig extension was not found on the mint.");
}

const epochInfo = await connection.getEpochInfo("confirmed");
const verificationFeeRaw = calculateEpochFee(
  transferFeeConfig,
  BigInt(epochInfo.epoch),
  verificationAmountRaw
);
const runDate = new Date().toISOString().slice(0, 10);
const balanceSol = (balanceLamports / 1_000_000_000).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");

const result = {
  date: runDate,
  wallet: payer.publicKey.toBase58(),
  mint: mint.publicKey.toBase58(),
  ownerAta: ownerAta.toBase58(),
  mintLen,
  decimals: DECIMALS,
  transferFeeBasisPoints: TRANSFER_FEE_BASIS_POINTS,
  maximumFeeUi: MAXIMUM_FEE_UI.toString(),
  maximumFeeRaw: maximumFeeRaw.toString(),
  initialSupplyUi: INITIAL_SUPPLY_UI.toString(),
  initialSupplyRaw: initialSupplyRaw.toString(),
  currentEpoch: epochInfo.epoch,
  verificationTransferUi: VERIFICATION_TRANSFER_UI.toString(),
  verificationFeeRaw: verificationFeeRaw.toString(),
  verificationFeeUi: rawToUiString(verificationFeeRaw),
  signatures: {
    createMint: mintSignature,
    createAccount: accountSignature,
    mintTo: mintToSignature,
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
  explorerUrl: `https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`,
};

const report = buildReport({
  runDate,
  wallet: result.wallet,
  balanceSol,
  mintAddress: result.mint,
  ownerAta: result.ownerAta,
  mintLen,
  mintSignature,
  accountSignature,
  mintToSignature,
  currentEpoch: epochInfo.epoch,
  transferFeeConfig,
  maximumFeeRaw,
  initialSupplyRaw,
  verificationAmountRaw,
  verificationFeeRaw,
});

const markdown = buildMarkdown({
  runDate,
  wallet: result.wallet,
  mintAddress: result.mint,
  ownerAta: result.ownerAta,
  mintLen,
  mintSignature,
  accountSignature,
  mintToSignature,
  currentEpoch: epochInfo.epoch,
  transferFeeConfig,
  maximumFeeRaw,
  initialSupplyRaw,
  verificationFeeRaw,
});

await writeFile(OUTPUT_TEXT_FILE, report, "utf8");
await writeFile(OUTPUT_JSON_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(OUTPUT_MARKDOWN_FILE, markdown, "utf8");

console.log(report);
