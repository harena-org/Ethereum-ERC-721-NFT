"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { deployContract } from "@/lib/contract";
import { formatError } from "@/lib/error";
import { uploadSharedMetadata } from "@/lib/ipfs";
import type { PinataConfig } from "@/lib/ipfs";

interface DeployedContract {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
}

interface Props {
  signer: any;
  imageCID: string;
  pinataConfig: PinataConfig;
  explorerUrl: string;
  apiUrl: string;
  walletAddress: string;
  onDeployed: (contractAddress: string) => void;
}

const ERC721_INTERFACE_ID = "0x80ac58cd";
const MINIMAL_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function supportsInterface(bytes4) view returns (bool)",
];

export default function DeployContract({ signer, imageCID, pinataConfig, explorerUrl, apiUrl, walletAddress, onDeployed }: Props) {
  const [name, setName] = useState("MyNFT");
  const [symbol, setSymbol] = useState("MNFT");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [contracts, setContracts] = useState<DeployedContract[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  async function handleDeploy() {
    setLoading(true);
    setError("");
    try {
      setStatus("Uploading metadata to IPFS...");
      const metadataCID = await uploadSharedMetadata(
        name,
        `${name} Collection`,
        imageCID,
        pinataConfig
      );
      const baseURI = `ipfs://${metadataCID}`;

      setStatus("Deploying contract...");
      const { address } = await deployContract(signer, name, symbol, baseURI);
      setContractAddress(address);
      setStatus("");
      onDeployed(address);
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  async function checkERC721(addr: string, provider: ethers.BrowserProvider): Promise<DeployedContract | null> {
    try {
      const contract = new ethers.Contract(addr, MINIMAL_ABI, provider);
      const isERC721 = await contract.supportsInterface(ERC721_INTERFACE_ID);
      if (!isERC721) return null;
      const [n, s, supply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
      ]);
      return { address: addr, name: n, symbol: s, totalSupply: supply.toString() };
    } catch {
      return null;
    }
  }

  async function handleListContracts() {
    setListLoading(true);
    setError("");
    setContracts([]);
    setStatus("Fetching transaction history...");
    try {
      const url = `${apiUrl}?module=account&action=txlist&address=${walletAddress}&sort=desc&startblock=0&endblock=99999999`;
      const res = await fetch(url);
      const text = await res.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        setError("Etherscan API unavailable. Please use manual input below.");
        return;
      }

      if (data.status !== "1" || !Array.isArray(data.result)) {
        setError("No contract deployments found for this wallet");
        return;
      }

      // Filter contract creation txs (to is empty)
      const creationTxs = data.result.filter(
        (tx: any) => tx.from.toLowerCase() === walletAddress.toLowerCase() && tx.to === "" && tx.isError === "0"
      );

      if (creationTxs.length === 0) {
        setError("No contract deployments found for this wallet");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum!);
      const found: DeployedContract[] = [];

      for (let i = 0; i < creationTxs.length && found.length < 5; i++) {
        setStatus(`Checking contract ${i + 1}/${Math.min(creationTxs.length, 10)}...`);
        if (i >= 10) break; // Only check first 10 txs
        try {
          const receipt = await provider.getTransactionReceipt(creationTxs[i].hash);
          if (!receipt?.contractAddress) continue;

          const info = await checkERC721(receipt.contractAddress, provider);
          if (info) found.push(info);
        } catch {
          // skip
        }
      }

      setContracts(found);
      if (found.length === 0) {
        setError("No ERC-721 contracts found");
      }
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setListLoading(false);
      setStatus("");
    }
  }

  async function handleManualAddress() {
    if (!manualAddress.trim()) return;
    setManualLoading(true);
    setError("");
    try {
      const addr = manualAddress.trim();
      if (!ethers.isAddress(addr)) {
        setError("Invalid contract address");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const info = await checkERC721(addr, provider);
      if (info) {
        setContracts([info]);
      } else {
        setError("Not a valid ERC-721 contract");
      }
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setManualLoading(false);
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
      <div className="flex gap-2">
        <button
          onClick={handleDeploy}
          disabled={loading || !name || !symbol}
          className="flex-1 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
        >
          {loading ? "Deploying..." : "Deploy Contract"}
        </button>
        <button
          onClick={handleListContracts}
          disabled={listLoading}
          className="px-4 py-2.5 bg-[#f1f5f9] border border-[#e2e8f0] hover:bg-[#e2e8f0] disabled:opacity-50 rounded-lg text-xs text-[#64748b] transition-colors whitespace-nowrap"
        >
          {listLoading ? "Loading..." : "List My Contracts"}
        </button>
      </div>
      {listLoading && status && (
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <div className="w-3 h-3 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
          {status}
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {contracts.length > 0 && (
        <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
          <div className="px-3 py-2 bg-[#f8fafc] border-b border-[#e2e8f0]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">My ERC-721 Contracts</p>
          </div>
          {contracts.map((c) => (
            <div key={c.address} className="px-3 py-3 border-b border-[#e2e8f0] last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-xs text-[#0f172a] font-medium">{c.name} ({c.symbol})</p>
                  <p className="font-mono text-[10px] text-[#94a3b8] truncate">{c.address}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">Minted: {parseInt(c.totalSupply).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => {
                    setContractAddress(c.address);
                    onDeployed(c.address);
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white transition-colors"
                >
                  Mint
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#e2e8f0]" />
        <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">or use existing contract</span>
        <div className="flex-1 h-px bg-[#e2e8f0]" />
      </div>

      {/* Manual contract address */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste contract address, e.g. 0x..."
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          className="flex-1 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] font-mono"
        />
        <button
          onClick={handleManualAddress}
          disabled={!manualAddress.trim() || manualLoading}
          className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-xs transition-colors whitespace-nowrap"
        >
          {manualLoading ? "Checking..." : "Check"}
        </button>
      </div>

      <div className="rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] p-4 text-xs text-[#64748b] space-y-1">
        <p className="font-medium text-[#475569]">About these fields</p>
        <p><strong>Collection Name</strong> — Your NFT collection name, e.g. CoolCats, BoredApe. Shown on OpenSea and other marketplaces.</p>
        <p><strong>Symbol</strong> — Short token symbol (like a stock ticker), e.g. COOL, BAYC. Usually 3-5 uppercase letters.</p>
        <p>Defaults are <code className="bg-white px-1 rounded">MyNFT</code> / <code className="bg-white px-1 rounded">MNFT</code> — feel free to customize.</p>
      </div>
    </div>
  );
}
