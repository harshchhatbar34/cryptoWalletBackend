import { ethers } from "ethers";
import { Connection, PublicKey } from "@solana/web3.js";
// @ts-ignore
import TronWeb from "tronweb";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"];

export async function fetchEvmBalance(rpcUrl: string, address: string, tokenAddress?: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    if (!tokenAddress) {
      const balanceWei = await provider.getBalance(address);
      return parseFloat(ethers.formatEther(balanceWei));
    } else {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();
      return parseFloat(ethers.formatUnits(balance, decimals));
    }
  } catch (e) {
    console.error(`EVM Balance fetch failed for ${address}:`, e);
    return 0;
  }
}

export async function fetchSolanaBalance(rpcUrl: string, address: string, tokenAddress?: string): Promise<number> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const pubKey = new PublicKey(address);

    if (!tokenAddress) {
      const balanceLamports = await connection.getBalance(pubKey);
      return balanceLamports / 1e9;
    } else {
      const mintKey = new PublicKey(tokenAddress);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, { mint: mintKey });
      
      if (tokenAccounts.value.length > 0) {
        const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return amount || 0;
      }
      return 0;
    }
  } catch (e) {
    console.error(`Solana Balance fetch failed for ${address}:`, e);
    return 0;
  }
}

export async function fetchTronBalance(rpcUrl: string, address: string, tokenAddress?: string): Promise<number> {
  try {
    const tronWeb = new (TronWeb as any)({ fullHost: rpcUrl });
    
    if (!tokenAddress) {
      const balanceSun = await tronWeb.trx.getBalance(address);
      return balanceSun / 1e6;
    } else {
      const contract = await tronWeb.contract().at(tokenAddress);
      const balance = await contract.balanceOf(address).call();
      // USDT on Tron is typically 6 decimals
      return parseInt(balance.toString()) / 1e6;
    }
  } catch (e) {
    console.error(`Tron Balance fetch failed for ${address}:`, e);
    return 0;
  }
}
