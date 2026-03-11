"use client";

import { useState } from "react";
import { mintBatch } from "@/lib/contract";
import { formatError } from "@/lib/error";
import { estimateGasPrice, estimateMintCost } from "@/lib/gas";

interface Props {
  signer: any;
  contractAddress: string;
  walletAddress: string;
  explorerUrl: string;
  imageCID: string;
  onComplete: (txHashes: string[], totalGasUsed: string, quantity: number) => void;
}

export default function BatchMint({ signer, contractAddress, walletAddress, explorerUrl, imageCID, onComplete }: Props) {
  const [quantity, setQuantity] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<{ totalCostETH: string; totalCostUSD: string } | null>(null);
  const [done, setDone] = useState(false);
  const [finalCost, setFinalCost] = useState("");
  const [finalQty, setFinalQty] = useState(0);

  async function handleEstimate() {
    try {
      const { gasPrice } = await estimateGasPrice();
      const cost = estimateMintCost(quantity, gasPrice);
      setEstimate(cost);
    } catch (e: any) {
      setError(formatError(e));
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
      const result = await mintBatch(signer, contractAddress, walletAddress, quantity, (batch, total, hash) => {
        setCurrentBatch(batch);
        setTxHashes((prev) => [...prev, hash]);
      });
      setFinalCost(result.totalCostETH);
      setFinalQty(quantity);
      setDone(true);
      onComplete(result.txHashes, result.totalCostETH, quantity);
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;

  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-sm">✓</div>
          <h3 className="text-lg font-semibold text-emerald-600">Minting Complete</h3>
        </div>

        {/* Context */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
          <img src={`https://gateway.pinata.cloud/ipfs/${imageCID}`} alt="NFT" className="w-10 h-10 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-[#94a3b8] truncate">{contractAddress}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-1">Total Minted</p>
            <p className="text-[#0f172a] font-semibold">{finalQty.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-1">Transactions</p>
            <p className="text-[#0f172a] font-semibold">{txHashes.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-1">Gas Cost</p>
            <p className="text-[#0f172a] font-semibold">{finalCost} ETH</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-2">Transaction Hashes</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {txHashes.map((hash, i) => (
              <div key={hash} className="flex items-center justify-between text-xs py-1">
                <span className="text-[#94a3b8]">{i + 1}.</span>
                <a href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline font-mono">
                  {hash.slice(0, 10)}...{hash.slice(-6)}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Context bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
        <img src={`https://gateway.pinata.cloud/ipfs/${imageCID}`} alt="NFT" className="w-10 h-10 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="text-xs text-[#64748b]">Contract</p>
          <a href={`${explorerUrl}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-[#0ea5e9] hover:underline truncate block">
            {contractAddress}
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          className="flex-1 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:border-[#0ea5e9]"
          min={1}
          max={100000}
        />
        <button
          onClick={handleEstimate}
          className="px-4 py-2.5 bg-[#f1f5f9] border border-[#e2e8f0] hover:bg-[#e2e8f0] rounded-lg text-xs text-[#64748b] transition-colors whitespace-nowrap"
        >
          Estimate Gas
        </button>
      </div>

      {estimate && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
          <span className="text-amber-700">Estimated cost</span>
          <span className="text-[#0f172a] font-medium">{estimate.totalCostETH} ETH <span className="text-[#94a3b8] font-normal">(~${estimate.totalCostUSD})</span></span>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading || quantity <= 0}
        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
      >
        {loading ? `Minting... ${currentBatch}/${totalBatches}` : `Mint ${quantity.toLocaleString()} NFTs`}
      </button>

      {loading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#64748b]">
            <span>Progress</span>
            <span>{currentBatch}/{totalBatches} batches</span>
          </div>
          <div className="w-full bg-[#e2e8f0] rounded-full h-1.5">
            <div className="bg-[#0ea5e9] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {txHashes.length > 0 && !done && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {txHashes.map((hash, i) => (
            <div key={hash} className="flex items-center justify-between text-xs py-1">
              <span className="text-[#94a3b8]">Batch {i + 1}</span>
              <a href={`${explorerUrl}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline font-mono">
                {hash.slice(0, 10)}...{hash.slice(-6)}
              </a>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
