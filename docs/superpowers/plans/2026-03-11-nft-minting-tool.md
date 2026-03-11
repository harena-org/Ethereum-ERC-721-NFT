# 以太坊 NFT 批量铸造工具 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based tool to deploy an ERC-721 NFT contract on Ethereum mainnet and batch mint 10,000 tokens sharing the same image.

**Architecture:** Hardhat compiles a Solidity ERC-721 contract (OpenZeppelin). A Next.js frontend connects MetaMask to deploy the contract and batch-mint tokens. Images are uploaded to IPFS via Pinata. No backend needed.

**Tech Stack:** Solidity, OpenZeppelin, Hardhat, Next.js (App Router), TypeScript, ethers.js, Pinata IPFS API

**Spec:** `docs/superpowers/specs/2026-03-11-nft-minting-tool-design.md`

---

## File Structure

```
nft/
├── contracts/
│   └── MyNFT.sol                    # ERC-721 contract with mintBatch
├── test/
│   └── MyNFT.test.js                # Hardhat unit tests
├── scripts/
│   └── deploy.js                    # Hardhat deploy script (backup)
├── hardhat.config.js                # Hardhat configuration
├── package.json                     # Root: Hardhat + shared deps
├── .env.example                     # Config template
├── frontend/
│   ├── package.json                 # Frontend deps
│   ├── next.config.js               # Next.js config
│   ├── tsconfig.json
│   ├── tailwind.config.ts           # Tailwind (dark theme)
│   ├── app/
│   │   ├── layout.tsx               # Root layout (dark theme, fonts)
│   │   ├── page.tsx                 # Main stepper page
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── ConnectWallet.tsx         # Step 1: wallet connection
│   │   ├── UploadImage.tsx           # Step 2: IPFS upload
│   │   ├── DeployContract.tsx        # Step 3: deploy contract
│   │   ├── BatchMint.tsx             # Step 4: batch mint + progress
│   │   └── ResultPanel.tsx           # Step 5: results summary
│   └── lib/
│       ├── contract.ts              # ABI + deploy/mint helpers
│       ├── ipfs.ts                  # Pinata upload wrapper
│       └── gas.ts                   # Gas estimation utility
```

---

## Chunk 1: Smart Contract + Tests

### Task 1: Project Init + Hardhat Setup

**Files:**
- Create: `package.json`
- Create: `hardhat.config.js`
- Create: `.env.example`

- [ ] **Step 1: Initialize project and install Hardhat + OpenZeppelin**

