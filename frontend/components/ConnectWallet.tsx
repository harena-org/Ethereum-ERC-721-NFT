"use client";

import { useState } from "react";
import { connectWallet } from "@/lib/contract";

interface Props {
  onConnected: (address: string, balance: string, signer: any) => void;
}

export default function ConnectWallet({ onConnected }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const wallet = await connectWallet();
      setAddress(wallet.address);
      setBalance(wallet.balance);
      onConnected(wallet.address, wallet.balance, wallet.signer);
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }

  if (address) {
    return (
      <div className="rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-400">Connected</p>
        <p className="font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</p>
        <p className="text-sm text-gray-400 mt-1">{parseFloat(balance).toFixed(4)} ETH</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? "Connecting..." : "Connect MetaMask"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
