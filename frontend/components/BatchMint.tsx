"use client";

import { useState } from "react";
import { mintBatch } from "@/lib/contract";
import { estimateGasPrice, estimateMintCost } from "@/lib/gas";

interface Props {
  signer: any;
  contractAddress: string;
  walletAddress: string;
  explorerUrl: string;
  onComplete: (txHashes: string[], totalGasUsed: string) => void;
}

export default function BatchMint({ signer, contractAddress, walletAddress, explorerUrl, onComplete }: Props) {
  const [quantity, setQuantity] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<{ totalCostETH: string; totalCostUSD: string } | null>(null);

  async function handleEstimate() {
    try {
      const { gasPrice } = await estimateGasPrice();
      const cost = estimateMintCost(quantity, gasPrice);
      setEstimate(cost);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleMint() {
    setLoading(true);
    setError("");
    setTxHashes([]);
    setCurrentBatch(0);
    const batches = Math.ceil(quantity / 500);
    setTotalBatches(batches);

    try {
      const hashes = await mintBatch(signer, contractAddress, walletAddress, quantity, (batch, total, hash) => {
        setCurrentBatch(batch);
        setTxHashes((prev) => [...prev, hash]);
      });
      onComplete(hashes, estimate?.totalCostETH || "unknown");
    } catch (e: any) {
      setError(e.message || "Minting failed");
    } finally {
      setLoading(false);
    }
  }

  const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          className="flex-1 bg-[#0c0c1a] border border-[#1e1e3a] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#0ea5e9]"
          min={1}
          max={100000}
        />
        <button
          onClick={handleEstimate}
          className="px-4 py-2.5 bg-[#0c0c1a] border border-[#1e1e3a] hover:border-[#2d2d4a] rounded-lg text-xs text-[#94a3b8] transition-colors whitespace-nowrap"
        >
          Estimate Gas
        </button>
      </div>

      {estimate && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c0c1a] border border-[#1e1e3a] text-sm">
          <span className="text-[#475569]">Estimated cost</span>
          <span className="text-[#e2e8f0] font-medium">{estimate.totalCostETH} ETH <span className="text-[#475569] font-normal">(~${estimate.totalCostUSD})</span></span>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading || quantity <= 0}
        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#1e1e3a] disabled:text-[#475569] rounded-lg font-medium text-sm transition-colors"
      >
        {loading ? `Minting... ${currentBatch}/${totalBatches}` : `Mint ${quantity.toLocaleString()} NFTs`}
      </button>

      {loading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#475569]">
            <span>Progress</span>
            <span>{currentBatch}/{totalBatches} batches</span>
          </div>
          <div className="w-full bg-[#141428] rounded-full h-1.5">
            <div
              className="bg-[#0ea5e9] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {txHashes.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {txHashes.map((hash, i) => (
            <div key={hash} className="flex items-center justify-between text-xs py-1">
              <span className="text-[#475569]">Batch {i + 1}</span>
              <a href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline font-mono">
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </a>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