```bash
cd /home/ubuntu/nft
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

- [ ] **Step 2: Create hardhat.config.js**

```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    mainnet: {
      url: process.env.ETH_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
```

- [ ] **Step 3: Create .env.example**

```
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_here
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
.env
dist/
build/
artifacts/
cache/
typechain-types/
frontend/.next/
```

- [ ] **Step 5: Verify Hardhat runs**

Run: `npx hardhat compile`
Expected: "Nothing to compile" (no contracts yet)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json hardhat.config.js .env.example .gitignore
git commit -m "chore: init Hardhat project with OpenZeppelin"
```

---

### Task 2: Write MyNFT Contract Tests

**Files:**
- Create: `test/MyNFT.test.js`

- [ ] **Step 1: Write failing tests for MyNFT**

```js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyNFT", function () {
  let nft, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    nft = await MyNFT.deploy("TestNFT", "TNFT", "ipfs://QmTestHash/");
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await nft.name()).to.equal("TestNFT");
      expect(await nft.symbol()).to.equal("TNFT");
    });

    it("should set deployer as owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("mintBatch", function () {
    it("should mint specified quantity to address", async function () {
      await nft.mintBatch(owner.address, 10);
      expect(await nft.balanceOf(owner.address)).to.equal(10);
    });

    it("should assign sequential token IDs starting from 1", async function () {
      await nft.mintBatch(owner.address, 3);
      expect(await nft.ownerOf(1)).to.equal(owner.address);
      expect(await nft.ownerOf(2)).to.equal(owner.address);
      expect(await nft.ownerOf(3)).to.equal(owner.address);
    });

    it("should revert when called by non-owner", async function () {
      await expect(
        nft.connect(other).mintBatch(other.address, 1)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should handle large batch (500)", async function () {
      await nft.mintBatch(owner.address, 500);
      expect(await nft.balanceOf(owner.address)).to.equal(500);
    });
  });

  describe("tokenURI", function () {
    it("should return baseURI + tokenId", async function () {
      await nft.mintBatch(owner.address, 1);
      expect(await nft.tokenURI(1)).to.equal("ipfs://QmTestHash/1");
    });

    it("should revert for non-existent token", async function () {
      await expect(nft.tokenURI(999)).to.be.revertedWithCustomError(
        nft,
        "ERC721NonexistentToken"
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx hardhat test`
Expected: FAIL — "MyNFT" contract not found

- [ ] **Step 3: Commit failing tests**

```bash
git add test/MyNFT.test.js
git commit -m "test: add MyNFT contract tests (failing)"
```

---

### Task 3: Implement MyNFT Contract

**Files:**
- Create: `contracts/MyNFT.sol`

- [ ] **Step 1: Write the contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MyNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        for (uint256 i = 0; i < quantity; i++) {
            _mint(to, _nextTokenId);
            _nextTokenId++;
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, tokenId.toString());
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
}
```

- [ ] **Step 2: Compile the contract**

Run: `npx hardhat compile`
Expected: "Compiled 1 Solidity file successfully"

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx hardhat test`
Expected: All 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add contracts/MyNFT.sol
git commit -m "feat: implement MyNFT ERC-721 contract with mintBatch"
```

---

### Task 4: Hardhat Deploy Script

**Files:**
- Create: `scripts/deploy.js`

- [ ] **Step 1: Write deploy script**

```js
const { ethers } = require("hardhat");

