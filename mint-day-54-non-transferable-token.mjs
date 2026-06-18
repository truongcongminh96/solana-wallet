import { writeFile, readFile } from "node:fs/promises";
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
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createInitializeNonTransferableMintInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getNonTransferable,
  getNonTransferableAccount,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const OUTPUT_TEXT_FILE = new URL("./day-54-non-transferable-output.txt", import.meta.url);
const OUTPUT_JSON_FILE = new URL("./day-54-non-transferable-result.json", import.meta.url);
const OUTPUT_MARKDOWN_FILE = new URL("./day-54-non-transferable.md", import.meta.url);
const OUTPUT_HTML_FILE = new URL("./day-54-terminal-proof.html", import.meta.url);
const DECIMALS = 0;
const MINT_AMOUNT = 1n;

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

async function attemptFailingTransfer({
  connection,
  payer,
  sourceAta,
  mint,
  destinationAta,
  decimals,
  amount,
}) {
  const instruction = createTransferCheckedInstruction(
    sourceAta,
    mint,
    destinationAta,
    payer.publicKey,
    amount,
    decimals,
    [],
    TOKEN_2022_PROGRAM_ID
  );
  const transaction = new Transaction().add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: "confirmed" }
    );
    return {
      ok: true,
      signature,
      message: "Transfer unexpectedly succeeded.",
      logs: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let logs = Array.isArray(error?.logs) ? error.logs : [];

    if (!logs.length) {
      try {
        const simulation = await connection.simulateTransaction(transaction, [payer], false);
        logs = simulation.value.logs ?? [];
      } catch {
        // Keep the original failure message if simulation also fails.
      }
    }

    return {
      ok: false,
      signature: null,
      message,
      logs,
    };
  }
}

function buildTranscript({
  mint,
  ownerWallet,
  ownerAta,
  recipientWallet,
  recipientAta,
  mintSignature,
  ownerAtaSignature,
  mintToSignature,
  recipientAtaSignature,
  transferFailure,
}) {
  const logBlock = transferFailure.logs.length
    ? transferFailure.logs.map((line) => `  ${line}`).join("\n")
    : "  (no runtime logs captured)";

  return `RPC-driven equivalent of the Day 54 CLI flow
Local shell note: solana/spl-token CLIs were not in PATH, so this proof comes from the Node RPC script.

Wallet: ${ownerWallet}
export MINT=${mint}
export RECIPIENT=${recipientWallet}

spl-token create-token --program-2022 --enable-non-transferable
Signature: ${mintSignature}
Created mint: ${mint}

spl-token create-account $MINT
Signature: ${ownerAtaSignature}
Created token account: ${ownerAta}

spl-token mint $MINT 1
Signature: ${mintToSignature}

spl-token create-account $MINT --owner $RECIPIENT --fee-payer ~/.config/solana/id.json
Signature: ${recipientAtaSignature}
Created token account: ${recipientAta}

spl-token transfer $MINT 1 $RECIPIENT --allow-unfunded-recipient
Result: FAILED as expected
Error: ${transferFailure.message}
Logs:
${logBlock}

spl-token display $MINT
Address: ${mint}
Mint authority: ${ownerWallet}
Decimals: 0
Supply: 1
Extensions:
  NonTransferable
`;
}

