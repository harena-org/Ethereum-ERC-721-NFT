"use client";

import { useState } from "react";
import { connectWallet } from "@/lib/contract";

interface Props {
  onConnected: (address: string, balance: string, signer: any) => void;
}

export default function ConnectWallet({ onConnected }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const wallet = await connectWallet();
      onConnected(wallet.address, wallet.balance, wallet.signer);
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center text-2xl mb-6">
        ⬡
      </div>
      <h2 className="text-xl font-semibold text-[#0f172a] mb-2">Connect Your Wallet</h2>
      <p className="text-sm text-[#64748b] mb-8">Connect MetaMask to start deploying and minting NFTs</p>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
      >
        {loading ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
}