async function main() {
  const name = process.env.NFT_NAME || "MyNFT";
  const symbol = process.env.NFT_SYMBOL || "MNFT";
  const baseURI = process.env.BASE_URI || "ipfs://placeholder/";

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy(name, symbol, baseURI);
  await nft.waitForDeployment();

  console.log(`MyNFT deployed to: ${await nft.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Test deploy on local Hardhat network**

Run: `npx hardhat run scripts/deploy.js`
Expected: "MyNFT deployed to: 0x..."

- [ ] **Step 3: Commit**

```bash
git add scripts/deploy.js
git commit -m "feat: add Hardhat deploy script"
```

---

## Chunk 2: Frontend Setup + Lib Layer

### Task 5: Next.js Project Init

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: Create Next.js app**

```bash
cd /home/ubuntu/nft
npx create-next-app@latest frontend --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd /home/ubuntu/nft/frontend
npm install ethers@6
```

- [ ] **Step 3: Set up dark theme in layout.tsx**

Replace `frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFT Minting Tool",
  description: "Deploy and batch mint ERC-721 NFTs on Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create placeholder page.tsx**

Replace `frontend/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">NFT Minting Tool</h1>
      <p className="text-gray-400">Steps will be added here.</p>
    </main>
  );
}
```

- [ ] **Step 5: Verify frontend runs**

Run: `cd /home/ubuntu/nft/frontend && npm run dev`
Expected: Next.js dev server starts on http://localhost:3000

- [ ] **Step 6: Commit**

```bash
cd /home/ubuntu/nft
git add frontend/
git commit -m "chore: init Next.js frontend with dark theme"
```

---

### Task 6: Contract ABI + Lib Layer

**Files:**
- Create: `frontend/lib/contract.ts`
- Create: `frontend/lib/ipfs.ts`
- Create: `frontend/lib/gas.ts`

- [ ] **Step 1: Copy ABI from Hardhat artifacts**

After `npx hardhat compile`, the ABI is at `artifacts/contracts/MyNFT.sol/MyNFT.json`. Create a helper that imports it:

```bash
mkdir -p /home/ubuntu/nft/frontend/lib
```

- [ ] **Step 2: Create contract.ts**

```ts
import { ethers } from "ethers";

// ABI - only the functions we need
export const MyNFT_ABI = [
  "constructor(string name, string symbol, string baseTokenURI)",
  "function mintBatch(address to, uint256 quantity) external",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function owner() view returns (address)",
];

// Bytecode will be pasted from Hardhat compilation output
// Run: node -e "console.log(require('./artifacts/contracts/MyNFT.sol/MyNFT.json').bytecode)"
export let MyNFT_BYTECODE = "";

export function setBytecode(bytecode: string) {
  MyNFT_BYTECODE = bytecode;
}

export async function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not detected");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider;
}

export async function connectWallet() {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  return {
    signer,
    address,
    balance: ethers.formatEther(balance),
  };
}

export async function deployContract(
  signer: ethers.Signer,
  name: string,
  symbol: string,
  baseURI: string
) {
  const factory = new ethers.ContractFactory(MyNFT_ABI, MyNFT_BYTECODE, signer);
  const contract = await factory.deploy(name, symbol, baseURI);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return { contract, address };
}

export async function mintBatch(
  signer: ethers.Signer,
  contractAddress: string,
  to: string,
  quantity: number,
  onBatchComplete?: (batchIndex: number, totalBatches: number, txHash: string) => void
) {
  const contract = new ethers.Contract(contractAddress, MyNFT_ABI, signer);
  const batchSize = 500;
  const totalBatches = Math.ceil(quantity / batchSize);
  const txHashes: string[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const currentBatch = Math.min(batchSize, quantity - i * batchSize);
    const tx = await contract.mintBatch(to, currentBatch);
    const receipt = await tx.wait();
    txHashes.push(receipt.hash);
    onBatchComplete?.(i + 1, totalBatches, receipt.hash);
  }

  return txHashes;
}
```

- [ ] **Step 3: Create ipfs.ts**

```ts
export interface PinataConfig {
  apiKey: string;
  secretKey: string;
}

export async function uploadImageToIPFS(
  file: File,
  config: PinataConfig
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Pinata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export async function uploadMetadataToIPFS(
  metadata: object,
  config: PinataConfig
): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error(`Pinata metadata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export async function uploadMetadataBatch(
  name: string,
  description: string,
  imageCID: string,
  totalSupply: number,
  config: PinataConfig
): Promise<string> {
  // Create a directory of JSON files wrapped in a folder upload
  const files: { name: string; content: string }[] = [];

  for (let i = 1; i <= totalSupply; i++) {
    files.push({
      name: `${i}`,
      content: JSON.stringify({
        name: `${name} #${i}`,
        description,
        image: `ipfs://${imageCID}`,
      }),
    });
  }

  // Upload as folder via Pinata
  const formData = new FormData();
  for (const file of files) {
    formData.append("file", new Blob([file.content]), `metadata/${file.name}`);
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Pinata folder upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash; // This is the folder CID — baseURI = ipfs://{CID}/
}
```

- [ ] **Step 4: Create gas.ts**

```ts
import { ethers } from "ethers";

export async function estimateGasPrice(): Promise<{
  gasPrice: bigint;
  gasPriceGwei: string;
}> {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  return {
    gasPrice,
    gasPriceGwei: ethers.formatUnits(gasPrice, "gwei"),
  };
}

export function estimateMintCost(
  quantity: number,
  gasPrice: bigint,
  gasPerMint: number = 65000
): {
  totalGas: bigint;
  totalCostETH: string;
  totalCostUSD: string;
} {
  const totalGas = BigInt(quantity) * BigInt(gasPerMint);
  const totalCostWei = totalGas * gasPrice;
  const totalCostETH = ethers.formatEther(totalCostWei);
  // Rough ETH price — will be displayed as estimate
  const ethPrice = 2015;
  const costUSD = parseFloat(totalCostETH) * ethPrice;

  return {
    totalGas,
    totalCostETH,
    totalCostUSD: costUSD.toFixed(2),
  };
}
```

- [ ] **Step 5: Add ethers window type declaration**

Create `frontend/global.d.ts`:

```ts
interface Window {
  ethereum?: import("ethers").Eip1193Provider & {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}
```

- [ ] **Step 6: Commit**

```bash
cd /home/ubuntu/nft
git add frontend/lib/ frontend/global.d.ts
git commit -m "feat: add contract, IPFS, and gas utility libs"
```

---

## Chunk 3: Frontend Components

### Task 7: ConnectWallet Component

**Files:**
- Create: `frontend/components/ConnectWallet.tsx`

- [ ] **Step 1: Write ConnectWallet**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ConnectWallet.tsx
git commit -m "feat: add ConnectWallet component"
```

---

### Task 8: UploadImage Component

**Files:**
- Create: `frontend/components/UploadImage.tsx`

- [ ] **Step 1: Write UploadImage**

```tsx
"use client";

import { useState } from "react";
import { uploadImageToIPFS } from "@/lib/ipfs";
import type { PinataConfig } from "@/lib/ipfs";

interface Props {
  onUploaded: (imageCID: string, pinataConfig: PinataConfig) => void;
}

export default function UploadImage({ onUploaded }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cid, setCid] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  }

  async function handleUpload() {
    if (!file || !apiKey || !secretKey) return;
    setLoading(true);
    setError("");
    try {
      const config = { apiKey, secretKey };
      const hash = await uploadImageToIPFS(file, config);
      setCid(hash);
      onUploaded(hash, config);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (cid) {
    return (
      <div className="rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-400">Image uploaded to IPFS</p>
        <p className="font-mono text-sm break-all">ipfs://{cid}</p>
        {preview && <img src={preview} alt="NFT" className="mt-2 w-32 h-32 object-cover rounded" />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Pinata API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Pinata Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-4">
        <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        {preview && <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />}
      </div>
      <button
        onClick={handleUpload}
        disabled={loading || !file || !apiKey || !secretKey}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? "Uploading..." : "Upload to IPFS"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/UploadImage.tsx
git commit -m "feat: add UploadImage component with Pinata integration"
```

---

### Task 9: DeployContract Component

**Files:**
- Create: `frontend/components/DeployContract.tsx`

- [ ] **Step 1: Write DeployContract**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/DeployContract.tsx
git commit -m "feat: add DeployContract component"
```

---

### Task 10: BatchMint Component

**Files:**
- Create: `frontend/components/BatchMint.tsx`

- [ ] **Step 1: Write BatchMint**

```tsx
"use client";

import { useState } from "react";
import { mintBatch } from "@/lib/contract";
import { estimateGasPrice, estimateMintCost } from "@/lib/gas";

interface Props {
  signer: any;
  contractAddress: string;
  walletAddress: string;
  onComplete: (txHashes: string[], totalGasUsed: string) => void;
}

export default function BatchMint({ signer, contractAddress, walletAddress, onComplete }: Props) {
  const [quantity, setQuantity] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<{ totalCostETH: string; totalCostUSD: string } | null>(null);

  async function handleEstimate() {
    try {
      const { gasPrice } = await estimateGasPrice();
      const cost = estimateMintCost(quantity, gasPrice);
      setEstimate(cost);
    } catch (e: any) {
      setError(e.message);
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
      const hashes = await mintBatch(signer, contractAddress, walletAddress, quantity, (batch, total, hash) => {
        setCurrentBatch(batch);
        setTxHashes((prev) => [...prev, hash]);
      });
      onComplete(hashes, estimate?.totalCostETH || "unknown");
    } catch (e: any) {
      setError(e.message || "Minting failed");
    } finally {
      setLoading(false);
    }
  }

  const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
          min={1}
          max={100000}
        />
        <button
          onClick={handleEstimate}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
        >
          Estimate Gas
        </button>
      </div>

      {estimate && (
        <div className="rounded-lg border border-gray-800 p-3 text-sm">
          <p>Estimated cost: <span className="text-white font-medium">{estimate.totalCostETH} ETH</span> (~${estimate.totalCostUSD})</p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading || quantity <= 0}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? `Minting... ${currentBatch}/${totalBatches}` : `Mint ${quantity.toLocaleString()} NFTs`}
      </button>

      {loading && (
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {txHashes.length > 0 && (
        <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
          {txHashes.map((hash, i) => (
            <p key={hash}>
              Batch {i + 1}:{" "}
              <a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono">
                {hash.slice(0, 10)}...
              </a>
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/BatchMint.tsx
git commit -m "feat: add BatchMint component with progress tracking"
```

---

### Task 11: ResultPanel Component

**Files:**
- Create: `frontend/components/ResultPanel.tsx`

- [ ] **Step 1: Write ResultPanel**

```tsx
interface Props {
  contractAddress: string;
  totalMinted: number;
  txHashes: string[];
  totalCostETH: string;
}

export default function ResultPanel({ contractAddress, totalMinted, txHashes, totalCostETH }: Props) {
  return (
    <div className="rounded-lg border border-green-800 bg-green-950/30 p-6 space-y-4">
      <h3 className="text-lg font-bold text-green-400">Minting Complete!</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Contract Address</p>
          <a
            href={`https://etherscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono text-xs break-all"
          >
            {contractAddress}
          </a>
        </div>
        <div>
          <p className="text-gray-400">Total Minted</p>
          <p className="text-white font-medium">{totalMinted.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400">Total Transactions</p>
          <p className="text-white font-medium">{txHashes.length}</p>
        </div>
        <div>
          <p className="text-gray-400">Estimated Gas Cost</p>
          <p className="text-white font-medium">{totalCostETH} ETH</p>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-gray-400 mb-1">Transaction Hashes</p>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {txHashes.map((hash, i) => (
            <a
              key={hash}
              href={`https://etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:underline font-mono text-xs"
            >
              {i + 1}. {hash}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/ResultPanel.tsx
git commit -m "feat: add ResultPanel component"
```

---

## Chunk 4: Main Page Assembly + Bytecode Integration

### Task 12: Assemble Main Page with Stepper

**Files:**
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Write the main stepper page**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: assemble main stepper page with all components"
```

---

### Task 13: Bytecode Integration

**Files:**
- Modify: `frontend/lib/contract.ts`

- [ ] **Step 1: Compile contract and extract bytecode**

```bash
cd /home/ubuntu/nft
npx hardhat compile
```

- [ ] **Step 2: Generate bytecode.ts from compiled artifact**

```bash
cd /home/ubuntu/nft
node -e "
const artifact = require('./artifacts/contracts/MyNFT.sol/MyNFT.json');
const bytecode = artifact.bytecode;
console.log('Bytecode length:', bytecode.length, 'chars');
const content = '// Auto-generated from Hardhat compilation — do not edit\nexport const MyNFT_BYTECODE = \"' + bytecode + '\";\n';
require('fs').writeFileSync('frontend/lib/bytecode.ts', content);
console.log('Written to frontend/lib/bytecode.ts');
"
```

Expected: "Bytecode length: XXXX chars" and "Written to frontend/lib/bytecode.ts"

- [ ] **Step 3: Update contract.ts to import bytecode**

In `frontend/lib/contract.ts`:
- Remove the `export let MyNFT_BYTECODE = "";` line and the `setBytecode` function
- Add at top: `import { MyNFT_BYTECODE } from "./bytecode";`
- Add export: `export { MyNFT_BYTECODE };`

- [ ] **Step 4: Verify frontend compiles**

```bash
cd /home/ubuntu/nft/frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/nft
git add frontend/lib/bytecode.ts frontend/lib/contract.ts
git commit -m "feat: integrate compiled contract bytecode into frontend"
```

---

### Task 14: Final Integration Test

- [ ] **Step 1: Run Hardhat tests**

```bash
cd /home/ubuntu/nft
npx hardhat test
```

Expected: All tests pass

- [ ] **Step 2: Run frontend build**

```bash
cd /home/ubuntu/nft/frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Start dev server and manually verify**

```bash
cd /home/ubuntu/nft/frontend
npm run dev
```

Open http://localhost:3000 — verify stepper UI renders with dark theme

- [ ] **Step 4: Final commit**

```bash
cd /home/ubuntu/nft
git add -A
git commit -m "chore: final integration — NFT minting tool complete"
```
