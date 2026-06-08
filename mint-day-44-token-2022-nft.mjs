import { readFile } from "node:fs/promises";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getTokenMetadata,
  tokenMetadataInitializeWithRentTransfer,
  tokenMetadataUpdateFieldWithRentTransfer,
} from "@solana/spl-token";
import {
  createUpdateAuthorityInstruction,
} from "@solana/spl-token-metadata";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const METADATA_URI = process.env.METADATA_URI;

const NFT = {
  name: "First Light",
  symbol: "LIGHT",
};

if (!METADATA_URI) {
  throw new Error("Set METADATA_URI to the public raw metadata.json URL.");
}

async function loadKeypair(fileUrl) {
  const secretKey = JSON.parse(await readFile(fileUrl, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function sendTransaction(connection, payer, instructions, signers = []) {
  const transaction = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers],
    { commitment: "confirmed" }
  );
  return signature;
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const mint = Keypair.generate();
const ata = getAssociatedTokenAddressSync(
  mint.publicKey,
  payer.publicKey,
  false,
  TOKEN_2022_PROGRAM_ID
);

const mintLen = getMintLen([ExtensionType.MetadataPointer]);
const rentLamports = await connection.getMinimumBalanceForRentExemption(
  mintLen
);
const balanceLamports = await connection.getBalance(payer.publicKey);

console.log(`Wallet: ${payer.publicKey.toBase58()}`);
console.log(`Starting balance: ${balanceLamports / 1_000_000_000} SOL`);
console.log(`Mint: ${mint.publicKey.toBase58()}`);
console.log(`Associated token account: ${ata.toBase58()}`);
console.log(`Metadata URI: ${METADATA_URI}`);
console.log(`Mint account size: ${mintLen} bytes`);

const createMintSignature = await sendTransaction(
  connection,
  payer,
  [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: rentLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      payer.publicKey,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMint2Instruction(
      mint.publicKey,
      0,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
  ],
  [mint]
);
console.log(`Create mint and initialize metadata pointer: ${createMintSignature}`);

const initializeMetadataSignature = await tokenMetadataInitializeWithRentTransfer(
  connection,
  payer,
  mint.publicKey,
  payer.publicKey,
  payer,
  NFT.name,
  NFT.symbol,
  METADATA_URI,
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);
console.log(`Initialize token metadata: ${initializeMetadataSignature}`);

const addFiltersTraitSignature = await tokenMetadataUpdateFieldWithRentTransfer(
  connection,
  payer,
  mint.publicKey,
  payer,
  "Filters",
  "44",
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);
console.log(`Add Filters metadata trait: ${addFiltersTraitSignature}`);

const addNetworkTraitSignature = await tokenMetadataUpdateFieldWithRentTransfer(
  connection,
  payer,
  mint.publicKey,
  payer,
  "Network",
  "Devnet",
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);
console.log(`Add Network metadata trait: ${addNetworkTraitSignature}`);

const mintOneSignature = await sendTransaction(connection, payer, [
  createAssociatedTokenAccountInstruction(
    payer.publicKey,
    ata,
    payer.publicKey,
    mint.publicKey,
    TOKEN_2022_PROGRAM_ID
  ),
  createMintToInstruction(
    mint.publicKey,
    ata,
    payer.publicKey,
    1n,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
]);
console.log(`Create ATA and mint one: ${mintOneSignature}`);

const lockSignature = await sendTransaction(connection, payer, [
  createSetAuthorityInstruction(
    mint.publicKey,
    payer.publicKey,
    AuthorityType.MintTokens,
    null,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
  createUpdateAuthorityInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint.publicKey,
    oldAuthority: payer.publicKey,
    newAuthority: null,
  }),
]);
console.log(`Disable mint and metadata update authorities: ${lockSignature}`);

const mintInfo = await getMint(
  connection,
  mint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const metadataInfo = await getTokenMetadata(
  connection,
  mint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);

console.log(`Supply: ${mintInfo.supply}`);
console.log(`Decimals: ${mintInfo.decimals}`);
console.log(`Mint authority: ${mintInfo.mintAuthority?.toBase58() ?? "none"}`);
console.log(`Metadata name: ${metadataInfo?.name ?? "missing"}`);
console.log(`Metadata symbol: ${metadataInfo?.symbol ?? "missing"}`);
console.log(`Metadata URI: ${metadataInfo?.uri ?? "missing"}`);
console.log(
  `Metadata update authority: ${
    metadataInfo?.updateAuthority?.toBase58() ?? "none"
  }`
);
console.log(
  `Explorer: https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`
);
