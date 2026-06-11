import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import { Network } from "@/models/Network";
import { Token } from "@/models/Token";
import { Transaction } from "@/models/Transaction";
import { extractUserIdFromAuthHeader } from "@/lib/auth";
import { fetchEvmBalance, fetchSolanaBalance, fetchTronBalance } from "@/lib/balances";
import { transferEvmToken, transferSolanaToken, transferTronToken } from "@/lib/transactions";
import { decryptKey } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization");
    const userId = extractUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { networkId, toAddress, amount } = body;

    if (!networkId || !toAddress || !amount || amount <= 0) {
      return NextResponse.json({ error: "networkId, toAddress, and a positive amount are required" }, { status: 400 });
    }

    const network = await Network.findById(networkId);
    if (!network) return NextResponse.json({ error: "Network not found" }, { status: 404 });

    const usdtToken = await Token.findOne({ networkId: network._id, symbol: "USDT" });
    if (!usdtToken) return NextResponse.json({ error: "USDT token not configured for this network" }, { status: 404 });

    // Determine the network family
    let networkFamily = "";
    if (network.symbol === "ETH" || network.symbol === "BNB" || network.name.toLowerCase().includes("ethereum") || network.name.toLowerCase().includes("bsc")) {
      networkFamily = "EVM";
    } else if (network.symbol === "SOL" || network.name.toLowerCase().includes("solana")) {
      networkFamily = "SOL";
    } else if (network.symbol === "TRX" || network.name.toLowerCase().includes("tron")) {
      networkFamily = "TRON";
    }

    if (!networkFamily) return NextResponse.json({ error: "Unsupported network family for transfer" }, { status: 400 });

    const userWallets = await Wallet.find({ userId });
    const allAddresses = userWallets.flatMap(w => w.wallets);
    const walletEntry = allAddresses.find(a => a.networkFamily === networkFamily);

    if (!walletEntry) return NextResponse.json({ error: "User does not have a wallet for this network" }, { status: 404 });

    // Verify balance
    let currentBalance = 0;
    if (networkFamily === "EVM") {
      currentBalance = await fetchEvmBalance(network.rpcUrl, walletEntry.address, usdtToken.contractAddress);
    } else if (networkFamily === "SOL") {
      currentBalance = await fetchSolanaBalance(network.rpcUrl, walletEntry.address, usdtToken.contractAddress);
    } else if (networkFamily === "TRON") {
      currentBalance = await fetchTronBalance(network.rpcUrl, walletEntry.address, usdtToken.contractAddress);
    }

    if (currentBalance < amount) {
      return NextResponse.json({ error: "Insufficient valid USDT funds" }, { status: 400 });
    }

    // Decrypt key and transfer
    const decryptedPrivateKey = decryptKey(walletEntry.privateKey);
    let txHash = "";

    if (networkFamily === "EVM") {
      txHash = await transferEvmToken(network.rpcUrl, decryptedPrivateKey, usdtToken.contractAddress, toAddress, amount);
    } else if (networkFamily === "SOL") {
      txHash = await transferSolanaToken(network.rpcUrl, decryptedPrivateKey, usdtToken.contractAddress, toAddress, amount);
    } else if (networkFamily === "TRON") {
      txHash = await transferTronToken(network.rpcUrl, decryptedPrivateKey, usdtToken.contractAddress, toAddress, amount);
    }

    const txRecord = await Transaction.create({
      userId,
      txHash,
      networkId: network._id,
      amount,
      toAddress,
      type: "Send",
      status: "Confirmed", // Setting to confirmed immediately for simplification
    });

    return NextResponse.json({
      message: "Transfer successful",
      transaction: txRecord
    });

  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json({ error: error.message || "Transfer failed" }, { status: 500 });
  }
}
