"use client";

import { useState } from "react";
import { deployContract } from "@/lib/contract";
import { uploadMetadataBatch } from "@/lib/ipfs";
import type { PinataConfig } from "@/lib/ipfs";

interface Props {
  signer: any;
  imageCID: string;
  pinataConfig: PinataConfig;
  mintQuantity: number;
  explorerUrl: string;
  onDeployed: (contractAddress: string) => void;
}

export default function DeployContract({ signer, imageCID, pinataConfig, mintQuantity, explorerUrl, onDeployed }: Props) {
  const [name, setName] = useState("MyNFT");
  const [symbol, setSymbol] = useState("MNFT");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [contractAddress, setContractAddress] = useState("");

  async function handleDeploy() {
    setLoading(true);
    setError("");
    try {
      setStatus("Uploading metadata to IPFS...");
      const metadataCID = await uploadMetadataBatch(
        name,
        `${name} Collection`,
        imageCID,
        mintQuantity,
        pinataConfig
      );
      const baseURI = `ipfs://${metadataCID}/`;

      setStatus("Deploying contract...");
      const { address } = await deployContract(signer, name, symbol, baseURI);
      setContractAddress(address);
      setStatus("");
      onDeployed(address);
    } catch (e: any) {
      setError(e.message || "Deploy failed");
    } finally {
      setLoading(false);
    }
  }

  if (contractAddress) {
    return (
      <div className="p-3 rounded-lg bg-[#0ea5e9]/5 border border-[#0ea5e9]/20">
        <p className="text-sm text-[#0ea5e9] font-medium mb-1">Contract Deployed</p>
        <p className="font-mono text-xs text-[#64748b] break-all mb-1">{contractAddress}</p>
        <a
          href={`${explorerUrl}/address/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#0ea5e9] hover:underline"
        >
          View on Explorer &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Collection Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
      />
      <input
        type="text"
        placeholder="Symbol (e.g. MNFT)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
      />
      {loading && (
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <div className="w-3 h-3 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
          {status}
        </div>
      )}
      <button
        onClick={handleDeploy}
        disabled={loading || !name || !symbol}
        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
      >
        {loading ? "Deploying..." : "Deploy Contract"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
