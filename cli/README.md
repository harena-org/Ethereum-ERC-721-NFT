# NFT-CLI 用户手册

一个使用 Go 语言编写的以太坊 ERC-721 NFT 命令行工具，支持钱包管理、图片与 metadata 上传到 IPFS、合约部署和批量铸造。

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [完整使用流程](#完整使用流程)
- [命令参考](#命令参考)
  - [钱包管理](#钱包管理)
  - [网络管理](#网络管理)
  - [图片上传](#图片上传)
  - [Metadata 管理](#metadata-管理)
  - [合约部署](#合约部署)
  - [NFT 铸造](#nft-铸造)
- [配置与数据存储](#配置与数据存储)
- [常见问题](#常见问题)

---

## 安装

### 从源码编译

```bash
cd cli
make build
```

编译完成后生成 `nft-cli` 可执行文件。

### 验证安装

```bash
./nft-cli --help
```

---

## 快速开始

以下是最简化的操作流程，5 步完成 NFT 铸造：

```bash
# 1. 创建钱包
nft-cli wallet create

# 2. 上传图片到 IPFS
nft-cli image upload --dir ./images \
  --pinata-key "你的Key" --pinata-secret "你的Secret"

# 3. 生成 metadata 并上传
nft-cli metadata generate \
  --image-cid "图片CID" \
  --mapping ./image-mapping.json \
  --name "MyNFT" --description "描述" --count 100

nft-cli metadata upload \
  --pinata-key "你的Key" --pinata-secret "你的Secret"

# 4. 部署合约
nft-cli deploy --name "MyNFT" --symbol "NFT" \
  --base-uri "ipfs://metadata的CID/"

# 5. 铸造 NFT
nft-cli mint --contract 0x合约地址 --quantity 100
```

---

## 完整使用流程

### 第一步：创建钱包

```bash
nft-cli wallet create
```

输出示例：

```
Wallet created!
Address:  0x9Cd98dA485c7ABC101c184CC2Fe90C8FE3E52778
Mnemonic: nation pitch room tiny thrive smart sunset robust point blast account cup
Please save your mnemonic in a safe place!
```

> **重要**：助记词只显示一次，请立即备份到安全的地方。

如需设置钱包密码：

```bash
nft-cli wallet create --password "你的密码"
```

### 第二步：获取测试 ETH

部署合约和铸造 NFT 需要 ETH 支付 Gas 费。在测试网上可以从水龙头（Faucet）免费领取：

- Alchemy Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
- Google Cloud Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

领取后查看余额：

```bash
nft-cli wallet balance
```

### 第三步：准备图片

将所有 NFT 图片放入一个文件夹中。支持任意图片格式（PNG、JPG、GIF 等）。图片命名无特殊要求，工具会按文件名排序后自动映射到 tokenId。

示例目录结构：

```
images/
├── octo_0000.png
├── octo_0001.png
├── octo_0002.png
└── ...
```

### 第四步：上传图片到 IPFS

```bash
nft-cli image upload --dir ./images \
  --pinata-key "你的Pinata API Key" \
  --pinata-secret "你的Pinata API Secret"
```

输出示例：

```
Uploaded to IPFS! CID: QmQYypdSBh6BLUJXW1zBZwCjJuD8pd9toBHAAU9E82Toqw
Mapping saved to: ./image-mapping.json
```

也可以通过环境变量设置 Pinata 凭证，避免每次输入：

```bash
export PINATA_API_KEY="你的Key"
export PINATA_API_SECRET="你的Secret"
nft-cli image upload --dir ./images
```

> **获取 Pinata API Key**：访问 [app.pinata.cloud](https://app.pinata.cloud)，注册账号后在 API Keys 页面创建新 Key。免费额度：1GB 存储 + 100 次请求/月。

### 第五步：生成 Metadata JSON

```bash
nft-cli metadata generate \
  --image-cid "QmQYypdSBh6BLUJXW1zBZwCjJuD8pd9toBHAAU9E82Toqw" \
  --mapping ./image-mapping.json \
  --name "MyNFT" \
  --description "My awesome NFT collection" \
  --count 100
```

生成的 JSON 文件保存在 `./metadata/` 目录下，每个文件内容如：

```json
{
  "name": "MyNFT #1",
  "description": "My awesome NFT collection",
  "image": "ipfs://QmQYy.../octo_0000.png"
}
```

> **注意**：`--image-cid` 只需要填写 CID 本身，不需要包含网关 URL 前缀。

### 第六步：上传 Metadata 到 IPFS

```bash
nft-cli metadata upload \
  --pinata-key "你的Key" --pinata-secret "你的Secret"
```

输出示例：

```
Metadata uploaded! CID: QmPMSjD4kkBi2tAPA36NRMxsUtBAoyzMSiX8hNUUuu7DzX
Base URI: ipfs://QmPMSjD4kkBi2tAPA36NRMxsUtBAoyzMSiX8hNUUuu7DzX/
```

记下返回的 Base URI，下一步部署合约时需要使用。

### 第七步：部署合约

```bash
nft-cli deploy \
  --name "MyNFT" \
  --symbol "NFT" \
  --base-uri "ipfs://QmPMSjD4kkBi2tAPA36NRMxsUtBAoyzMSiX8hNUUuu7DzX/"
```

输出示例：

```
Deploying to sepolia (chainID=11155111)...
Transaction sent, waiting for confirmation...
Contract deployed!
Address:  0x95a5fa07F4F04F15E6213f49F12540F56c5F8F62
Tx Hash:  0xe53e672cfb4ad1d92476a8c0431941dd76cd18397c2176e6c2b1aabaf922d4b4
Gas Used: 2129659
```

记下合约地址，后续铸造时需要使用。

### 第八步：铸造 NFT

```bash
nft-cli mint --contract 0x95a5fa07F4F04F15E6213f49F12540F56c5F8F62 --quantity 10
```

输出示例：

```
Minting 10 NFTs on sepolia to 0x9Cd98dA485c7ABC101c184CC2Fe90C8FE3E52778...
Batch 1-10 sent (tx: 0x2ea3cd...), waiting for confirmation...
Batch 1-10 confirmed, gas used: 306583

Mint complete! Summary:
  Batch 1-10: tx=0x2ea3cd... gas=306583
Total gas used: 306583
```

可以多次执行铸造命令，每次指定不同数量，tokenId 会自动递增：

```bash
nft-cli mint --contract 0x95a5... --quantity 100
nft-cli mint --contract 0x95a5... --quantity 50
# tokenId 依次递增，互不冲突
```

超过 500 个会自动分批处理，每批最多 500 个。

---

## 命令参考

### 钱包管理

#### `wallet create` — 创建新钱包

```bash
nft-cli wallet create [--password "密码"]
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--password` | `-p` | 钱包密码，允许为空 | 空 |

#### `wallet import-key` — 通过私钥导入钱包

```bash
nft-cli wallet import-key --private-key "0x私钥" [--password "密码"]
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--private-key` | | 私钥十六进制字符串 | 必填 |
| `--password` | `-p` | 钱包密码 | 空 |

#### `wallet import-mnemonic` — 通过助记词导入钱包

```bash
nft-cli wallet import-mnemonic --mnemonic "助记词" [--password "密码"]
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--mnemonic` | `-m` | 12 个单词的助记词 | 必填 |
| `--password` | `-p` | 钱包密码 | 空 |

#### `wallet list` — 列出所有钱包

```bash
nft-cli wallet list
```

#### `wallet balance` — 查看钱包余额

```bash
nft-cli wallet balance [--address "地址"]
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--address` | `-a` | 钱包地址 | 第一个钱包 |

#### `wallet delete` — 删除钱包

```bash
nft-cli wallet delete --address "地址"
```

删除前需输入 `yes` 确认。

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--address` | `-a` | 要删除的钱包地址 | 必填 |

---

### 网络管理

默认使用 Sepolia 测试网。

#### `network list` — 列出所有网络

```bash
nft-cli network list
```

输出示例：

```
  ethereum  rpc=https://eth.llamarpc.com  chainID=1 (builtin)
* sepolia   rpc=https://rpc.sepolia.org   chainID=11155111 (builtin)
  holesky   rpc=https://rpc.holesky.ethpandaops.io  chainID=17000 (builtin)
```

`*` 标记表示当前使用的网络。

内置网络：

| 网络 | Chain ID | RPC |
|------|----------|-----|
| ethereum | 1 | https://eth.llamarpc.com |
| sepolia | 11155111 | https://rpc.sepolia.org |
| holesky | 17000 | https://rpc.holesky.ethpandaops.io |

#### `network add` — 添加自定义网络

```bash
nft-cli network add --name "网络名" --rpc "RPC地址" --chain-id 链ID
```

示例（添加备用 Sepolia RPC）：

```bash
nft-cli network add \
  --name sepolia-alt \
  --rpc https://ethereum-sepolia-rpc.publicnode.com \
  --chain-id 11155111
```

同名网络已存在时会覆盖更新。

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 网络名称 | 必填 |
| `--rpc` | RPC 端点地址 | 必填 |
| `--chain-id` | Chain ID | 必填 |

#### `network use` — 切换当前网络

```bash
nft-cli network use --name sepolia
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 网络名称 | 必填 |

#### `network delete` — 删除自定义网络

```bash
nft-cli network delete --name "网络名"
```

内置网络不可删除。

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name` | 网络名称 | 必填 |

---

### 图片上传

#### `image upload` — 上传图片文件夹到 IPFS

```bash
nft-cli image upload --dir ./images \
  [--pinata-key "Key"] [--pinata-secret "Secret"]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir` | 图片文件夹路径 | 必填 |
| `--pinata-key` | Pinata API Key | 环境变量 `PINATA_API_KEY` |
| `--pinata-secret` | Pinata API Secret | 环境变量 `PINATA_API_SECRET` |
| `--output` | image-mapping.json 输出路径 | 当前目录 |

上传完成后：
- 返回图片文件夹的 IPFS CID
- 生成 `image-mapping.json` 文件，记录文件名与 tokenId 的对应关系

---

### Metadata 管理

#### `metadata generate` — 生成 Metadata JSON 文件

```bash
nft-cli metadata generate \
  --image-cid "图片CID" \
  --mapping ./image-mapping.json \
  --name "集合名称" \
  --description "描述" \
  --count 数量
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--image-cid` | 图片文件夹的 IPFS CID | 必填 |
| `--mapping` | image-mapping.json 路径 | 必填 |
| `--name` | NFT 集合名称 | 必填 |
| `--description` | NFT 描述 | 空 |
| `--count` | 生成数量 | 必填 |
| `--output` | 输出目录 | `./metadata` |

#### `metadata upload` — 上传 Metadata 到 IPFS

```bash
nft-cli metadata upload \
  [--dir ./metadata] \
  [--pinata-key "Key"] [--pinata-secret "Secret"]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--dir` | metadata 文件夹路径 | `./metadata` |
| `--pinata-key` | Pinata API Key | 环境变量 `PINATA_API_KEY` |
| `--pinata-secret` | Pinata API Secret | 环境变量 `PINATA_API_SECRET` |

---

### 合约部署

#### `deploy` — 部署 ERC-721 合约

```bash
nft-cli deploy \
  --name "合约名称" \
  --symbol "符号" \
  --base-uri "ipfs://metadata的CID/"
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--name` | | NFT 合约名称 | 必填 |
| `--symbol` | | NFT 符号（如 NFT、APE） | 必填 |
| `--base-uri` | | Metadata 的 IPFS URI | 必填 |
| `--wallet` | `-w` | 钱包地址 | 第一个钱包 |
| `--password` | `-p` | 钱包密码 | 空 |

- base-uri 末尾斜杠会自动补齐
- 部署后等待 1 个区块确认
- 部署记录保存到 `~/.erc721-cli/contracts.json`

---

### NFT 铸造

#### `mint` — 批量铸造 NFT

```bash
nft-cli mint \
  --contract 0x合约地址 \
  --quantity 数量
```

| 参数 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--contract` | | 合约地址 | 必填 |
| `--quantity` | `-q` | 铸造数量 | 必填 |
| `--to` | | 接收地址 | 钱包地址 |
| `--wallet` | `-w` | 钱包地址 | 第一个钱包 |
| `--password` | `-p` | 钱包密码 | 空 |

- 超过 500 个自动按每批 500 分批发送
- 每批等待交易确认后再发送下一批
- 输出每批的交易哈希、Gas 消耗和汇总信息

---

## 配置与数据存储

所有配置和数据存储在 `~/.erc721-cli/` 目录下：

| 文件 | 说明 |
|------|------|
| `wallets/` | 加密的钱包密钥文件（keystore 格式） |
| `config.json` | 全局配置（当前网络等） |
| `networks.json` | 自定义网络配置 |
| `contracts.json` | 已部署合约记录 |

工作目录下生成的临时文件：

| 文件 | 说明 |
|------|------|
| `image-mapping.json` | 图片上传后生成的文件名映射 |
| `metadata/` | 生成的 metadata JSON 文件目录 |

---

## 常见问题

### 1. RPC 连接超时怎么办？

公共 RPC 节点可能不稳定。添加一个备用 RPC：

```bash
nft-cli network add \
  --name sepolia-alt \
  --rpc https://ethereum-sepolia-rpc.publicnode.com \
  --chain-id 11155111
nft-cli network use --name sepolia-alt
```

### 2. 如何在主网部署？

```bash
nft-cli network use --name ethereum
```

> **警告**：主网部署需要真实 ETH，请确认 Gas 费用后再操作。

### 3. 铸造中途失败怎么办？

已经铸造成功的批次不会受影响。查看错误信息后，重新执行 `mint` 命令即可，tokenId 会从上次停止的地方继续。

### 4. 如何查看已部署的合约？

```bash
cat ~/.erc721-cli/contracts.json
```

### 5. 忘记钱包密码怎么办？

如果你备份了助记词，可以重新导入：

```bash
nft-cli wallet import-mnemonic --mnemonic "你的助记词" --password "新密码"
```

### 6. 可以铸造多少个 NFT？

没有上限。每次铸造数量任意，超过 500 个自动分批。可以多次铸造，tokenId 自动递增，适合目标 10000 个以上的大型项目。

### 7. 图片命名有要求吗？

没有。工具会按文件名字母排序后自动映射到 tokenId。例如 `octo_0000.png` 映射到 Token 1，`octo_0001.png` 映射到 Token 2。

---

## 费用参考

以 Sepolia 测试网实际数据为例：

| 操作 | Gas 消耗 |
|------|----------|
| 合约部署 | ~2,129,659 |
| 铸造 10 个 NFT | ~306,583 |

实际费用 = Gas 消耗 × 当时的 Gas Price。主网费用取决于网络拥堵程度。
