import { readFile } from "node:fs/promises";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getTokenMetadata,
  tokenMetadataRemoveKey,
  tokenMetadataUpdateFieldWithRentTransfer,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const MINT_ADDRESS =
  process.env.MINT_ADDRESS ?? "6S4Z6Bhd71NUskriThsvhHwRpKekMotNk8HTf9tDUPiV";
const NEW_URI = process.env.NEW_URI;

if (!NEW_URI) {
  throw new Error("Set NEW_URI to the public raw metadata JSON URL.");
}

async function loadKeypair(fileUrl) {
  const secretKey = JSON.parse(await readFile(fileUrl, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function updateField(connection, payer, mint, field, value) {
  return await tokenMetadataUpdateFieldWithRentTransfer(
    connection,
    payer,
    mint,
    payer,
    field,
    value,
    [],
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID
  );
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const mint = new PublicKey(MINT_ADDRESS);
const before = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);

console.log(`Wallet/update authority: ${payer.publicKey.toBase58()}`);
console.log(`Mint: ${mint.toBase58()}`);
console.log(`Before name: ${before?.name}`);
console.log(`Before uri: ${before?.uri}`);
console.log(`Before additional metadata: ${JSON.stringify(before?.additionalMetadata ?? [])}`);

const renameSignature = await updateField(connection, payer, mint, "name", "Field Notes");
console.log(`Update name signature: ${renameSignature}`);

const addCustomFieldSignature = await updateField(
  connection,
  payer,
  mint,
  "rarity",
  "legendary"
);
console.log(`Add rarity signature: ${addCustomFieldSignature}`);

const removeCustomFieldSignature = await tokenMetadataRemoveKey(
  connection,
  payer,
  mint,
  payer,
  "rarity",
  false,
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);
console.log(`Remove rarity signature: ${removeCustomFieldSignature}`);

const updateUriSignature = await updateField(connection, payer, mint, "uri", NEW_URI);
console.log(`Update uri signature: ${updateUriSignature}`);

const after = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
console.log(`After name: ${after?.name}`);
console.log(`After symbol: ${after?.symbol}`);
console.log(`After uri: ${after?.uri}`);
console.log(`After update authority: ${after?.updateAuthority?.toBase58() ?? "(not set)"}`);
console.log(`After additional metadata: ${JSON.stringify(after?.additionalMetadata ?? [])}`);
console.log(`Explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
