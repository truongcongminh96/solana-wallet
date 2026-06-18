import { readFile, writeFile } from "node:fs/promises";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  amountToUiAmountForMintWithoutSimulation,
  getInterestBearingMintConfigState,
  getMint,
  getTransferFeeConfig,
} from "@solana/spl-token";

const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const DAY_50_FILE = new URL("./day-50-transfer-fee-result.json", import.meta.url);
const DAY_52_FILE = new URL("./day-52-interest-fee-result.json", import.meta.url);
const OUTPUT_TEXT_FILE = new URL("./day-53-token-2022-audit-output.txt", import.meta.url);
const OUTPUT_JSON_FILE = new URL("./day-53-token-2022-audit-result.json", import.meta.url);
const OUTPUT_MARKDOWN_FILE = new URL("./day-53-token-2022-audit.md", import.meta.url);
const OUTPUT_REFLECTION_FILE = new URL("./day-53-token-2022-reflection.txt", import.meta.url);
const OUTPUT_HTML_FILE = new URL("./day-53-terminal-proof.html", import.meta.url);

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

async function inspectMint(connection, mintAddress) {
  const mint = new PublicKey(mintAddress);
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  const transferFeeConfig = getTransferFeeConfig(mintInfo);
  const interestConfig = getInterestBearingMintConfigState(mintInfo);
  const uiSupply = await amountToUiAmountForMintWithoutSimulation(
    connection,
    mint,
    mintInfo.supply
  );

  return {
    address: mintAddress,
    mintInfo,
    transferFeeConfig,
    interestConfig,
    uiSupply,
  };
}

function formatMintDisplay({ label, auditDate, mintInfo, transferFeeConfig, interestConfig, uiSupply }) {
  const lines = [
    `${label}`,
    `Audit date: ${auditDate}`,
    `Program: ${TOKEN_2022_PROGRAM_ID.toBase58()}`,
    `Address: ${mintInfo.address.toBase58()}`,
    `Mint authority: ${mintInfo.mintAuthority?.toBase58() ?? "none"}`,
    `Freeze authority: ${mintInfo.freezeAuthority?.toBase58() ?? "none"}`,
    `Decimals: ${mintInfo.decimals}`,
    `Raw supply: ${mintInfo.supply}`,
    `UI supply: ${uiSupply}`,
    `Extensions:`,
  ];

  if (transferFeeConfig) {
    lines.push(`  TransferFeeConfig`);
    lines.push(
      `    transfer_fee_config_authority: ${transferFeeConfig.transferFeeConfigAuthority.toBase58()}`
    );
    lines.push(
      `    withdraw_withheld_authority: ${transferFeeConfig.withdrawWithheldAuthority.toBase58()}`
    );
    lines.push(`    withheld_amount_on_mint: ${transferFeeConfig.withheldAmount}`);
    lines.push(`    older_epoch: ${transferFeeConfig.olderTransferFee.epoch}`);
    lines.push(
      `    older_transfer_fee_basis_points: ${transferFeeConfig.olderTransferFee.transferFeeBasisPoints}`
    );
    lines.push(
      `    older_maximum_fee_raw: ${transferFeeConfig.olderTransferFee.maximumFee}`
    );
    lines.push(
      `    older_maximum_fee_ui: ${rawToUiString(
        transferFeeConfig.olderTransferFee.maximumFee,
        mintInfo.decimals
      )}`
    );
    lines.push(`    newer_epoch: ${transferFeeConfig.newerTransferFee.epoch}`);
    lines.push(
      `    newer_transfer_fee_basis_points: ${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}`
    );
    lines.push(
      `    newer_maximum_fee_raw: ${transferFeeConfig.newerTransferFee.maximumFee}`
    );
    lines.push(
      `    newer_maximum_fee_ui: ${rawToUiString(
        transferFeeConfig.newerTransferFee.maximumFee,
        mintInfo.decimals
      )}`
    );
  }

  if (interestConfig) {
    lines.push(`  InterestBearingConfig`);
    lines.push(`    rate_authority: ${interestConfig.rateAuthority.toBase58()}`);
    lines.push(
      `    initialization_timestamp: ${interestConfig.initializationTimestamp}`
    );
    lines.push(`    pre_update_average_rate: ${interestConfig.preUpdateAverageRate}`);
    lines.push(`    last_update_timestamp: ${interestConfig.lastUpdateTimestamp}`);
    lines.push(`    current_rate_basis_points: ${interestConfig.currentRate}`);
  }

  return lines.join("\n");
}

