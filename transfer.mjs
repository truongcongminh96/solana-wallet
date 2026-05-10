import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    address,
    appendTransactionMessageInstruction,
    createKeyPairSignerFromBytes,
    createSolanaRpc,
    createTransactionMessage,
    devnet,
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction,
    lamports,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const RPC_URL = "https://api.devnet.solana.com";
const COMMITMENT_RANK = {
    processed: 0,
    confirmed: 1,
    finalized: 2,
};

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

function statusUpdate(message) {
    if (process.stdout.clearLine && process.stdout.cursorTo) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    process.stdout.write(message);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCommitment(rpc, signature, commitment, timeoutMs = 90_000) {
    const startedAt = Date.now();
    const targetRank = COMMITMENT_RANK[commitment];

    while (Date.now() - startedAt < timeoutMs) {
        const { value: statuses } = await rpc
            .getSignatureStatuses([signature], { searchTransactionHistory: true })
            .send();

        const status = statuses[0];

        if (status?.err) {
            throw new Error(
                `Transaction failed on-chain: ${JSON.stringify(status.err)}`
            );
        }

        const currentCommitment = status?.confirmationStatus;

        if (
            currentCommitment &&
            COMMITMENT_RANK[currentCommitment] >= targetRank
        ) {
            return status;
        }

        await sleep(500);
    }

    throw new Error(`Timed out waiting for ${commitment} confirmation.`);
}

async function transferWithConfirmation(rpc, sender, recipientAddress, amount) {
    const transferInstruction = getTransferSolInstruction({
        source: sender,
        destination: recipientAddress,
        amount,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(sender, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
    );

    const signedTransaction =
        await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    const base64Transaction =
        getBase64EncodedWireTransaction(signedTransaction);

    statusUpdate("Sending transaction...");
    await rpc
        .sendTransaction(base64Transaction, {
            encoding: "base64",
            preflightCommitment: "processed",
        })
        .send();

    statusUpdate("Status: processed");
    await waitForCommitment(rpc, signature, "confirmed");

    statusUpdate("Status: confirmed");
    await waitForCommitment(rpc, signature, "finalized");

    statusUpdate("Status: finalized\n");
    return signature;
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

    const rpc = createSolanaRpc(devnet(RPC_URL));

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

    const signature = await transferWithConfirmation(
        rpc,
        sender,
        recipient,
        amountLamports
    );

    console.log("Transaction successful!");
    console.log(`Signature: ${signature}`);
    console.log("View on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    const newBalanceResponse = await rpc.getBalance(sender.address).send();
    console.log(`New sender balance: ${lamportsToSol(newBalanceResponse.value)} SOL`);
} catch (error) {
    console.error("\nTransaction failed:");
    console.error(error.message ?? error);
    process.exit(1);
}
