"use client";

import { useState } from "react";
import { NETWORKS, switchNetwork, type Network } from "@/lib/networks";

interface Props {
  onNetworkChange: (network: Network) => void;
  disabled?: boolean;
}

export default function NetworkSelector({ onNetworkChange, disabled }: Props) {
  const [selected, setSelected] = useState<Network>(NETWORKS[0]);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const network = NETWORKS.find((n) => n.chainId === parseInt(e.target.value));
    if (!network) return;

    setSwitching(true);
    setError("");
    try {
      await switchNetwork(network);
      setSelected(network);
      onNetworkChange(network);
    } catch (err: any) {
      setError(err.message || "Failed to switch network");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected.chainId}
        onChange={handleChange}
        disabled={disabled || switching}
        className="bg-[#0c0c1a] border border-[#1e1e3a] rounded-md px-3 py-1.5 text-xs text-[#94a3b8] disabled:opacity-50 focus:outline-none focus:border-[#0ea5e9]"
      >
        {NETWORKS.map((n) => (
          <option key={n.chainId} value={n.chainId}>
            {n.name}
          </option>
        ))}
      </select>
      {switching && <span className="text-xs text-[#475569]">Switching...</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
