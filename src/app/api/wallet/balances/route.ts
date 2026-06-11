import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import { Network } from "@/models/Network";
import { Token } from "@/models/Token";
import { extractUserIdFromAuthHeader } from "@/lib/auth";
import { fetchEvmBalance, fetchSolanaBalance, fetchTronBalance } from "@/lib/balances";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization");
    const userId = extractUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWallets = await Wallet.find({ userId });
    
    if (!userWallets || userWallets.length === 0) {
      return NextResponse.json({ totalUsdtBalance: 0, flashFund: 0, networks: [] });
    }

    const networks = await Network.find();
    const tokens = await Token.find(); // Primarily USDT contracts

    let totalUsdtBalance = 0;
    const networkBalances: any[] = [];

    // Flatten all addresses the user owns across their wallets
    const allAddresses = userWallets.flatMap(w => w.wallets);

    // For each network in DB, we find if user has a corresponding address
    for (const network of networks) {
      // Find all tokens for this network
      const networkTokens = tokens.filter(t => t.networkId.toString() === network._id.toString());
      
      let addressEntry = null;
      // Match network to family
      if (network.symbol === "ETH" || network.symbol === "BNB" || network.name.toLowerCase().includes("ethereum") || network.name.toLowerCase().includes("bsc") || network.name.toLowerCase().includes("binance")) {
        addressEntry = allAddresses.find(a => a.networkFamily === "EVM");
      } else if (network.symbol === "SOL" || network.name.toLowerCase().includes("solana")) {
        addressEntry = allAddresses.find(a => a.networkFamily === "SOL");
      } else if (network.symbol === "TRX" || network.name.toLowerCase().includes("tron")) {
        addressEntry = allAddresses.find(a => a.networkFamily === "TRON");
      }

      if (addressEntry) {
        let nativeBalance = 0;
        const tokenBalances: any[] = [];

        if (addressEntry.networkFamily === "EVM") {
          nativeBalance = await fetchEvmBalance(network.rpcUrl, addressEntry.address);
          for (const t of networkTokens) {
            const bal = await fetchEvmBalance(network.rpcUrl, addressEntry.address, t.contractAddress);
            tokenBalances.push({ symbol: t.symbol, balance: bal, contractAddress: t.contractAddress });
            if (t.symbol.toUpperCase() === "USDT") totalUsdtBalance += bal;
          }
        } else if (addressEntry.networkFamily === "SOL") {
          nativeBalance = await fetchSolanaBalance(network.rpcUrl, addressEntry.address);
          for (const t of networkTokens) {
            const bal = await fetchSolanaBalance(network.rpcUrl, addressEntry.address, t.contractAddress);
            tokenBalances.push({ symbol: t.symbol, balance: bal, contractAddress: t.contractAddress });
            if (t.symbol.toUpperCase() === "USDT") totalUsdtBalance += bal;
          }
        } else if (addressEntry.networkFamily === "TRON") {
          nativeBalance = await fetchTronBalance(network.rpcUrl, addressEntry.address);
          for (const t of networkTokens) {
            const bal = await fetchTronBalance(network.rpcUrl, addressEntry.address, t.contractAddress);
            tokenBalances.push({ symbol: t.symbol, balance: bal, contractAddress: t.contractAddress });
            if (t.symbol.toUpperCase() === "USDT") totalUsdtBalance += bal;
          }
        }

        networkBalances.push({
          networkId: network._id,
          networkName: network.name,
          symbol: network.symbol,
          isTestnet: network.isTestnet,
          address: addressEntry.address,
          nativeBalance,
          tokens: tokenBalances,
        });
      }
    }

    return NextResponse.json({
      totalUsdtBalance,
      flashFund: 0, // Hardcoded as per user request
      networks: networkBalances
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
