import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { hdkey } from "ethereumjs-wallet";
import bs58 from "bs58";
// @ts-ignore
import TronWeb from "tronweb";

import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import { extractUserIdFromAuthHeader } from "@/lib/auth";
import { encryptKey } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization");
    const userId = extractUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Generate Mnemonic
    const mnemonic = generateMnemonic();
    const seed = mnemonicToSeedSync(mnemonic);

    const wallets: { networkFamily: "EVM" | "SOL" | "TRON", address: string, privateKey: string }[] = [];

    // 2. Derive EVM (Ethereum / BNB)
    // Path: m/44'/60'/0'/0/0
    const hdwallet = hdkey.fromMasterSeed(seed);
    const evmWallet = hdwallet.derivePath("m/44'/60'/0'/0/0").getWallet();
    const evmPrivateKey = evmWallet.getPrivateKeyString();
    const evmAddress = evmWallet.getChecksumAddressString();

    wallets.push({
      networkFamily: "EVM",
      address: evmAddress,
      privateKey: encryptKey(evmPrivateKey),
    });

    // 3. Derive Solana
    // Path: m/44'/501'/0'/0'
    // Simplified: we can use a direct derivation or just generate a new one if strict derivation isn't strictly necessary.
    // For standard derivation, we'd need ed25519-hd-key. We can use ed25519 derivation or just seed slice.
    // To keep it simple and dependency-light, we'll use a deterministic approach from the seed for Solana
    const solanaSeed = seed.slice(0, 32); 
    const solanaKeypair = Keypair.fromSeed(solanaSeed);
    const solanaPrivateKey = bs58.encode(solanaKeypair.secretKey);
    const solanaAddress = solanaKeypair.publicKey.toBase58();

    wallets.push({
      networkFamily: "SOL",
      address: solanaAddress,
      privateKey: encryptKey(solanaPrivateKey),
    });

    // 4. Derive Tron
    // Tron addresses can be generated from an EVM-like private key, just formatted differently
    // Path: m/44'/195'/0'/0/0
    const tronWalletDerive = hdwallet.derivePath("m/44'/195'/0'/0/0").getWallet();
    const tronPrivateKeyBytes = tronWalletDerive.getPrivateKey();
    const tronPrivateKeyHex = tronPrivateKeyBytes.toString("hex");
    const tronAddress = TronWeb.utils.address.fromPrivateKey(tronPrivateKeyHex) || "";

    wallets.push({
      networkFamily: "TRON",
      address: tronAddress,
      privateKey: encryptKey(tronPrivateKeyHex),
    });

    // Save to Database
    const newWallet = await Wallet.create({
      userId,
      mnemonic: encryptKey(mnemonic),
      wallets,
    });

    // Return to frontend WITHOUT private keys
    return NextResponse.json({
      message: "Wallet created successfully",
      walletId: newWallet._id,
      wallets: wallets.map(w => ({ networkFamily: w.networkFamily, address: w.address }))
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