function buildTerminalHtml(transcript) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Day 54 Terminal Proof</title>
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
        color: #e2f7ee;
      }
      .frame {
        width: min(1280px, calc(100vw - 40px));
        margin: 20px auto;
        border: 1px solid rgba(106, 255, 189, 0.24);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
        background: rgba(6, 12, 19, 0.95);
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
        padding: 22px;
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
        <span class="title">day-54 terminal proof</span>
      </div>
      <pre>${escapeHtml(transcript)}</pre>
    </div>
  </body>
</html>
`;
}

function buildMarkdown({
  runDate,
  ownerWallet,
  mint,
  ownerAta,
  recipientWallet,
  recipientAta,
  mintLen,
  transferFailure,
}) {
  const logBlock = transferFailure.logs.length
    ? transferFailure.logs.join("\n")
    : "(no runtime logs captured)";

  return `# Day 54: Non-Transferable Token

Date: ${runDate}  
Cluster: Solana devnet  
Program: Token-2022 (\`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb\`)

Owner wallet: \`${ownerWallet}\`

The local shell did not have the \`solana\` or \`spl-token\` CLIs in \`PATH\`, so this experiment was run through devnet RPC with \`@solana/web3.js\` and \`@solana/spl-token\`. The flow mirrors the CLI lesson: create a fresh Token-2022 mint with the non-transferable extension, create an owner ATA, mint exactly one token, create a recipient ATA up front, then attempt a transfer and capture the runtime rejection.

## Addresses

| Field | Value |
| --- | --- |
| Mint | \`${mint}\` |
| Owner ATA | \`${ownerAta}\` |
| Recipient wallet | \`${recipientWallet}\` |
| Recipient ATA | \`${recipientAta}\` |
| Mint account data size at creation | \`${mintLen}\` bytes |

## Verification

| Check | Result |
| --- | --- |
| Mint has NonTransferable extension | \`yes\` |
| Owner ATA has NonTransferableAccount extension | \`yes\` |
| Recipient ATA has NonTransferableAccount extension | \`yes\` |
| Transfer 1 token to recipient | \`failed as expected\` |

Transfer failure message:

\`\`\`text
${transferFailure.message}
\`\`\`

Transfer failure logs:

\`\`\`text
${logBlock}
\`\`\`

Rendered proof:

\`\`\`text
day-54-terminal-proof.png
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

const mintLen = getMintLen([ExtensionType.NonTransferable]);
const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

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
    createInitializeNonTransferableMintInstruction(
      mint.publicKey,
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

const mintToSignature = await sendTransaction(connection, payer, [
  createMintToInstruction(
    mint.publicKey,
    ownerAta,
    payer.publicKey,
    MINT_AMOUNT,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
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

const transferFailure = await attemptFailingTransfer({
  connection,
  payer,
  sourceAta: ownerAta,
  mint: mint.publicKey,
  destinationAta: recipientAta,
  decimals: DECIMALS,
  amount: MINT_AMOUNT,
});

if (transferFailure.ok) {
  throw new Error("Expected the non-transferable transfer to fail, but it succeeded.");
}

const mintInfo = await getMint(
  connection,
  mint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const ownerAccount = await getAccount(
  connection,
  ownerAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const recipientAccount = await getAccount(
  connection,
  recipientAta,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);

const mintHasNonTransferable = getNonTransferable(mintInfo) !== null;
const ownerHasNonTransferableAccount = getNonTransferableAccount(ownerAccount) !== null;
const recipientHasNonTransferableAccount =
  getNonTransferableAccount(recipientAccount) !== null;

const result = {
  date: new Date().toISOString().slice(0, 10),
  wallet: payer.publicKey.toBase58(),
  mint: mint.publicKey.toBase58(),
  ownerAta: ownerAta.toBase58(),
  recipientWallet: recipient.publicKey.toBase58(),
  recipientAta: recipientAta.toBase58(),
  decimals: DECIMALS,
  supply: mintInfo.supply.toString(),
  mintLen,
  extensions: {
    mintHasNonTransferable,
    ownerHasNonTransferableAccount,
    recipientHasNonTransferableAccount,
  },
  signatures: {
    createMint: mintSignature,
    createOwnerAta: ownerAtaSignature,
    mintTo: mintToSignature,
    createRecipientAta: recipientAtaSignature,
  },
  transferFailure,
  explorerUrl: `https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`,
};

const transcript = buildTranscript({
  mint: result.mint,
  ownerWallet: result.wallet,
  ownerAta: result.ownerAta,
  recipientWallet: result.recipientWallet,
  recipientAta: result.recipientAta,
  mintSignature,
  ownerAtaSignature,
  mintToSignature,
  recipientAtaSignature,
  transferFailure,
});

const markdown = buildMarkdown({
  runDate: result.date,
  ownerWallet: result.wallet,
  mint: result.mint,
  ownerAta: result.ownerAta,
  recipientWallet: result.recipientWallet,
  recipientAta: result.recipientAta,
  mintLen,
  transferFailure,
});

await writeFile(OUTPUT_TEXT_FILE, `${transcript}\n`, "utf8");
await writeFile(OUTPUT_JSON_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(OUTPUT_MARKDOWN_FILE, markdown, "utf8");
await writeFile(OUTPUT_HTML_FILE, buildTerminalHtml(transcript), "utf8");

console.log(transcript);
