# PRD：以太坊 NFT 批量铸造工具

## 概述

构建一个带 Web 界面的工具，用于在以太坊主网上部署 ERC-721 NFT 合约并批量铸造。所有 NFT 共享同一张图片，支持一次性铸造最多 10,000 个 token。

## 目标

- 一键式部署 ERC-721 合约到以太坊主网
- 批量铸造 10,000 个 NFT（同一张图片）
- 通过 Web 界面操作，使用 MetaMask 钱包签名
- 提供实时 Gas 费用估算

## 技术方案

### 技术栈

| 层 | 技术 |
|---|------|
| 智能合约 | Solidity + OpenZeppelin ERC-721 |
| 合约工具链 | Hardhat |
| 前端 | Next.js + TypeScript |
| 链交互 | ethers.js + MetaMask |
| 图片存储 | IPFS（Pinata） |

### 智能合约设计

**合约名称**：`MyNFT.sol`

**基于**：OpenZeppelin `ERC721`、`Ownable`

**核心接口**：

```solidity
constructor(string memory name, string memory symbol, string memory baseTokenURI)
function mintBatch(address to, uint256 quantity) external onlyOwner
function tokenURI(uint256 tokenId) public view override returns (string memory)
```

**关键设计**：
- `mintBatch` 支持批量铸造，每次调用铸造指定数量（建议每批 500 个以控制 Gas）
- `tokenURI()` 重写：所有 token 返回同一个 IPFS metadata URI
- 使用 `Ownable` 限制铸造权限仅合约部署者

**Metadata 格式（存储于 IPFS）**：

```json
{
  "name": "MyNFT #1",
  "description": "My NFT Collection",
  "image": "ipfs://<图片CID>"
}
```

所有 token 共享同一个 metadata JSON，仅 name 中的编号不同。实现方式：`tokenURI()` 动态拼接 baseURI + tokenId。每个 tokenId 对应一个预生成的 JSON 文件上传至 IPFS 目录。

### Gas 成本估算

**基准条件**（2026年3月以太坊主网）：

| 参数 | 数值 |
|------|------|
| 单次 mint gas 消耗 | 50,000 - 80,000 gas units |
| 当前 Gas Price | ~0.041 Gwei |
| ETH 价格 | ~$2,015 |

**成本计算**：

| 项目 | 费用 |
|------|------|
| 单个 NFT 铸造 | $0.004 - $0.008 |
| 10,000 个 NFT | **$40 - $80** |
| 合约部署 | ~$0.05 - $0.10 |
| IPFS 存储（Pinata 免费层） | $0 |
| **总计** | **~$40 - $80 USD** |

> **风险提示**：Gas Price 波动极大。若网络拥堵回到 30+ Gwei，成本将上升数百倍（可达 $30,000+）。工具内置实时 Gas 估算，铸造前会显示预估费用。

### 前端设计

**界面风格**：简洁单页，深色主题，步骤式引导（Stepper）

**5 步流程**：

1. **连接钱包** — MetaMask 连接，显示账户地址和 ETH 余额
2. **上传图片** — 选择图片文件，上传至 IPFS（Pinata API），返回 CID
3. **部署合约** — 填写集合名称（Name）和符号（Symbol），点击部署，返回合约地址
4. **批量铸造** — 输入铸造数量（默认 10,000），显示预估 Gas 费用，点击铸造
   - 自动分批执行（每批 500 个）
   - 实时进度条：当前批次 / 总批次
   - 每批完成显示交易 hash
5. **结果面板** — 汇总展示：合约地址、已铸造数量、总 Gas 花费、Etherscan 链接

### 项目结构

```
nft/
├── contracts/
│   └── MyNFT.sol              # ERC-721 合约
├── scripts/
│   └── deploy.js              # Hardhat 部署脚本（备用）
├── test/
│   └── MyNFT.test.js          # 合约单元测试
├── frontend/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # 主页面（Stepper 流程）
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ConnectWallet.tsx   # 钱包连接组件
│   │   ├── UploadImage.tsx     # IPFS 上传组件
│   │   ├── DeployContract.tsx  # 合约部署组件
│   │   ├── BatchMint.tsx       # 批量铸造 + 进度组件
│   │   └── ResultPanel.tsx     # 结果展示组件
│   ├── lib/
│   │   ├── contract.ts        # 合约 ABI 与交互逻辑
│   │   ├── ipfs.ts            # Pinata 上传封装
│   │   └── gas.ts             # Gas 估算工具
│   └── public/
├── hardhat.config.js
├── package.json
└── .env.example               # Pinata API Key 等配置模板
```

### 关键技术决策

- 合约通过 Hardhat 编译，ABI 输出供前端使用
- 前端通过 MetaMask（`window.ethereum`）直接部署和调用合约，无需后端服务
- Pinata API Key 由用户在界面中输入或通过 `.env` 配置，前端不硬编码密钥
- 批量铸造分批执行，避免单笔交易 Gas 超限

## 非目标

- 不支持 ERC-1155
- 不支持多图片/不同元数据的 NFT
- 不包含二级市场交易功能
- 不包含后端服务

## 测试策略

- Hardhat 本地网络单元测试：部署、铸造、权限控制、tokenURI 返回
- 前端组件手动测试：钱包连接、IPFS 上传、部署流程、铸造进度
- 部署前可先在 Sepolia 测试网验证全流程
