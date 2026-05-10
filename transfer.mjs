import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    address,
    appendTransactionMessageInstructions,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    getSignatureFromTransaction,
    lamports,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const RPC_URL = "https://api.devnet.solana.com";
const WS_URL = "wss://api.devnet.solana.com";

function resolveHome(filePath) {
    return filePath.startsWith("~")
        ? path.join(os.homedir(), filePath.slice(1))
        : filePath;
}

async function loadKeypair(filePath = "~/.config/solana/id.json") {
    const resolvedPath = resolveHome(filePath);
    const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    return await createKeyPairSignerFromBytes(Uint8Array.from(secretKey));
}

function solToLamports(solAmount) {
    if (!/^\d+(\.\d+)?$/.test(solAmount)) {
        throw new Error("Amount must be a positive number, example: 0.05");
    }

    const [whole, decimal = ""] = solAmount.split(".");
    const decimalPadded = decimal.padEnd(9, "0").slice(0, 9);

    return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(decimalPadded);
}

function lamportsToSol(value) {
    return Number(value) / Number(LAMPORTS_PER_SOL);
}

const [recipientArg, amountArg] = process.argv.slice(2);

if (!recipientArg || !amountArg) {
    console.log(`
Solana Transfer Tool
====================

Usage:
  node transfer.mjs <RECIPIENT_ADDRESS> <AMOUNT_SOL>

Example:
  node transfer.mjs GoFf3wS8T2jYT8muLi3KE3Vg7BGZLToXUDQmr22d2cZK 0.05
`);
    process.exit(1);
}

try {
    console.log("Solana Transfer Tool");
    console.log("====================");

    const rpc = createSolanaRpc(RPC_URL);
    const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);

    console.log("Connected to Solana devnet.");

    const sender = await loadKeypair();
    const recipient = address(recipientArg);
    const amountLamports = lamports(solToLamports(amountArg));

    console.log(`Sender: ${sender.address}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`Amount: ${amountArg} SOL`);

    const balanceResponse = await rpc.getBalance(sender.address).send();
    const senderBalance = balanceResponse.value;

    console.log(`Sender balance: ${lamportsToSol(senderBalance)} SOL`);

    const estimatedFee = 5000n;
    const required = amountLamports + estimatedFee;

    if (senderBalance < required) {
        throw new Error(
            `Insufficient balance. Need at least ${lamportsToSol(required)} SOL including estimated fee.`
        );
    }

    console.log("Sending transaction...");

    const transferInstruction = getTransferSolInstruction({
        source: sender,
        destination: recipient,
        amount: amountLamports,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(sender, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
    );

    const signedTransaction =
        await signTransactionMessageWithSigners(transactionMessage);

    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
        signedTransaction,
        { commitment: "confirmed" }
    );

    const signature = getSignatureFromTransaction(signedTransaction);

    console.log("Transaction confirmed!");
    console.log(`Signature: ${signature}`);
    console.log(
        `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

    const newBalanceResponse = await rpc.getBalance(sender.address).send();
    console.log(`New sender balance: ${lamportsToSol(newBalanceResponse.value)} SOL`);
} catch (error) {
    console.error("Transfer failed:");
    console.error(error.message ?? error);
    process.exit(1);
}
