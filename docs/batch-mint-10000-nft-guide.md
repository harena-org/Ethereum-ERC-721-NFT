# 批量生成 10,000 个 NFT 操作指南

## 前置条件

| 条件 | 说明 |
|------|------|
| Pinata 账户 | app.pinata.cloud，需获取 API Key 和 Secret |
| 钱包助记词 | 12 词 BIP39 助记词 |
| 10,000 张图片 | 放在同一目录下，文件名建议按顺序编号（如 `1.png`, `2.png`, ...`10000.png`） |
| ETH 余额 | 钱包中需要有足够的 ETH 支付 gas 费 |
| nft-cli 工具 | 本项目编译的 CLI 工具 |

---

## 第一步：准备工作

### 1.1 编译 CLI 工具

```bash
cd /home/ubuntu/Ethereum-ERC-721-NFT/cli
go build -o nft-cli .
```

### 1.2 获取 Pinata API 密钥

1. 登录 https://app.pinata.cloud
2. 进入 **API Keys** 页面
3. 点击 **New Key**，勾选以下权限：
   - `pinFileToIPFS`
   - `pinJSONToIPFS`（如果有的话）
4. 记录 **API Key** 和 **API Secret**

### 1.3 设置环境变量

```bash
export PINATA_API_KEY="你的API_Key"
export PINATA_API_SECRET="你的API_Secret"
```

---

## 第二步：导入钱包

```bash
./nft-cli wallet import-mnemonic \
  -m "你的十二个助记词用空格分隔" \
  -p "设置一个本地密码"
```

成功后会输出你的钱包地址，例如：`0xAbCd...1234`。**记下这个地址**，后续步骤会用到。

---

## 第三步：选择网络并检查余额

### 3.1 选择网络

**测试阶段**建议先用 Sepolia 测试网（默认已选）：

```bash
./nft-cli network use --name sepolia
```

**正式发布**时切换到主网：

```bash
./nft-cli network use --name ethereum
```

### 3.2 检查余额

```bash
./nft-cli wallet balance -a 0x你的钱包地址
```

确保余额充足。预估费用参考（以 Sepolia/主网 gas 价格波动为准）：

| 操作 | 预估 Gas | 说明 |
|------|----------|------|
| 部署合约 | ~2,000,000 | 一次性 |
| 铸造 10,000 个 (ERC-721A) | ~20 批 x ~1,830,000 | 每批 500 个 |

> **提示**：Sepolia 测试币可从水龙头免费获取，搜索 "Sepolia faucet"。

---

## 第四步：准备图片

### 4.1 整理图片文件

将 10,000 张图片放到一个目录中，文件名必须使用**零填充编号**：

```
images/
├── 00001.png
├── 00002.png
├── 00003.png
├── ...
└── 10000.png
```

> **重要**：CLI 使用字典序（而非自然数排序）对文件名排序后，依次映射到 Token ID 1, 2, 3, ...。如果不做零填充（例如 `1.png, 2.png, ..., 10.png`），字典序会变成 `1.png, 10.png, 100.png, ...`，导致图片和 Token ID 映射错乱。
>
> 零填充命名可以用以下命令批量重命名：
> ```bash
> # 将 1.png ~ 10000.png 重命名为 00001.png ~ 10000.png
> for f in images/*.png; do
>   n=$(basename "$f" .png)
>   mv "$f" "images/$(printf '%05d' "$n").png"
> done
> ```

### 4.2 上传图片到 IPFS（通过 Pinata）

```bash
./nft-cli image upload --dir ./images
```

这一步会：
- 将整个 images 目录上传到 Pinata/IPFS
- 输出 **图片 CID**（如 `QmXxxYyyZzz...`）
- 生成 `image-mapping.json`（Token ID -> 文件名的映射）

> **注意**：10,000 张图片上传可能需要较长时间，取决于文件大小和网络速度。请耐心等待，不要中断。

**记下输出的 CID**，下一步要用。

---

## 第五步：生成元数据（Metadata）

```bash
./nft-cli metadata generate \
  --image-cid "QmXxxYyyZzz上一步得到的CID" \
  --name "你的NFT集合名称" \
  --description "你的NFT描述" \
  --count 10000 \
  --mapping ./images/image-mapping.json \
  --output ./metadata
```