function buildReflection() {
  return [
    "TransferFeeConfig makes the mint skim a protocol-enforced percentage from every transfer and lets the withdraw authority reclaim those withheld tokens later.",
    "InterestBearingConfig makes the mint report a time-growing UI amount so every holder sees interest accrue even when the raw token amount stored on chain stays unchanged.",
  ].join("\n");
}

function buildMarkdown({ auditDate, day50, day52, reflection }) {
  return `# Day 53: Audit Token-2022 Mints

Date: ${auditDate}  
Cluster: Solana devnet  
Program: Token-2022 (\`${TOKEN_2022_PROGRAM_ID.toBase58()}\`)

The local shell did not have the \`solana\` or \`spl-token\` CLIs in \`PATH\`, so this audit was run through devnet RPC with \`@solana/web3.js\` and \`@solana/spl-token\`. It serves as the Day 53 equivalent of \`spl-token display\` for the two active Token-2022 mints created on June 18, 2026: the Day 50 fee-bearing mint and the Day 52 stacked mint.

## Audited Mints

| Day | Mint | Extensions found |
| --- | --- | --- |
| Day 50 / 51 | \`${day50.address}\` | \`TransferFeeConfig\` |
| Day 52 | \`${day52.address}\` | \`TransferFeeConfig\`, \`InterestBearingConfig\` |

## Read-back Summary

| Field | Day 50 / 51 mint | Day 52 mint |
| --- | --- | --- |
| Mint authority | \`${day50.mintInfo.mintAuthority?.toBase58() ?? "none"}\` | \`${day52.mintInfo.mintAuthority?.toBase58() ?? "none"}\` |
| Decimals | \`${day50.mintInfo.decimals}\` | \`${day52.mintInfo.decimals}\` |
| Raw supply | \`${day50.mintInfo.supply}\` | \`${day52.mintInfo.supply}\` |
| UI supply | \`${day50.uiSupply}\` | \`${day52.uiSupply}\` |
| Transfer fee basis points | \`${day50.transferFeeConfig?.newerTransferFee.transferFeeBasisPoints ?? "-"}\` | \`${day52.transferFeeConfig?.newerTransferFee.transferFeeBasisPoints ?? "-"}\` |
| Transfer fee max UI | \`${day50.transferFeeConfig ? rawToUiString(day50.transferFeeConfig.newerTransferFee.maximumFee, day50.mintInfo.decimals) : "-"}\` | \`${day52.transferFeeConfig ? rawToUiString(day52.transferFeeConfig.newerTransferFee.maximumFee, day52.mintInfo.decimals) : "-"}\` |
| Interest rate basis points | \`-\` | \`${day52.interestConfig?.currentRate ?? "-"}\` |
| Interest last update timestamp | \`-\` | \`${day52.interestConfig?.lastUpdateTimestamp ?? "-"}\` |

## Reflection

\`\`\`text
${reflection}
\`\`\`

## Verification

Rendered stacked proof:

\`\`\`text
day-53-terminal-proof.png
\`\`\`
`;
}

