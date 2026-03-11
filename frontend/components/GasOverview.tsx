"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

interface Props {
  walletAddress: string;
  walletBalance: string;
  onContinue: () => void;
}

const TRANSFER_GAS = 21000n;
const DEPLOY_GAS = 3_500_000n;

export default function GasOverview({ walletAddress, walletBalance, onContinue }: Props) {
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [gasPriceGwei, setGasPriceGwei] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGas = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const feeData = await provider.getFeeData();
      const gp = feeData.gasPrice ?? 0n;
      setGasPrice(gp);
      setGasPriceGwei(ethers.formatUnits(gp, "gwei"));
    } catch {
      setGasPriceGwei("--");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGas();
    const interval = setInterval(fetchGas, 15000);
    return () => clearInterval(interval);
  }, [fetchGas]);

  function handleRefresh() {
    setRefreshing(true);
    fetchGas();
  }

  function formatCost(gas: bigint): string {
    if (!gasPrice) return "--";
    const cost = ethers.formatEther(gas * gasPrice);
    return parseFloat(cost).toFixed(6);
  }

  function formatUSD(gas: bigint): string {
    if (!gasPrice) return "--";
    const ethCost = parseFloat(ethers.formatEther(gas * gasPrice));
    return (ethCost * 2015).toFixed(2);
  }

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-[#0ea5e9]/5 to-[#06b6d4]/5 border border-[#0ea5e9]/20">
        <p className="text-xs text-[#64748b] mb-1">Wallet Balance</p>
        <p className="text-2xl font-semibold text-[#0f172a]">{parseFloat(walletBalance).toFixed(4)} <span className="text-base text-[#64748b]">ETH</span></p>
        <p className="font-mono text-[10px] text-[#94a3b8] mt-1">{walletAddress}</p>
      </div>

      {/* Gas Price */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0]">
        <div>
          <p className="text-xs text-[#64748b]">Current Gas Price</p>
          <p className="text-lg font-semibold text-[#0f172a]">
            {loading ? "..." : gasPriceGwei} <span className="text-xs text-[#64748b] font-normal">Gwei</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[#94a3b8] hover:text-[#0ea5e9] transition-colors disabled:opacity-50"
          title="Refresh gas price"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
      </div>

      {/* Gas Estimates Table */}
      <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748b]">Operation</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748b]">Gas</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748b]">Cost (ETH)</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748b]">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e2e8f0]">
              <td className="px-4 py-3 text-[#0f172a]">ETH Transfer</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-[#64748b]">{TRANSFER_GAS.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-[#0f172a]">{formatCost(TRANSFER_GAS)}</td>
              <td className="px-4 py-3 text-right text-xs text-[#94a3b8]">${formatUSD(TRANSFER_GAS)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-[#0f172a]">Deploy NFT Contract</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-[#64748b]">{DEPLOY_GAS.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono text-xs text-[#0f172a]">{formatCost(DEPLOY_GAS)}</td>
              <td className="px-4 py-3 text-right text-xs text-[#94a3b8]">${formatUSD(DEPLOY_GAS)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#94a3b8]">Gas price auto-refreshes every 15 seconds. USD estimates based on ETH ≈ $2,015.</p>

      <button
        onClick={onContinue}
        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium text-sm transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