这会在 `./metadata/` 目录下生成 10,000 个 JSON 文件：

```
metadata/
├── 1.json    ->  {"name": "MyNFT #1", "description": "...", "image": "ipfs://QmXxx/1.png"}
├── 2.json    ->  {"name": "MyNFT #2", "description": "...", "image": "ipfs://QmXxx/2.png"}
├── ...
└── 10000.json
```

---

## 第六步：上传元数据到 IPFS

```bash
./nft-cli metadata upload --dir ./metadata
```

输出的 **元数据 CID** 就是合约部署时需要的 `base-uri`。

输出示例：
```
Metadata CID: QmAaaBbbCcc...
Base URI: ipfs://QmAaaBbbCcc/
```

**记下 Base URI**，下一步部署合约时要用。

---

## 第七步：部署 NFT 合约

```bash
./nft-cli deploy \
  -w 0x你的钱包地址 \
  -p "你的本地密码" \
  --name "你的NFT集合名称" \
  --symbol "SYMBOL" \
  --base-uri "ipfs://QmAaaBbbCcc/"
```

参数说明：
- `--name`：NFT 集合名称，会显示在 OpenSea 等平台上
- `--symbol`：3-5 个字母的缩写代号
- `--base-uri`：上一步获得的元数据 IPFS URI（**末尾要有 `/`**）

成功输出：
```
Contract deployed!
  Address: 0xContractAddress...
  Tx Hash: 0x...
  Gas Used: ...
```

**记下合约地址**，下一步铸造时要用。

---

## 第八步：批量铸造 10,000 个 NFT

```bash
./nft-cli mint \
  -w 0x你的钱包地址 \
  -p "你的本地密码" \
  --contract 0x上一步的合约地址 \
  -q 10000
```

CLI 会自动将 10,000 个 NFT 分成 **20 批**（每批 500 个）依次发送：

```
Batch 1-500 sent (tx: 0x...), waiting for confirmation...
Batch 1-500 confirmed, gas used: 185000
Batch 501-1000 sent (tx: 0x...), waiting for confirmation...
Batch 501-1000 confirmed, gas used: 183000
...
Batch 9501-10000 confirmed, gas used: 184000
```

> **提示**：如果中途因网络问题中断，可以计算已铸造数量，然后用 `--to` 指定接收地址继续铸造剩余部分。

---

## 完整命令速查

```bash
# 1. 编译工具
go build -o nft-cli .

# 2. 配置凭证
export PINATA_API_KEY="xxx"
export PINATA_API_SECRET="yyy"

# 3. 导入钱包
./nft-cli wallet import-mnemonic -m "助记词" -p "密码"

# 4. 选择网络
./nft-cli network use --name sepolia       # 测试
./nft-cli network use --name ethereum      # 正式

# 5. 检查余额
./nft-cli wallet balance -a 0xWALLET

# 6. 上传图片 -> 得到 IMAGE_CID
./nft-cli image upload --dir ./images

# 7. 生成元数据
./nft-cli metadata generate \
  --image-cid IMAGE_CID \
  --name "MyNFT" --description "描述" \
  --count 10000 --mapping ./images/image-mapping.json

# 8. 上传元数据 -> 得到 BASE_URI
./nft-cli metadata upload --dir ./metadata

# 9. 部署合约 -> 得到 CONTRACT_ADDR
./nft-cli deploy -w 0xWALLET -p "密码" \
  --name "MyNFT" --symbol "MNT" --base-uri "ipfs://META_CID/"

# 10. 批量铸造
./nft-cli mint -w 0xWALLET -p "密码" \
  --contract CONTRACT_ADDR -q 10000
```

---

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 余额不足 | Sepolia 测试网：搜索 "Sepolia faucet" 获取测试币；主网：需购买 ETH |
| 上传超时 | 检查网络连接，图片过大可适当压缩，重新运行 `image upload` |
| 铸造中断 | 记录已完成的批次数（每批 500），用剩余数量重新 mint |
| Gas 费过高 | 选择 gas 价格较低的时段操作，可参考 https://etherscan.io/gastracker |
| 图片顺序不对 | 文件名必须零填充（00001.png ~ 10000.png），CLI 按字典序排序，不补零会导致映射错乱 |
