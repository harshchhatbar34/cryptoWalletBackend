import { ethers } from "ethers";
import { Connection, Keypair, PublicKey, Transaction as SolTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransferInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";
// @ts-ignore
import TronWeb from "tronweb";

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)", "function decimals() view returns (uint8)"];

export async function transferEvmToken(rpcUrl: string, privateKey: string, tokenAddress: string, toAddress: string, amount: number): Promise<string> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const decimals = await contract.decimals();
  const amountToTransfer = ethers.parseUnits(amount.toString(), decimals);

  const tx = await contract.transfer(toAddress, amountToTransfer);
  await tx.wait();
  return tx.hash;
}

export async function transferSolanaToken(rpcUrl: string, privateKey: string, tokenAddress: string, toAddress: string, amount: number): Promise<string> {
  const connection = new Connection(rpcUrl, "confirmed");
  const secretKey = bs58.decode(privateKey);
  const fromWallet = Keypair.fromSecretKey(secretKey);
  
  const mint = new PublicKey(tokenAddress);
  const toPubkey = new PublicKey(toAddress);

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromWallet.publicKey);
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toPubkey);

  const amountLamports = amount * 1e6; // Typically USDC/USDT on solana is 6 decimals, but can vary. We'll assume 6.

  const tx = new SolTransaction().add(
    createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      fromWallet.publicKey,
      amountLamports
    )
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [fromWallet]);
  return signature;
}

export async function transferTronToken(rpcUrl: string, privateKeyHex: string, tokenAddress: string, toAddress: string, amount: number): Promise<string> {
  const tronWeb = new TronWeb({ fullHost: rpcUrl, privateKey: privateKeyHex });
  const contract = await tronWeb.contract().at(tokenAddress);
  
  const amountSun = amount * 1e6; // USDT on TRON has 6 decimals
  const txId = await contract.transfer(toAddress, amountSun).send({
    feeLimit: 100000000
  });
  
  return txId;
}
