# ERC-721 → ERC-721A 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 BatchNFT 和 MyNFT 合约从 ERC-721 迁移到 ERC-721A，降低批量铸造 gas 成本，并更新 Go CLI 的 ABI/Bytecode 和 gas 估算。

**Architecture:** 替换 Solidity 合约的 OpenZeppelin ERC721 继承为 ERC721A，利用其内置批量铸造优化。合约接口（构造函数、mintBatch）保持不变，CLI 端仅需更新编译产物和 gas 参数。

**Tech Stack:** Solidity 0.8.28, ERC721A (npm: erc721a), Hardhat, Go (go-ethereum)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `package.json` | 添加 erc721a 依赖 |
| Modify | `contracts/BatchNFT.sol` | 迁移到 ERC721A |
| Modify | `contracts/MyNFT.sol` | 迁移到 ERC721A |
| Regenerate | `cli/contracts/batchnft.go` | 更新 ABI 和 Bytecode 常量 |
| Modify | `cli/internal/contract/contract.go` | 调整 gas 估算 |

---

### Task 1: 安装 ERC721A 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 erc721a npm 包**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT && npm install erc721a
```

- [ ] **Step 2: 验证安装**

```bash
ls node_modules/erc721a/contracts/ERC721A.sol
```

Expected: 文件存在

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add erc721a dependency"
```

---

### Task 2: 迁移 BatchNFT.sol 到 ERC721A

**Files:**
- Modify: `contracts/BatchNFT.sol`

- [ ] **Step 1: 替换合约内容**

将 `contracts/BatchNFT.sol` 替换为：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BatchNFT is ERC721A, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) ERC721A(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 500, "quantity must be 1-500");
        _mint(to, quantity);
    }
}
```

关键变更说明：
- `ERC721` → `ERC721A`
- 删除 `_nextTokenId` 状态变量（ERC721A 内部管理）
- `_startTokenId()` override 返回 1（保持 tokenId 从 1 开始）
- `mintBatch` 中循环调用 `_mint(to, tokenId)` → 单次调用 `_mint(to, quantity)`
- `tokenURI` 中 `_requireOwned(tokenId)` → `_exists(tokenId)` + `URIQueryForNonexistentToken`
- 删除 `totalSupply()` override — ERC721A 内置实现已足够

- [ ] **Step 2: 编译验证**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT && npx hardhat compile
```

Expected: 编译成功，无错误

- [ ] **Step 3: Commit**

```bash
git add contracts/BatchNFT.sol
git commit -m "feat: migrate BatchNFT from ERC-721 to ERC-721A"
```

---

### Task 3: 迁移 MyNFT.sol 到 ERC721A

**Files:**
- Modify: `contracts/MyNFT.sol`

- [ ] **Step 1: 替换合约内容**

将 `contracts/MyNFT.sol` 替换为：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721A, Ownable {
    string private _sharedTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory sharedTokenURI
    ) ERC721A(name, symbol) Ownable(msg.sender) {
        _sharedTokenURI = sharedTokenURI;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 500, "quantity must be 1-500");
        _mint(to, quantity);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        return _sharedTokenURI;
    }
}
```

- [ ] **Step 2: 编译验证**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT && npx hardhat compile
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add contracts/MyNFT.sol
git commit -m "feat: migrate MyNFT from ERC-721 to ERC-721A"
```

---

### Task 4: 更新 Go CLI 的 ABI 和 Bytecode

**Files:**
- Regenerate: `cli/contracts/batchnft.go`

- [ ] **Step 1: 从编译产物中提取 ABI 和 Bytecode**

编译完成后，从 `artifacts/contracts/BatchNFT.sol/BatchNFT.json` 中提取：

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT
# 提取 ABI（压缩为单行 JSON）
cat artifacts/contracts/BatchNFT.sol/BatchNFT.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d['abi'], separators=(',',':')))"
# 提取 Bytecode
cat artifacts/contracts/BatchNFT.sol/BatchNFT.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['bytecode'])"
```

- [ ] **Step 2: 更新 `cli/contracts/batchnft.go`**

用提取到的 ABI 和 Bytecode 替换 `cli/contracts/batchnft.go` 中的 `BatchNFTABI` 和 `BatchNFTBytecode` 常量值。文件结构保持不变：

```go
package contracts

const BatchNFTABI = `<新的 ABI JSON>`

const BatchNFTBytecode = "<新的 bytecode hex>"
```

- [ ] **Step 3: 验证 Go 编译**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT/cli && go build ./...
```

Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT
git add cli/contracts/batchnft.go
git commit -m "feat: update ABI and bytecode for ERC-721A contract"
```

---

### Task 5: 调整 Go CLI 的 Gas 估算

**Files:**
- Modify: `cli/internal/contract/contract.go:145`

- [ ] **Step 1: 修改 MintBatch 的 gasLimit 计算**

在 `cli/internal/contract/contract.go` 第 145 行，将：

```go
gasLimit := uint64(50000 + uint64(batchSize)*30000)
```

改为：

```go
gasLimit := uint64(80000 + uint64(batchSize)*3500)
```

ERC-721A 批量铸造的边际 gas 成本远低于 ERC-721（~3500 vs ~30000 per token，含 Transfer 事件日志开销）。基础开销略高因为 ERC721A 的初始化逻辑。

- [ ] **Step 2: 验证 Go 编译**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT/cli && go build ./...
```

Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT
git add cli/internal/contract/contract.go
git commit -m "feat: adjust gas estimation for ERC-721A batch minting"
```
