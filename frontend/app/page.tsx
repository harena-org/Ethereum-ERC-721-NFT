"use client";

import { useState } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import UploadImage from "@/components/UploadImage";
import DeployContract from "@/components/DeployContract";
import BatchMint from "@/components/BatchMint";
import ResultPanel from "@/components/ResultPanel";
import type { PinataConfig } from "@/lib/ipfs";

const STEPS = ["Connect Wallet", "Upload Image", "Deploy Contract", "Batch Mint", "Results"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [signer, setSigner] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [imageCID, setImageCID] = useState("");
  const [pinataConfig, setPinataConfig] = useState<PinataConfig | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [mintQuantity] = useState(10000);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [totalCostETH, setTotalCostETH] = useState("");

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">NFT Minting Tool</h1>

      {/* Stepper */}
      <div className="flex items-center mb-8 gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500"
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-1 text-xs ${i <= step ? "text-gray-200" : "text-gray-600"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px mx-1 ${i < step ? "bg-blue-600" : "bg-gray-800"}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {step === 0 && (
          <ConnectWallet
            onConnected={(address, balance, s) => {
              setWalletAddress(address);
              setSigner(s);
              setStep(1);
            }}
          />
        )}

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
          />
        )}
      </div>
    </main>
  );
}
