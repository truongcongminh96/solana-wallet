import { address, createSolanaRpc, devnet } from "@solana/kit";

const LAMPORTS_PER_SOL = 1_000_000_000;
const DATA_PREVIEW_LENGTH = 96;
const DEVNET_RPC_ENDPOINT = "https://api.devnet.solana.com";

const KNOWN_PROGRAMS = {
  "11111111111111111111111111111111": "System Program",
  BPFLoaderUpgradeab1e11111111111111111111111: "BPF Loader Upgradeable",
  Config1111111111111111111111111111111111111: "Config Program",
  Stake11111111111111111111111111111111111111: "Stake Program",
  Vote111111111111111111111111111111111111111: "Vote Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token 2022 Program",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token Program",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo Program",
};

const rpc = createSolanaRpc(devnet(DEVNET_RPC_ENDPOINT));
const input = process.argv[2];

function usage() {
  console.error("Usage: node explorer.mjs <SOLANA_ADDRESS>");
  console.error(
    "Example: node explorer.mjs TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );
}

function formatProgramName(programAddress) {
  const addressString = String(programAddress);
  const name = KNOWN_PROGRAMS[addressString];

  return name ? `${name} (${addressString})` : addressString;
}

function formatDataPreview(data) {
  const [base64Data] = data;
  const byteLength = Buffer.from(base64Data, "base64").length;

  if (byteLength === 0) {
    return {
      byteLength,
      preview: "(empty)",
    };
  }

  const truncated =
    base64Data.length > DATA_PREVIEW_LENGTH
      ? `${base64Data.slice(0, DATA_PREVIEW_LENGTH)}...`
      : base64Data;

  return {
    byteLength,
    preview: truncated,
  };
}

function printAccountSummary(accountAddress, balanceInLamports, accountInfo) {
  const balanceInSol = Number(balanceInLamports) / LAMPORTS_PER_SOL;
  const { byteLength, preview } = formatDataPreview(accountInfo.data);

  console.log("\nSolana Account Explorer");
  console.log("=======================");
  console.log(`Cluster    : Devnet`);
  console.log(`RPC        : ${DEVNET_RPC_ENDPOINT}`);
  console.log(`Address    : ${accountAddress}`);
  console.log(`Balance    : ${balanceInLamports} lamports (${balanceInSol} SOL)`);
  console.log(`Owner      : ${formatProgramName(accountInfo.owner)}`);
  console.log(`Executable : ${accountInfo.executable}`);
  console.log(`Rent epoch : ${accountInfo.rentEpoch}`);
  console.log(`Data       : ${byteLength} bytes`);
  console.log(`Data peek  : ${preview}`);
  console.log("");
}

if (!input) {
  usage();
  process.exit(1);
}

let accountAddress;

try {
  accountAddress = address(input);
} catch {
  console.error(`Invalid Solana address: ${input}`);
  usage();
  process.exit(1);
}

const [{ value: balanceInLamports }, { value: accountInfo }] = await Promise.all([
  rpc.getBalance(accountAddress).send(),
  rpc.getAccountInfo(accountAddress, { encoding: "base64" }).send(),
]);

if (!accountInfo) {
  console.log(`Account not found on devnet: ${accountAddress}`);
  process.exit(0);
}

printAccountSummary(accountAddress, balanceInLamports, accountInfo);
