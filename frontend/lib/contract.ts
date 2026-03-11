import { ethers } from "ethers";
import { MyNFT_BYTECODE } from "./bytecode";

// ABI - only the functions we need
export const MyNFT_ABI = [
  "constructor(string name, string symbol, string baseTokenURI)",
  "function mintBatch(address to, uint256 quantity) external",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function owner() view returns (address)",
];

export { MyNFT_BYTECODE };

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not detected");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider;
}

export async function connectWallet() {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  return {
    signer,
    address,
    balance: ethers.formatEther(balance),
  };
}

export async function deployContract(
  signer: ethers.Signer,
  name: string,
  symbol: string,
  baseURI: string
) {
  const factory = new ethers.ContractFactory(MyNFT_ABI, MyNFT_BYTECODE, signer);
  const contract = await factory.deploy(name, symbol, baseURI);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return { contract, address };
}

export async function mintBatch(
  signer: ethers.Signer,
  contractAddress: string,
  to: string,
  quantity: number,
  onBatchComplete?: (batchIndex: number, totalBatches: number, txHash: string) => void
) {
  const contract = new ethers.Contract(contractAddress, MyNFT_ABI, signer);
  const batchSize = 500;
  const totalBatches = Math.ceil(quantity / batchSize);
  const txHashes: string[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const currentBatch = Math.min(batchSize, quantity - i * batchSize);
    const tx = await contract.mintBatch(to, currentBatch);
    const receipt = await tx.wait();
    txHashes.push(receipt.hash);
    onBatchComplete?.(i + 1, totalBatches, receipt.hash);
  }

  return txHashes;
}
