import { readFile } from "node:fs/promises";
import { createKeyPairSignerFromBytes, createSolanaRpc, devnet } from "@solana/kit";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const WALLET_FILE = new URL("./wallet.json", import.meta.url);
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

function getSecretKeyBytes(data) {
  const secretKey = Array.isArray(data) ? data : data?.secretKey;

  if (!Array.isArray(secretKey) || secretKey.length !== 64) {
    throw new Error(
      "Invalid wallet format. Expected a 64-byte secret key array in wallet.json."
    );
  }

  return new Uint8Array(secretKey);
}

function lamportsToSolString(lamports) {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fractional = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "");

  return fractional ? `${whole}.${fractional}` : whole.toString();
}

function solStringToLamports(sol) {
  const [wholePart, fractionalPart = ""] = sol.split(".");
  const wholeLamports = BigInt(wholePart || "0") * LAMPORTS_PER_SOL;
  const normalizedFraction = fractionalPart.padEnd(9, "0").slice(0, 9);

  return wholeLamports + BigInt(normalizedFraction || "0");
}

async function loadWallet() {
  try {
    const data = JSON.parse(await readFile(WALLET_FILE, "utf-8"));
    return createKeyPairSignerFromBytes(getSecretKeyBytes(data));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Missing wallet.json. Run `node persistent-wallet.mjs` first.");
    }

    throw error;
  }
}

const wallet = await loadWallet();

console.log(`Address: ${wallet.address}`);

try {
  const { value: balance } = await rpc.getBalance(wallet.address).send();
  const balanceLamports = BigInt(balance);
  const balanceSol = lamportsToSolString(balanceLamports);
  const roundTripLamports = solStringToLamports(balanceSol);

  console.log(`Balance: ${balanceLamports} lamports`);
  console.log(`Balance: ${balanceSol} SOL`);
  console.log(`Math check: ${balanceSol} SOL = ${roundTripLamports} lamports`);

  const signatures = await rpc
    .getSignaturesForAddress(wallet.address, { limit: 1 })
    .send();

  if (signatures.length === 0) {
    console.log("\nNo transaction history found for this wallet yet.");
  } else {
    const latestSignature = signatures[0].signature;
    const transaction = await rpc
      .getTransaction(latestSignature, { encoding: "json" })
      .send();

    console.log(`\nLatest signature: ${latestSignature}`);

    if (transaction?.meta?.fee !== undefined) {
      const feeLamports = BigInt(transaction.meta.fee);
      console.log(`Latest fee: ${feeLamports} lamports`);
      console.log(`Latest fee: ${lamportsToSolString(feeLamports)} SOL`);
    } else {
      console.log("Could not read the fee from the latest transaction.");
    }
  }
} catch {
  console.log(
    "Could not fetch devnet data right now. Check your network connection and try again."
  );
}
