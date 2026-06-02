import { readFile } from "node:fs/promises";
import {
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  generateKeyPairSigner,
  none,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getBase58Decoder } from "@solana/codecs-strings";
import {
  AuthorityType,
  findAssociatedTokenPda,
  getCreateMintInstructionPlan,
  getMintToATAInstructionPlan,
  getSetAuthorityInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

const RPC_URL = "https://api.devnet.solana.com";
const WS_URL = "wss://api.devnet.solana.com";
const WALLET_FILE = new URL("./backup-wallet.json", import.meta.url);

const rpc = createSolanaRpc(devnet(RPC_URL));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(WS_URL));
const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});
const base58 = getBase58Decoder();

async function loadWallet() {
  const secretKey = JSON.parse(await readFile(WALLET_FILE, "utf8"));
  return createKeyPairSignerFromBytes(new Uint8Array(secretKey));
}

function instructionsFromPlan(plan) {
  if (plan.kind === "single") return [plan.instruction];
  if (plan.kind === "sequential" || plan.kind === "parallel") {
    return plan.plans.flatMap(instructionsFromPlan);
  }
  throw new Error(`Unsupported instruction plan kind: ${plan.kind}`);
}

async function sendInstructions(payer, instructions) {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );
  const transaction = await signTransactionMessageWithSigners(message);
  await sendAndConfirmTransaction(transaction, { commitment: "confirmed" });
  return base58.decode(transaction.signatures[payer.address]);
}

const wallet = await loadWallet();
const mint = await generateKeyPairSigner();
const [ata] = await findAssociatedTokenPda({
  owner: wallet.address,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
  mint: mint.address,
});

const balance = await rpc.getBalance(wallet.address).send();
console.log(`Wallet: ${wallet.address}`);
console.log(`Starting balance: ${Number(balance.value) / 1_000_000_000} SOL`);
console.log(`Mint: ${mint.address}`);
console.log(`Associated token account: ${ata}`);

const createMintPlan = getCreateMintInstructionPlan({
  payer: wallet,
  newMint: mint,
  decimals: 0,
  mintAuthority: wallet.address,
  freezeAuthority: null,
});
const createMintSignature = await sendInstructions(
  wallet,
  instructionsFromPlan(createMintPlan)
);
console.log(`Create mint signature: ${createMintSignature}`);

const mintToAtaPlan = getMintToATAInstructionPlan({
  payer: wallet,
  ata,
  owner: wallet.address,
  mint: mint.address,
  mintAuthority: wallet,
  amount: 1n,
  decimals: 0,
});
const mintOneSignature = await sendInstructions(
  wallet,
  instructionsFromPlan(mintToAtaPlan)
);
console.log(`Create ATA and mint one signature: ${mintOneSignature}`);

const disableMintAuthoritySignature = await sendInstructions(wallet, [
  getSetAuthorityInstruction({
    owned: mint.address,
    owner: wallet,
    authorityType: AuthorityType.MintTokens,
    newAuthority: none(),
  }),
]);
console.log(
  `Disable mint authority signature: ${disableMintAuthoritySignature}`
);

const supply = await rpc.getTokenSupply(mint.address).send();
console.log(`Supply: ${supply.value.amount}`);
console.log(`Decimals: ${supply.value.decimals}`);
console.log(`Explorer: https://explorer.solana.com/address/${mint.address}?cluster=devnet`);
