import {
    address,
    createSolanaRpc,
    getBase16Decoder,
    getBase58Decoder,
    getBase64Encoder,
} from "@solana/kit";
import { getMintDecoder } from "@solana-program/token";

const RPC_URL = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
const WSOL_MINT = address("So11111111111111111111111111111111111111112");

const rpc = createSolanaRpc(RPC_URL);

const account = await rpc.getAccountInfo(WSOL_MINT, {
    encoding: "base64",
}).send();

if (!account.value) {
    throw new Error("Account not found");
}

const [base64Data] = account.value.data;
const bytes = getBase64Encoder().encode(base64Data);

console.log("\n=== Raw account info ===");
console.log("Owner:", account.value.owner);
console.log("Lamports:", account.value.lamports.toString());
console.log("Data length:", bytes.length);
console.log("Hex:", getBase16Decoder().decode(bytes));

console.log("\n=== Codec decode ===");
const mint = getMintDecoder().decode(bytes);
console.log(mint);

console.log("\n=== Manual decode ===");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const base58 = getBase58Decoder();

const mintAuthorityOption = view.getUint32(0, true);
const mintAuthorityBytes = bytes.slice(4, 36);
const supply = view.getBigUint64(36, true);
const decimals = view.getUint8(44);
const isInitialized = view.getUint8(45) === 1;
const freezeAuthorityOption = view.getUint32(46, true);
const freezeAuthorityBytes = bytes.slice(50, 82);

const manualMint = {
    mintAuthorityOption,
    mintAuthority:
        mintAuthorityOption === 1 ? base58.decode(mintAuthorityBytes) : null,
    supply: supply.toString(),
    decimals,
    isInitialized,
    freezeAuthorityOption,
    freezeAuthority:
        freezeAuthorityOption === 1 ? base58.decode(freezeAuthorityBytes) : null,
};

console.log(manualMint);

console.log("\n=== RPC jsonParsed ===");
const parsed = await rpc.getAccountInfo(WSOL_MINT, {
    encoding: "jsonParsed",
}).send();

console.dir(parsed.value?.data, { depth: null });
