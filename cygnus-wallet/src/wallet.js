import { ethers } from "ethers";

const RPC_URL = "http://127.0.0.1:8545"; // Cygnus node RPC
const provider = new ethers.JsonRpcProvider(RPC_URL);

let wallet = null;

export async function createWallet() {
  wallet = ethers.Wallet.createRandom().connect(provider);
  localStorage.setItem("cygnusWallet", wallet.privateKey);
  return wallet;
}

export async function importWallet(privateKey) {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    localStorage.setItem("cygnusWallet", privateKey);
    return wallet;
  } catch (err) {
    throw new Error("Invalid private key");
  }
}

export function loadWallet() {
  const pk = localStorage.getItem("cygnusWallet");
  if (!pk) return null;
  wallet = new ethers.Wallet(pk, provider);
  return wallet;
}

export async function getBalance() {
  if (!wallet) return "0";
  const balance = await provider.getBalance(wallet.address);
  return ethers.formatEther(balance);
}

export async function getTransactions(address) {
  // NOTE: Geth’s JSON-RPC does not return history directly.
  // We’d need to connect to an explorer OR scan blocks.
  // For now, placeholder:
  return [];
}

export async function sendTransaction(to, amount) {
  if (!wallet) throw new Error("No wallet loaded");
  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseEther(amount)
  });
  return tx;
}

export async function getMiningStatus() {
  return provider.send("eth_mining", []);
}

export async function startMining(threads = 1) {
  return provider.send("miner_start", [threads]);
}

export async function stopMining() {
  return provider.send("miner_stop", []);
}

export function getAddress() {
  return wallet ? wallet.address : null;
}