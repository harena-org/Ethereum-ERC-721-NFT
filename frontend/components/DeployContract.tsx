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
  onDeployed: (contractAddress: string) => void;
}

export default function DeployContract({ signer, imageCID, pinataConfig, mintQuantity, onDeployed }: Props) {
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
      <div className="rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-400">Contract Deployed</p>
        <p className="font-mono text-sm break-all">{contractAddress}</p>
        <a
          href={`https://etherscan.io/address/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 text-sm hover:underline"
        >
          View on Etherscan
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Collection Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button
        onClick={handleDeploy}
        disabled={loading || !name || !symbol}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? status || "Deploying..." : "Deploy Contract"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
