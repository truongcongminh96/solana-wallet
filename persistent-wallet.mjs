import { webcrypto } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  createKeyPairSignerFromBytes,
  createSignerFromKeyPair,
  createSolanaRpc,
  devnet,
  generateKeyPair,
} from "@solana/kit";

const { subtle } = webcrypto;
const WALLET_FILE = new URL("./wallet.json", import.meta.url);
const WALLET_FILE_NAME = "wallet.json";
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

function isLegacyWalletFormat(data) {
  return !Array.isArray(data) && Array.isArray(data?.secretKey);
}

function getSecretKeyBytes(data) {
  const secretKey = Array.isArray(data) ? data : data?.secretKey;

  if (!Array.isArray(secretKey) || secretKey.length !== 64) {
    throw new Error(
      "Invalid wallet format. Expected a 64-byte secret key array in wallet.json."
    );
  }

  return new Uint8Array(secretKey);
}

async function loadOrCreateWallet() {
  try {
    const data = JSON.parse(await readFile(WALLET_FILE, "utf-8"));
    const secretBytes = getSecretKeyBytes(data);
    const wallet = await createKeyPairSignerFromBytes(secretBytes);

    if (isLegacyWalletFormat(data)) {
      await writeFile(WALLET_FILE, JSON.stringify(Array.from(secretBytes), null, 2));
      console.log(`Migrated ${WALLET_FILE_NAME} to Solana CLI format.`);
    }

    console.log("Loaded existing wallet:", wallet.address);
    return wallet;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    const keyPair = await generateKeyPair(true);

    const publicKeyBytes = new Uint8Array(
      await subtle.exportKey("raw", keyPair.publicKey)
    );
    const pkcs8 = await subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(pkcs8).slice(-32);

    const keypairBytes = new Uint8Array(64);
    keypairBytes.set(privateKeyBytes, 0);
    keypairBytes.set(publicKeyBytes, 32);

    await writeFile(
      WALLET_FILE,
      JSON.stringify(Array.from(keypairBytes), null, 2)
    );

    const wallet = await createSignerFromKeyPair(keyPair);
    console.log("Created new wallet:", wallet.address);
    console.log(`Saved to ${WALLET_FILE_NAME}`);
    return wallet;
  }
}

const wallet = await loadOrCreateWallet();

console.log(`\nAddress: ${wallet.address}`);
try {
  const { value: balance } = await rpc.getBalance(wallet.address).send();
  const balanceInSol = Number(balance) / 1_000_000_000;

  console.log(`Balance: ${balanceInSol} SOL`);

  if (balanceInSol === 0) {
    console.log(
      "\nThis wallet has no SOL. Visit https://faucet.solana.com/ and airdrop some to:"
    );
    console.log(wallet.address);
  }
} catch {
  console.log(
    "\nCould not fetch the balance from devnet right now. Check your network connection and try again."
  );
}
