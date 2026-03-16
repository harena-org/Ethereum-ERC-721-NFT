# ERC-721 NFT CLI 工具需求文档

## 1. 项目概述

使用 Go 语言开发一个以太坊 ERC-721 NFT 部署与铸造命令行工具。支持钱包管理、图片及 metadata 上传到 IPFS、合约部署、批量铸造 NFT。每个 NFT 使用不同图片，图片通过 Pinata API 上传到 IPFS。

## 2. 技术选型

| 组件 | 技术 |
|------|------|
| 语言 | Go |
| CLI 框架 | cobra |
| 以太坊交互 | go-ethereum (geth) |
| 钱包加密 | keystore (AES 加密) |
| IPFS 上传 | Pinata API (net/http) |
| 合约模式 | baseURI + tokenId |

## 3. 智能合约

### 3.1 合约设计

基于 OpenZeppelin ERC-721，采用 baseURI + tokenId 模式：

- `tokenURI(tokenId)` 返回 `{baseURI}{tokenId}.json`
- `mintBatch(address to, uint256 quantity)` 批量铸造，每批上限 500
- `totalSupply()` 返回已铸造总量
- tokenId 从 1 开始自动递增
- 仅合约 Owner 可铸造

### 3.2 合约编译

CLI 内嵌编译后的合约 ABI 和 Bytecode，部署时无需额外编译环境。

## 4. 命令设计

工具名称：`nft-cli`

### 4.1 钱包管理

#### `nft-cli wallet create`

创建新钱包（生成私钥 + 助记词）。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--password` | 钱包密码，允许为空 | 否 |

输出：钱包地址、助记词（仅显示一次，提示用户备份）。

钱包加密保存到 `~/.erc721-cli/wallets/` 目录。

#### `nft-cli wallet import`

导入已有钱包。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--private-key` | 通过私钥导入 | 与 --mnemonic 二选一 |
| `--mnemonic` | 通过助记词导入 | 与 --private-key 二选一 |
| `--password` | 钱包密码，允许为空 | 否 |

#### `nft-cli wallet list`

列出本地所有已保存的钱包地址。

#### `nft-cli wallet delete`

删除本地钱包。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--address` | 要删除的钱包地址 | 是 |

删除前要求用户输入 `yes` 确认（不可逆操作）。

### 4.2 网络管理

#### `nft-cli network list`

列出所有可用网络及其 RPC 地址。

内置网络：

| 网络 | Chain ID | 默认 RPC |
|------|----------|----------|
| Ethereum 主网 | 1 | https://eth.llamarpc.com |
| Sepolia 测试网 | 11155111 | https://rpc.sepolia.org |
| Holesky 测试网 | 17000 | https://rpc.holesky.ethpandaops.io |

#### `nft-cli network add`

添加自定义网络。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--name` | 网络名称 | 是 |
| `--rpc` | RPC 地址 | 是 |
| `--chain-id` | Chain ID | 是 |

同名网络已存在时覆盖更新。

#### `nft-cli network delete`

删除自定义网络（内置网络不可删除）。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--name` | 网络名称 | 是 |

#### `nft-cli network use`

设置当前使用的网络。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--name` | 网络名称 | 是 |

### 4.3 图片上传

#### `nft-cli image upload`

将本地文件夹下所有图片打包上传到 Pinata IPFS。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--dir` | 图片文件夹路径 | 是 |
| `--pinata-key` | Pinata API Key（或环境变量 `PINATA_API_KEY`） | 是 |
| `--pinata-secret` | Pinata API Secret（或环境变量 `PINATA_API_SECRET`） | 是 |

- 命令行参数优先于环境变量
- 上传时保留原始文件名，不做重命名
- 上传完成后在本地生成映射文件 `image-mapping.json`，记录文件名排序后与 tokenId 的对应关系（如 `{"1": "octo_0000.png", "2": "octo_0001.png", ...}`）
- 输出：IPFS 文件夹 CID、映射文件路径

### 4.4 Metadata 管理

#### `nft-cli metadata generate`

根据图片 CID 自动生成 ERC-721 标准 metadata JSON 文件。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--image-cid` | 图片文件夹的 IPFS CID | 是 |
| `--name` | NFT 集合名称（如 "MyNFT"） | 是 |
| `--description` | NFT 描述 | 是 |
| `--count` | 生成数量 | 是 |
| `--image-mapping` | 图片映射文件路径（`image upload` 生成的 `image-mapping.json`） | 是 |
| `--output` | 输出目录，默认 `./metadata` | 否 |

生成的 JSON 文件格式（以 `1.json` 为例）：

```json
{
  "name": "MyNFT #1",
  "description": "My awesome NFT collection",
  "image": "ipfs://bafybei.../octo_0000.png"
}
```

