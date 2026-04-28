import { readFile } from "node:fs/promises";
import {
  address,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  devnet,
} from "@solana/kit";

const LAMPORTS_PER_SOL = 1_000_000_000;
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const walletFiles = ["wallet.json", "backup-wallet.json"];

function getSecretKeyBytes(data, fileName) {
  const secretKey = Array.isArray(data) ? data : data?.secretKey;

  if (!Array.isArray(secretKey) || secretKey.length !== 64) {
    throw new Error(
      `Invalid wallet format in ${fileName}. Expected a 64-byte secret key array.`
    );
  }

  return new Uint8Array(secretKey);
}

async function loadWalletAddress() {
  for (const fileName of walletFiles) {
    try {
      const walletFile = new URL(`./${fileName}`, import.meta.url);
      const data = JSON.parse(await readFile(walletFile, "utf-8"));
      const wallet = await createKeyPairSignerFromBytes(
        getSecretKeyBytes(data, fileName)
      );

      return wallet.address;
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Missing wallet.json or backup-wallet.json. Run `node persistent-wallet.mjs` first."
  );
}

const targetAddress = address(await loadWalletAddress());

const { value: balanceInLamports } = await rpc.getBalance(targetAddress).send();
const balanceInSol = Number(balanceInLamports) / LAMPORTS_PER_SOL;

console.log(`Address: ${targetAddress}`);
console.log(`Balance: ${balanceInSol} SOL`);
