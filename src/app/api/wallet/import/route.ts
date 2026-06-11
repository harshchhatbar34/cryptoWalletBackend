import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
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

    const body = await req.json();
    const { networkFamily, privateKey } = body;

    if (!networkFamily || !privateKey) {
      return NextResponse.json({ error: "Network family (EVM, SOL, TRON) and privateKey are required" }, { status: 400 });
    }

    let address = "";
    let formattedPrivateKey = privateKey;

    try {
      if (networkFamily === "EVM") {
        const wallet = new ethers.Wallet(privateKey);
        address = wallet.address;
        formattedPrivateKey = wallet.privateKey;
      } else if (networkFamily === "SOL") {
        const secretKey = bs58.decode(privateKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        address = keypair.publicKey.toBase58();
      } else if (networkFamily === "TRON") {
        address = TronWeb.utils.address.fromPrivateKey(privateKey) || "";
      } else {
        return NextResponse.json({ error: "Unsupported network family" }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid private key for the selected network" }, { status: 400 });
    }

    // Since we don't have a mnemonic for an imported key, we can store it as empty or 'IMPORTED'
    const newWallet = await Wallet.create({
      userId,
      mnemonic: encryptKey("IMPORTED"),
      wallets: [{
        networkFamily,
        address,
        privateKey: encryptKey(formattedPrivateKey),
      }]
    });

    return NextResponse.json({
      message: "Wallet imported successfully",
      walletId: newWallet._id,
      networkFamily,
      address,
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