- 通过 `image-mapping.json` 获取每个 tokenId 对应的原始图片文件名
- `image` 字段拼接为 `ipfs://{image-cid}/{原始文件名}`
- JSON 文件命名为 `1.json`, `2.json`, ... `{count}.json`

#### `nft-cli metadata upload`

将本地 metadata JSON 文件夹上传到 Pinata IPFS。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--dir` | metadata 文件夹路径，默认 `./metadata` | 否 |
| `--pinata-key` | Pinata API Key（或环境变量 `PINATA_API_KEY`） | 是 |
| `--pinata-secret` | Pinata API Secret（或环境变量 `PINATA_API_SECRET`） | 是 |

输出：metadata 文件夹的 IPFS CID（用作合约 baseURI）。

### 4.5 合约部署

#### `nft-cli deploy`

部署 ERC-721 合约。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--name` | NFT 合约名称 | 是 |
| `--symbol` | NFT 符号 | 是 |
| `--base-uri` | Metadata 的 IPFS URI（如 `ipfs://QmXxx/`） | 是 |
| `--wallet` | 使用的钱包地址 | 是 |
| `--password` | 钱包密码 | 否 |
| `--network` | 网络名称，默认当前选中的网络 | 否 |

- `--base-uri` 末尾斜杠自动补齐（确保 tokenURI 拼接正确）
- 部署后等待交易确认（1 个区块）
- 部署结果保存到 `~/.erc721-cli/contracts.json`（记录合约地址、网络、部署时间）
- 输出：合约地址、交易哈希、Gas 花费

### 4.6 NFT 铸造

#### `nft-cli mint`

批量铸造 NFT。

| 参数 | 说明 | 必填 |
|------|------|------|
| `--contract` | 合约地址 | 是 |
| `--to` | 接收地址，默认为钱包地址 | 否 |
| `--quantity` | 铸造数量（用户指定任意数量，超过 500 自动分批） | 是 |
| `--wallet` | 使用的钱包地址 | 是 |
| `--password` | 钱包密码 | 否 |
| `--network` | 网络名称，默认当前选中的网络 | 否 |

- 超过 500 个自动按每批 500 分批发送交易
- 每批交易等待确认后再发送下一批
- 显示每批交易的进度、交易哈希、Gas 花费
- 输出：铸造结果汇总（总数量、总 Gas 花费、tokenId 范围）

## 5. 典型使用流程

```bash
# 1. 创建钱包
nft-cli wallet create --password "mypassword"

# 2. 选择网络
nft-cli network use --name sepolia

# 3. 上传 10000 张图片到 IPFS
nft-cli image upload --dir ./images \
  --pinata-key "xxx" --pinata-secret "xxx"
# 输出: CID = bafybei...

# 4. 生成 10000 个 metadata JSON
nft-cli metadata generate \
  --image-cid "bafybei..." \
  --name "MyNFT" \
  --description "My awesome NFT collection" \
  --count 10000

# 5. 上传 metadata 到 IPFS
nft-cli metadata upload --dir ./metadata \
  --pinata-key "xxx" --pinata-secret "xxx"
# 输出: CID = QmMetadata...

# 6. 部署合约
nft-cli deploy \
  --name "MyNFT" --symbol "NFT" \
  --base-uri "ipfs://QmMetadata.../" \
  --wallet 0x1234...

# 7. 分多次铸造（每次 100 个）
nft-cli mint --contract 0xABC... --quantity 100 --wallet 0x1234...
nft-cli mint --contract 0xABC... --quantity 100 --wallet 0x1234...
# ... 重复直到铸造完 10000 个
```

## 6. 数据存储

| 内容 | 存储位置 |
|------|----------|
| 钱包密钥文件 | `~/.erc721-cli/wallets/` |
| 网络配置 | `~/.erc721-cli/config.json` |
| 已部署合约记录 | `~/.erc721-cli/contracts.json` |
| 图片映射文件 | 上传时生成于当前目录 `image-mapping.json` |
| metadata 临时文件 | 用户指定目录，默认 `./metadata` |

## 7. 项目结构

```
cli/
├── main.go                  # 入口
├── cmd/                     # 命令定义
│   ├── root.go
│   ├── wallet.go            # wallet create/import/list/delete
│   ├── network.go           # network list/add/use
│   ├── image.go             # image upload
│   ├── metadata.go          # metadata generate/upload
│   ├── deploy.go            # deploy
│   └── mint.go              # mint
├── internal/
│   ├── wallet/              # 钱包创建、导入、加密存储
│   ├── network/             # 网络配置管理
│   ├── pinata/              # Pinata API 交互
│   ├── metadata/            # metadata 生成
│   ├── contract/            # 合约部署与交互
│   └── config/              # 全局配置管理
├── contracts/
│   └── MyNFT.go             # 编译后的合约 ABI + Bytecode
├── go.mod
└── go.sum
```