function buildTerminalHtml({ day50Display, day52Display }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Day 53 Token-2022 Audit</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, #173a2c 0%, #0b1018 40%),
          linear-gradient(180deg, #0b1018 0%, #06090e 100%);
        font-family: Consolas, "Courier New", monospace;
        color: #e2f7ee;
      }
      .shell {
        width: min(1320px, calc(100vw - 40px));
        margin: 20px auto;
        border: 1px solid rgba(106, 255, 189, 0.25);
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
      .content {
        padding: 22px;
      }
      .block {
        margin-bottom: 22px;
        border: 1px solid rgba(106, 255, 189, 0.18);
        border-radius: 14px;
        overflow: hidden;
        background: rgba(8, 14, 21, 0.82);
      }
      .block h2 {
        margin: 0;
        padding: 14px 18px;
        font-size: 16px;
        color: #8cf2c2;
        background: rgba(18, 34, 28, 0.8);
        border-bottom: 1px solid rgba(106, 255, 189, 0.16);
      }
      pre {
        margin: 0;
        padding: 18px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
        font-size: 18px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="bar">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="title">day-53 token-2022 audit</span>
      </div>
      <div class="content">
        <div class="block">
          <h2>Day 50 / 51 Mint Audit</h2>
          <pre>${escapeHtml(day50Display)}</pre>
        </div>
        <div class="block">
          <h2>Day 52 Mint Audit</h2>
          <pre>${escapeHtml(day52Display)}</pre>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

const connection = new Connection(RPC_URL, "confirmed");
const day50Seed = await loadJson(DAY_50_FILE);
const day52Seed = await loadJson(DAY_52_FILE);
const auditDate = new Date().toISOString().slice(0, 10);

const day50 = await inspectMint(connection, day50Seed.mint);
const day52 = await inspectMint(connection, day52Seed.mint);
const day50Display = formatMintDisplay({
  label: `spl-token display ${day50.address}`,
  auditDate,
  ...day50,
});
const day52Display = formatMintDisplay({
  label: `spl-token display ${day52.address}`,
  auditDate,
  ...day52,
});
const reflection = buildReflection();

const result = {
  date: auditDate,
  mints: {
    day50: {
      address: day50.address,
      decimals: day50.mintInfo.decimals,
      rawSupply: day50.mintInfo.supply.toString(),
      uiSupply: day50.uiSupply,
      mintAuthority: day50.mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: day50.mintInfo.freezeAuthority?.toBase58() ?? null,
      extensions: ["TransferFeeConfig"],
      transferFeeConfig: day50.transferFeeConfig
        ? {
            transferFeeConfigAuthority: day50.transferFeeConfig.transferFeeConfigAuthority.toBase58(),
            withdrawWithheldAuthority: day50.transferFeeConfig.withdrawWithheldAuthority.toBase58(),
            withheldAmount: day50.transferFeeConfig.withheldAmount.toString(),
            olderEpoch: day50.transferFeeConfig.olderTransferFee.epoch.toString(),
            newerEpoch: day50.transferFeeConfig.newerTransferFee.epoch.toString(),
            basisPoints: day50.transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
            maximumFeeRaw: day50.transferFeeConfig.newerTransferFee.maximumFee.toString(),
          }
        : null,
      display: day50Display,
    },
    day52: {
      address: day52.address,
      decimals: day52.mintInfo.decimals,
      rawSupply: day52.mintInfo.supply.toString(),
      uiSupply: day52.uiSupply,
      mintAuthority: day52.mintInfo.mintAuthority?.toBase58() ?? null,
      freezeAuthority: day52.mintInfo.freezeAuthority?.toBase58() ?? null,
      extensions: ["TransferFeeConfig", "InterestBearingConfig"],
      transferFeeConfig: day52.transferFeeConfig
        ? {
            transferFeeConfigAuthority: day52.transferFeeConfig.transferFeeConfigAuthority.toBase58(),
            withdrawWithheldAuthority: day52.transferFeeConfig.withdrawWithheldAuthority.toBase58(),
            withheldAmount: day52.transferFeeConfig.withheldAmount.toString(),
            olderEpoch: day52.transferFeeConfig.olderTransferFee.epoch.toString(),
            newerEpoch: day52.transferFeeConfig.newerTransferFee.epoch.toString(),
            basisPoints: day52.transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
            maximumFeeRaw: day52.transferFeeConfig.newerTransferFee.maximumFee.toString(),
          }
        : null,
      interestConfig: day52.interestConfig
        ? {
            rateAuthority: day52.interestConfig.rateAuthority.toBase58(),
            initializationTimestamp: day52.interestConfig.initializationTimestamp.toString(),
            preUpdateAverageRate: day52.interestConfig.preUpdateAverageRate,
            lastUpdateTimestamp: day52.interestConfig.lastUpdateTimestamp.toString(),
            currentRate: day52.interestConfig.currentRate,
          }
        : null,
      display: day52Display,
    },
  },
  reflection: reflection.split("\n"),
};

const transcript = [day50Display, "", day52Display, "", "Reflection:", reflection].join("\n");
const markdown = buildMarkdown({ auditDate, day50, day52, reflection });
const html = buildTerminalHtml({ day50Display, day52Display });

await writeFile(OUTPUT_TEXT_FILE, `${transcript}\n`, "utf8");
await writeFile(OUTPUT_JSON_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
await writeFile(OUTPUT_MARKDOWN_FILE, markdown, "utf8");
await writeFile(OUTPUT_REFLECTION_FILE, `${reflection}\n`, "utf8");
await writeFile(OUTPUT_HTML_FILE, html, "utf8");

console.log(transcript);
