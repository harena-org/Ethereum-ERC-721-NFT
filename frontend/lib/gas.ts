import { ethers } from "ethers";

export async function estimateGasPrice(): Promise<{
  gasPrice: bigint;
  gasPriceGwei: string;
}> {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return {
    gasPrice,
    gasPriceGwei: ethers.formatUnits(gasPrice, "gwei"),
  };
}

export function estimateMintCost(
  quantity: number,
  gasPrice: bigint,
  gasPerMint: number = 65000
): {
  totalGas: bigint;
  totalCostETH: string;
  totalCostUSD: string;
} {
  const totalGas = BigInt(quantity) * BigInt(gasPerMint);
  const totalCostWei = totalGas * gasPrice;
  const totalCostETH = ethers.formatEther(totalCostWei);
  const ethPrice = 2015;
  const costUSD = parseFloat(totalCostETH) * ethPrice;

  return {
    totalGas,
    totalCostETH,
    totalCostUSD: costUSD.toFixed(2),
  };
}
