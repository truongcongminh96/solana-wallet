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
  createInitializeGroupMemberPointerInstruction,
  createInitializeGroupPointerInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getTokenGroupMemberState,
  getTokenGroupState,
  getTokenMetadata,
  tokenGroupInitializeGroupWithRentTransfer,
  tokenGroupMemberInitializeWithRentTransfer,
  tokenMetadataInitializeWithRentTransfer,
} from "@solana/spl-token";

const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);
const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
const COLLECTION_URI = process.env.COLLECTION_URI;
const SKETCH_ONE_URI = process.env.SKETCH_ONE_URI;
const SKETCH_TWO_URI = process.env.SKETCH_TWO_URI;

const COLLECTION = {
  name: "Solana Sketchbook",
  symbol: "SKTCH",
  maxSize: 3n,
};
const MEMBERS = [
  { label: "member one", name: "Sketch #1", symbol: "SK1", uri: SKETCH_ONE_URI },
  { label: "member two", name: "Sketch #2", symbol: "SK2", uri: SKETCH_TWO_URI },
];

if (!COLLECTION_URI || !SKETCH_ONE_URI || !SKETCH_TWO_URI) {
  throw new Error("Set COLLECTION_URI, SKETCH_ONE_URI, and SKETCH_TWO_URI.");
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

async function createMintWithPointerExtensions({
  connection,
  payer,
  mint,
  pointerExtensions,
}) {
  const mintLen = getMintLen(pointerExtensions.map((entry) => entry.type));
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    ...pointerExtensions.map((entry) => entry.instruction),
    createInitializeMint2Instruction(
      mint.publicKey,
      0,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
  ];
  const signature = await sendTransaction(connection, payer, instructions, [mint]);
  return { signature, mintLen };
}

async function initializeMetadata(connection, payer, mint, { name, symbol, uri }) {
  return await tokenMetadataInitializeWithRentTransfer(
    connection,
    payer,
    mint.publicKey,
    payer.publicKey,
    payer,
    name,
    symbol,
    uri,
    [],
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID
  );
}

async function mintMemberNft(connection, payer, collectionMint, memberConfig) {
  const mint = Keypair.generate();
  const ata = getAssociatedTokenAddressSync(
    mint.publicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const createResult = await createMintWithPointerExtensions({
    connection,
    payer,
    mint,
    pointerExtensions: [
      {
        type: ExtensionType.MetadataPointer,
        instruction: createInitializeMetadataPointerInstruction(
          mint.publicKey,
          payer.publicKey,
          mint.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
      },
      {
        type: ExtensionType.GroupMemberPointer,
        instruction: createInitializeGroupMemberPointerInstruction(
          mint.publicKey,
          payer.publicKey,
          mint.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
      },
    ],
  });
  const metadataSignature = await initializeMetadata(connection, payer, mint, memberConfig);
  const memberSignature = await tokenGroupMemberInitializeWithRentTransfer(
    connection,
    payer,
    mint.publicKey,
    payer,
    collectionMint.publicKey,
    payer.publicKey,
    [],
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID
  );
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
  const lockSignature = await sendTransaction(connection, payer, [
    createSetAuthorityInstruction(
      mint.publicKey,
      payer.publicKey,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    ),
  ]);
  return {
    ...memberConfig,
    mint,
    ata,
    createSignature: createResult.signature,
    mintLen: createResult.mintLen,
    metadataSignature,
    memberSignature,
    mintOneSignature,
    lockSignature,
  };
}

const connection = new Connection(RPC_URL, "confirmed");
const payer = await loadKeypair(WALLET_FILE);
const balanceLamports = await connection.getBalance(payer.publicKey);

console.log(`Wallet: ${payer.publicKey.toBase58()}`);
console.log(`Starting balance: ${balanceLamports / 1_000_000_000} SOL`);

const collectionMint = Keypair.generate();
const collectionCreateResult = await createMintWithPointerExtensions({
  connection,
  payer,
  mint: collectionMint,
  pointerExtensions: [
    {
      type: ExtensionType.MetadataPointer,
      instruction: createInitializeMetadataPointerInstruction(
        collectionMint.publicKey,
        payer.publicKey,
        collectionMint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
    },
    {
      type: ExtensionType.GroupPointer,
      instruction: createInitializeGroupPointerInstruction(
        collectionMint.publicKey,
        payer.publicKey,
        collectionMint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
    },
  ],
});
const collectionMetadataSignature = await initializeMetadata(connection, payer, collectionMint, {
  name: COLLECTION.name,
  symbol: COLLECTION.symbol,
  uri: COLLECTION_URI,
});
const groupSignature = await tokenGroupInitializeGroupWithRentTransfer(
  connection,
  payer,
  collectionMint.publicKey,
  payer,
  payer.publicKey,
  COLLECTION.maxSize,
  [],
  { commitment: "confirmed" },
  TOKEN_2022_PROGRAM_ID
);

const mintedMembers = [];
for (const member of MEMBERS) {
  mintedMembers.push(await mintMemberNft(connection, payer, collectionMint, member));
}

const lockCollectionMintSignature = await sendTransaction(connection, payer, [
  createSetAuthorityInstruction(
    collectionMint.publicKey,
    payer.publicKey,
    AuthorityType.MintTokens,
    null,
    [],
    TOKEN_2022_PROGRAM_ID
  ),
]);

const collectionMintInfo = await getMint(
  connection,
  collectionMint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const collectionMetadata = await getTokenMetadata(
  connection,
  collectionMint.publicKey,
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
const groupState = getTokenGroupState(collectionMintInfo);

console.log(`Collection mint: ${collectionMint.publicKey.toBase58()}`);
console.log(`Collection metadata: ${collectionMetadata?.name} (${collectionMetadata?.symbol})`);
console.log(`Collection mint account size: ${collectionCreateResult.mintLen} bytes`);
console.log(`Create collection mint: ${collectionCreateResult.signature}`);
console.log(`Initialize collection metadata: ${collectionMetadataSignature}`);
console.log(`Initialize group: ${groupSignature}`);
console.log(`Lock collection mint authority: ${lockCollectionMintSignature}`);
console.log(`Group size: ${groupState?.size}`);
console.log(`Group max size: ${groupState?.maxSize}`);

for (const member of mintedMembers) {
  const mintInfo = await getMint(
    connection,
    member.mint.publicKey,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
  const metadata = await getTokenMetadata(
    connection,
    member.mint.publicKey,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
  const memberState = getTokenGroupMemberState(mintInfo);
  console.log("");
  console.log(`${member.label}: ${member.mint.publicKey.toBase58()}`);
  console.log(`ATA: ${member.ata.toBase58()}`);
  console.log(`Metadata: ${metadata?.name} (${metadata?.symbol})`);
  console.log(`Supply: ${mintInfo.supply}`);
  console.log(`Decimals: ${mintInfo.decimals}`);
  console.log(`Mint authority: ${mintInfo.mintAuthority?.toBase58() ?? "none"}`);
  console.log(`Member group: ${memberState?.group?.toBase58()}`);
  console.log(`Member number: ${memberState?.memberNumber}`);
  console.log(`Create mint: ${member.createSignature}`);
  console.log(`Initialize metadata: ${member.metadataSignature}`);
  console.log(`Initialize group member: ${member.memberSignature}`);
  console.log(`Create ATA and mint one: ${member.mintOneSignature}`);
  console.log(`Lock member mint authority: ${member.lockSignature}`);
}

console.log("");
console.log(
  `Collection Explorer: https://explorer.solana.com/address/${collectionMint.publicKey.toBase58()}?cluster=devnet`
);
for (const member of mintedMembers) {
  console.log(
    `${member.label} Explorer: https://explorer.solana.com/address/${member.mint.publicKey.toBase58()}?cluster=devnet`
  );
}
