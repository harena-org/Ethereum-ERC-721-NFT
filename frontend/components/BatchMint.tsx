"use client";

import { useState } from "react";
import { mintBatch } from "@/lib/contract";
import { estimateGasPrice, estimateMintCost } from "@/lib/gas";

interface Props {
  signer: any;
  contractAddress: string;
  walletAddress: string;
  onComplete: (txHashes: string[], totalGasUsed: string) => void;
}

export default function BatchMint({ signer, contractAddress, walletAddress, onComplete }: Props) {
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
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
          min={1}
          max={100000}
        />
        <button
          onClick={handleEstimate}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
        >
          Estimate Gas
        </button>
      </div>

      {estimate && (
        <div className="rounded-lg border border-gray-800 p-3 text-sm">
          <p>Estimated cost: <span className="text-white font-medium">{estimate.totalCostETH} ETH</span> (~${estimate.totalCostUSD})</p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading || quantity <= 0}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? `Minting... ${currentBatch}/${totalBatches}` : `Mint ${quantity.toLocaleString()} NFTs`}
      </button>

      {loading && (
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {txHashes.length > 0 && (
        <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
          {txHashes.map((hash, i) => (
            <p key={hash}>
              Batch {i + 1}:{" "}
              <a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono">
                {hash.slice(0, 10)}...
              </a>
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
