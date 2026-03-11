"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import TaskCard from "@/components/TaskCard";
import Drawer from "@/components/Drawer";
import UploadImage from "@/components/UploadImage";
import DeployContract from "@/components/DeployContract";
import BatchMint from "@/components/BatchMint";
import { NETWORKS, switchNetwork, type Network } from "@/lib/networks";
import { connectWallet } from "@/lib/contract";
import { formatError } from "@/lib/error";
import type { PinataConfig } from "@/lib/ipfs";

type DrawerType = "image" | "contract" | "mint" | null;

export default function Home() {
  const [network, setNetwork] = useState<Network>(NETWORKS[0]);
  const [signer, setSigner] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [imageCID, setImageCID] = useState("");
  const [pinataConfig, setPinataConfig] = useState<PinataConfig | null>(null);
  const [contractAddress, setContractAddress] = useState("");
  const [mintQuantity, setMintQuantity] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [totalCostETH, setTotalCostETH] = useState("");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [switching, setSwitching] = useState(false);

  // Gas price state for navbar
  const [gasPriceGwei, setGasPriceGwei] = useState("");

  const fetchGas = useCallback(async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const feeData = await provider.getFeeData();
      const gp = feeData.gasPrice ?? 0n;
      setGasPriceGwei(parseFloat(ethers.formatUnits(gp, "gwei")).toFixed(2));
    } catch {}
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const bal = await provider.getBalance(walletAddress);
      setWalletBalance(ethers.formatEther(bal));
    } catch {}
  }, [walletAddress]);

  // Auto-refresh gas every 15s when connected
  useEffect(() => {
    if (!walletAddress) return;
    fetchGas();
    refreshBalance();
    const interval = setInterval(() => { fetchGas(); refreshBalance(); }, 15000);
    return () => clearInterval(interval);
  }, [walletAddress, fetchGas, refreshBalance]);

  async function handleConnect() {
    setConnectLoading(true);
    setConnectError("");
    try {
      const wallet = await connectWallet();
      setWalletAddress(wallet.address);
      setWalletBalance(wallet.balance);
      setSigner(wallet.signer);
    } catch (e: any) {
      setConnectError(formatError(e));
    } finally {
      setConnectLoading(false);
    }
  }

  function handleDisconnect() {
    setShowWalletMenu(false);
    setSigner(null);
    setWalletAddress("");
    setWalletBalance("");
    setImageCID("");
    setPinataConfig(null);
    setContractAddress("");
    setTxHashes([]);
    setTotalCostETH("");
    setMintQuantity(0);
  }

  async function handleNetworkChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const net = NETWORKS.find((n) => n.chainId === parseInt(e.target.value));
    if (!net) return;
    setSwitching(true);
    try {
      await switchNetwork(net);
      setNetwork(net);
    } catch {}
    setSwitching(false);
  }

  // Card statuses
  const imageStatus = imageCID ? "done" : "ready";
  const contractStatus = !imageCID ? "locked" : contractAddress ? "done" : "ready";
  const mintStatus = !contractAddress ? "locked" : txHashes.length > 0 ? "done" : "ready";

  // Not connected — show connect page
  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center text-2xl mb-6">⬡</div>
        <h1 className="text-xl font-semibold text-[#0f172a] mb-2">ERC-721 Mint Tool</h1>
        <p className="text-sm text-[#64748b] mb-8 text-center">Connect your MetaMask wallet to deploy and mint NFTs</p>
        <button
          onClick={handleConnect}
          disabled={connectLoading}
          className="px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
        >
          {connectLoading ? "Connecting..." : "Connect MetaMask"}
        </button>
        {connectError && <p className="text-red-500 text-sm mt-4">{connectError}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Nav */}
      <nav className="border-b border-[#e2e8f0] bg-white px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] flex items-center justify-center text-xs font-bold text-white">⬡</div>
          <span className="text-[#0f172a] font-semibold text-sm hidden md:inline">ERC-721 Mint Tool</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Gas */}
          {gasPriceGwei && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
              <span>⛽</span>
              <span className="font-medium">{gasPriceGwei}</span>
              <span className="text-amber-500 hidden md:inline">Gwei</span>
            </div>
          )}
          {/* Balance */}
          <div className="text-xs font-medium text-[#0f172a] bg-[#f1f5f9] border border-[#e2e8f0] rounded-md px-2.5 py-1.5">
            {parseFloat(walletBalance).toFixed(4)} ETH
          </div>
          {/* Wallet */}
          <div className="relative">
            <button
              onClick={() => setShowWalletMenu((v) => !v)}
              className="flex items-center gap-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-md px-3 py-1.5 hover:bg-[#e2e8f0] transition-colors cursor-pointer"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs text-[#64748b]">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </button>
            {showWalletMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowWalletMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#e2e8f0] rounded-lg shadow-lg py-1 min-w-[180px]">
                  {/* Network selector */}
                  <div className="px-4 py-2 border-b border-[#e2e8f0]">
                    <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] mb-1.5">Network</p>
                    <select
                      value={network.chainId}
                      onChange={handleNetworkChange}
                      disabled={switching}
                      className="w-full bg-[#f1f5f9] border border-[#e2e8f0] rounded px-2 py-1 text-xs text-[#64748b] focus:outline-none"
                    >
                      {NETWORKS.map((n) => (
                        <option key={n.chainId} value={n.chainId}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      setShowWalletMenu(false);
                      try {
                        await window.ethereum!.request({
                          method: "wallet_requestPermissions",
                          params: [{ eth_accounts: {} }],
                        });
                        const provider = new ethers.BrowserProvider(window.ethereum!);
                        const s = await provider.getSigner();
                        const addr = await s.getAddress();
                        const bal = await provider.getBalance(addr);
                        setSigner(s);
                        setWalletAddress(addr);
                        setWalletBalance(ethers.formatEther(bal));
                      } catch {}
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
                  >
                    Switch Account
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#fef2f2] transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Task Cards */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <TaskCard
            icon="📁"
            title="Prepare Image"
            status={imageStatus as any}
            summary={imageCID ? `ipfs://${imageCID.slice(0, 8)}...` : undefined}
            onOpen={() => setActiveDrawer("image")}
          />
          <TaskCard
            icon="📄"
            title="Deploy Contract"
            status={contractStatus as any}
            summary={contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-4)}` : undefined}
            onOpen={() => setActiveDrawer("contract")}
          />
          <TaskCard
            icon="⛏"
            title="Mint NFTs"
            status={mintStatus as any}
            summary={txHashes.length > 0 ? `${mintQuantity.toLocaleString()} minted · ${totalCostETH} ETH` : undefined}
            onOpen={() => setActiveDrawer("mint")}
          />
        </div>
      </div>

      {/* Drawers */}
      <Drawer open={activeDrawer === "image"} onClose={() => setActiveDrawer(null)} title="Prepare Image">
        <UploadImage
          onDone={(cid, config) => {
            setImageCID(cid);
            setPinataConfig(config);
            setActiveDrawer(null);
          }}
        />
      </Drawer>

      <Drawer open={activeDrawer === "contract"} onClose={() => setActiveDrawer(null)} title="Deploy Contract">
        {pinataConfig && (
          <DeployContract
            signer={signer}
            imageCID={imageCID}
            pinataConfig={pinataConfig}
            explorerUrl={network.explorerUrl}
            walletAddress={walletAddress}
            onDone={(addr) => {
              setContractAddress(addr);
              setActiveDrawer(null);
            }}
          />
        )}
      </Drawer>

      <Drawer open={activeDrawer === "mint"} onClose={() => setActiveDrawer(null)} title="Mint NFTs">
        <BatchMint
          signer={signer}
          contractAddress={contractAddress}
          walletAddress={walletAddress}
          explorerUrl={network.explorerUrl}
          imageCID={imageCID}
          onComplete={(hashes, cost, qty) => {
            setTxHashes(hashes);
            setTotalCostETH(cost);
            setMintQuantity(qty);
          }}
        />
      </Drawer>
    </div>
  );
}
