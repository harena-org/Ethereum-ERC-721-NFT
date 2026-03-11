"use client";

import { useState } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import UploadImage from "@/components/UploadImage";
import DeployContract from "@/components/DeployContract";
import BatchMint from "@/components/BatchMint";
import ResultPanel from "@/components/ResultPanel";
import NetworkSelector from "@/components/NetworkSelector";
import { NETWORKS, type Network } from "@/lib/networks";
import type { PinataConfig } from "@/lib/ipfs";

const STEPS = [
  { label: "Connect Wallet", desc: "Link your MetaMask wallet" },
  { label: "Upload Image", desc: "Upload NFT artwork to IPFS" },
  { label: "Deploy Contract", desc: "Deploy ERC-721 to Ethereum" },
  { label: "Batch Mint", desc: "Mint NFTs in batches of 500" },
  { label: "Results", desc: "View minting summary" },
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [network, setNetwork] = useState<Network>(NETWORKS[0]);
  const [signer, setSigner] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [imageCID, setImageCID] = useState("");
  const [pinataConfig, setPinataConfig] = useState<PinataConfig | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [mintQuantity] = useState(10000);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [totalCostETH, setTotalCostETH] = useState("");

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Nav */}
      <nav className="border-b border-[#e2e8f0] bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center text-xs font-bold text-white">⬡</div>
          <span className="text-[#0f172a] font-semibold text-sm">NFT Minting Tool</span>
        </div>
        <div className="flex items-center gap-3">
          <NetworkSelector
            onNetworkChange={(n) => setNetwork(n)}
            disabled={step > 0}
          />
          {walletAddress && (
            <div className="flex items-center gap-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-md px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs text-[#64748b]">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-white border-b border-[#e2e8f0] flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-[3px] rounded-full transition-colors ${
              i <= step ? "bg-[#0ea5e9]" : "bg-[#e2e8f0]"
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      {step === 0 ? (
        <div className="max-w-lg mx-auto px-6">
          <ConnectWallet
            onConnected={(address, balance, s) => {
              setWalletAddress(address);
              setWalletBalance(balance);
              setSigner(s);
              setStep(1);
            }}
          />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-[1fr_300px] gap-6">
            {/* Left: Action Area */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
              <div className="mb-1 flex items-center gap-3">
                <span className="text-xs font-semibold text-[#0ea5e9] tracking-wider uppercase">Step {step + 1}</span>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0f172a] mb-1">{STEPS[step].label}</h2>
              <p className="text-sm text-[#64748b] mb-6">{STEPS[step].desc}</p>

              {step === 1 && (
                <UploadImage
                  onUploaded={(cid, config) => {
                    setImageCID(cid);
                    setPinataConfig(config);
                    setStep(2);
                  }}
                />
              )}

              {step === 2 && pinataConfig && (
                <DeployContract
                  signer={signer}
                  imageCID={imageCID}
                  pinataConfig={pinataConfig}
                  mintQuantity={mintQuantity}
                  explorerUrl={network.explorerUrl}
                  onDeployed={(addr) => {
                    setContractAddress(addr);
                    setStep(3);
                  }}
                />
              )}

              {step === 3 && (
                <BatchMint
                  signer={signer}
                  contractAddress={contractAddress}
                  walletAddress={walletAddress}
                  explorerUrl={network.explorerUrl}
                  onComplete={(hashes, cost) => {
                    setTxHashes(hashes);
                    setTotalCostETH(cost);
                    setStep(4);
                  }}
                />
              )}

              {step === 4 && (
                <ResultPanel
                  contractAddress={contractAddress}
                  totalMinted={mintQuantity}
                  txHashes={txHashes}
                  totalCostETH={totalCostETH}
                  explorerUrl={network.explorerUrl}
                />
              )}
            </div>

            {/* Right: Info Panel */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 h-fit">
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">Progress</h4>
              <div className="space-y-3 mb-6">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {i < step ? (
                        <span className="text-emerald-500 text-xs">✓</span>
                      ) : i === step ? (
                        <span className="text-[#0ea5e9] text-xs">→</span>
                      ) : (
                        <span className="text-[#cbd5e1] text-xs">○</span>
                      )}
                      <span className={`text-xs ${
                        i < step ? "text-emerald-600" : i === step ? "text-[#0ea5e9]" : "text-[#94a3b8]"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    <span className={`text-[10px] ${
                      i < step ? "text-[#94a3b8]" : i === step ? "text-[#64748b]" : "text-[#cbd5e1]"
                    }`}>
                      {i < step ? "Done" : i === step ? "In progress" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>

              {walletAddress && (
                <div className="border-t border-[#e2e8f0] pt-4 mb-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">Wallet</h4>
                  <p className="font-mono text-xs text-[#0f172a] break-all">{walletAddress}</p>
                  <p className="text-xs text-[#64748b] mt-1">{parseFloat(walletBalance).toFixed(4)} ETH</p>
                </div>
              )}

              <div className="border-t border-[#e2e8f0] pt-4">
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">Network</h4>
                <p className="text-xs text-[#0f172a]">{network.name}</p>
                <p className="text-[10px] text-[#94a3b8] mt-1">Chain ID: {network.chainId}</p>
              </div>

              {contractAddress && (
                <div className="border-t border-[#e2e8f0] pt-4 mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">Contract</h4>
                  <a
                    href={`${network.explorerUrl}/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#0ea5e9] hover:underline break-all"
                  >
                    {contractAddress}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
