English | [中文](./README.md)

# Ethereum ERC-721 NFT Mint Tool

A web-based tool for deploying ERC-721 NFT contracts on Ethereum and batch minting NFTs. All NFTs share the same image, designed for large-scale batch minting.

## Features

- **Task Card Dashboard** — Three task cards (Prepare Image → Deploy Contract → Mint NFTs) with clear status tracking
- **MetaMask Wallet** — Connect, switch accounts, disconnect
- **Network Switching** — Sepolia testnet, Ethereum mainnet, Holesky testnet
- **Live Navbar Info** — Gas price and balance displayed in navbar, auto-refreshing every 15 seconds
- **IPFS Image Upload** — Upload images via Pinata API, or use an existing CID directly
- **Contract Deployment** — One-click ERC-721 deployment with custom name and symbol
- **Use Existing Contract** — Validate and mint on any ERC-721 contract
- **Batch Minting** — Mint in batches of 500, with real-time progress tracking
- **Gas Tracking** — Actual gas cost calculated from transaction receipts
- **Responsive Design** — Desktop: 3-column card grid + side drawer; Mobile: stacked cards + full-screen drawer
- **Pinata Key Persistence** — API keys stored in sessionStorage, preserved across drawer opens

## Tech Stack

- **Smart Contract**: Solidity 0.8.28, OpenZeppelin v5, Hardhat v2
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Blockchain**: ethers.js v6
- **Storage**: IPFS (Pinata)
- **Wallet**: MetaMask

## Project Structure

```
├── contracts/
│   └── MyNFT.sol              # ERC-721 smart contract
├── test/
│   └── MyNFT.test.js          # Contract tests
├── scripts/
│   └── deploy.js              # Deploy script
├── frontend/
│   ├── app/                   # Next.js pages
│   ├── components/            # React components
│   │   ├── TaskCard.tsx       # Task card (locked/ready/done states)
│   │   ├── Drawer.tsx         # Side drawer / modal
│   │   ├── UploadImage.tsx    # Image upload (Tab: Upload New / Use Existing CID)
│   │   ├── DeployContract.tsx # Contract deploy (Tab: Deploy New / Use Existing)
│   │   └── BatchMint.tsx      # Batch minting + results display
│   └── lib/                   # Utilities
│       ├── contract.ts        # Contract interactions
│       ├── ipfs.ts            # IPFS upload
│       ├── gas.ts             # Gas estimation
│       ├── networks.ts        # Network config
│       └── error.ts           # Error handling
├── hardhat.config.js
└── package.json
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install
```

### 2. Compile Contracts

```bash
npx hardhat compile
```

### 3. Run Tests

```bash
npx hardhat test
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Usage Flow

1. **Connect Wallet** — Open the page and click Connect MetaMask
2. **Prepare Image** — Click the "Prepare Image" card to upload an image to IPFS or enter an existing CID
3. **Deploy Contract** — Click the "Deploy Contract" card to deploy a new contract or use an existing address
4. **Mint NFTs** — Click the "Mint NFTs" card, set the quantity, and start batch minting. Results are displayed in the same panel upon completion

> Task cards unlock sequentially: image must be prepared before deploying, and contract must be deployed before minting.

## Contract Details

- Built on OpenZeppelin v5 ERC-721 standard
- All tokens share a single tokenURI (same image and metadata)
- `mintBatch` function supports batch minting, up to 500 per transaction
- Only the contract owner can mint

## Getting Pinata API Key

1. Visit [app.pinata.cloud](https://app.pinata.cloud) and sign up
2. Go to **API Keys** page
3. Click **New Key** to generate API Key and API Secret
4. Free tier: 1GB storage + 100 requests/month

## Cost Estimate

At Gas Price 0.041 Gwei, minting 10,000 NFTs:
- Contract deployment: ~0.00014 ETH
- Batch minting (20 batches x 500): ~0.026 ETH
- **Total: ~0.027 ETH (~$54)**

*Actual costs depend on gas price at time of transaction*

## License

MIT
