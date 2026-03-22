package rarible

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
)

// Sepolia testnet contract addresses
const (
	SepoliaExchangeV2     = "0x3e52D660b69d1bDacb6C513cE085D924F5Cb9c77"
	SepoliaTransferProxy  = "0xA094E566b61b3c2D88ACf7Cc15e3Dd0FA83F32af"
	TestnetAPIURL         = "https://testnet-api.rarible.org"
)

// EIP-712 type hashes
var (
	eip712DomainTypeHash = crypto.Keccak256Hash([]byte(
		"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))
	orderTypeHash = crypto.Keccak256Hash([]byte(
		"Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes4 dataType,bytes data)" +
			"Asset(AssetType assetType,uint256 value)" +
			"AssetType(bytes4 assetClass,bytes data)"))
	assetTypeHash = crypto.Keccak256Hash([]byte(
		"Asset(AssetType assetType,uint256 value)" +
			"AssetType(bytes4 assetClass,bytes data)"))
	assetTypeTypeHash = crypto.Keccak256Hash([]byte(
		"AssetType(bytes4 assetClass,bytes data)"))
)

// Asset class constants: bytes4(keccak256("ETH")), bytes4(keccak256("ERC721"))
var (
	ETHClass    = [4]byte{0xaa, 0xae, 0xbe, 0xba}
	ERC721Class = [4]byte{0x73, 0xad, 0x21, 0x46}
)

// V2DataType = bytes4(keccak256("V2"))
var V2DataType = func() [4]byte {
	h := crypto.Keccak256([]byte("V2"))
	var b [4]byte
	copy(b[:], h[:4])
	return b
}()

// AssetType represents an on-chain asset type.
type AssetType struct {
	AssetClass [4]byte
	Data       []byte
}

// Asset represents an on-chain asset.
type Asset struct {
	Type  AssetType
	Value *big.Int
}

// Order represents a Rarible V2 order for EIP-712 signing.
type Order struct {
	Maker     common.Address
	MakeAsset Asset
	Taker     common.Address
	TakeAsset Asset
	Salt      *big.Int
	Start     uint64
	End       uint64
	DataType  [4]byte
	Data      []byte
}

// Client is the Rarible API client.
type Client struct {
	APIURL string
	APIKey string
}

// NewClient creates a new Rarible API client.
func NewClient(apiURL, apiKey string) *Client {
	if apiURL == "" {
		apiURL = TestnetAPIURL
	}
	return &Client{APIURL: apiURL, APIKey: apiKey}
}

// NewSalt generates a random salt for order uniqueness.
func NewSalt() *big.Int {
	b := make([]byte, 32)
	rand.Read(b)
	return new(big.Int).SetBytes(b)
}

// ERC721AssetTypeData returns abi.encode(contract, tokenId).
func ERC721AssetTypeData(contract common.Address, tokenID *big.Int) []byte {
	data := make([]byte, 64)
	copy(data[12:32], contract.Bytes())
	tokenIDBytes := math.U256Bytes(tokenID)
	copy(data[32:64], tokenIDBytes)
	return data
}

// EmptyV2OrderData returns abi.encode(Part[], Part[]) with both arrays empty.
func EmptyV2OrderData() []byte {
	data := make([]byte, 128)
	// offset to first dynamic array = 64
	big.NewInt(64).FillBytes(data[0:32])
	// offset to second dynamic array = 96
	big.NewInt(96).FillBytes(data[32:64])
	// length of first array = 0 (bytes 64-95 already zero)
	// length of second array = 0 (bytes 96-127 already zero)
	return data
}

// NewSellOrder creates a sell order for an ERC721 token.
func NewSellOrder(maker common.Address, nftContract common.Address, tokenID *big.Int, priceWei *big.Int) *Order {
	return &Order{
		Maker: maker,
		MakeAsset: Asset{
			Type:  AssetType{AssetClass: ERC721Class, Data: ERC721AssetTypeData(nftContract, tokenID)},
			Value: big.NewInt(1),
		},
		Taker: common.Address{}, // zero address = anyone can buy
		TakeAsset: Asset{
			Type:  AssetType{AssetClass: ETHClass, Data: []byte{}},
			Value: priceWei,
		},
		Salt:     NewSalt(),
		Start:    0,
		End:      0,
		DataType: V2DataType,
		Data:     EmptyV2OrderData(),
	}
}

// --- EIP-712 hashing ---

func hashAssetType(at AssetType) common.Hash {
	var classPadded [32]byte
	copy(classPadded[:4], at.AssetClass[:])
	dataHash := crypto.Keccak256Hash(at.Data)
	return crypto.Keccak256Hash(
		assetTypeTypeHash.Bytes(),
		classPadded[:],
		dataHash.Bytes(),
	)
}

func hashAsset(a Asset) common.Hash {
	atHash := hashAssetType(a.Type)
	return crypto.Keccak256Hash(
		assetTypeHash.Bytes(),
		atHash.Bytes(),
		math.U256Bytes(new(big.Int).Set(a.Value)),
	)
}

func hashOrder(o *Order) common.Hash {
	var makerPadded, takerPadded, dataTypePadded [32]byte
	copy(makerPadded[12:], o.Maker.Bytes())
	copy(takerPadded[12:], o.Taker.Bytes())
	copy(dataTypePadded[:4], o.DataType[:])

	return crypto.Keccak256Hash(
		orderTypeHash.Bytes(),
		makerPadded[:],
		hashAsset(o.MakeAsset).Bytes(),
		takerPadded[:],
		hashAsset(o.TakeAsset).Bytes(),
		math.U256Bytes(new(big.Int).Set(o.Salt)),
		math.U256Bytes(new(big.Int).SetUint64(o.Start)),
		math.U256Bytes(new(big.Int).SetUint64(o.End)),
		dataTypePadded[:],
		crypto.Keccak256Hash(o.Data).Bytes(),
	)
}

func domainSeparator(chainID int64, exchangeAddr common.Address) common.Hash {
	nameHash := crypto.Keccak256Hash([]byte("Exchange"))
	versionHash := crypto.Keccak256Hash([]byte("2"))
	var addrPadded [32]byte
	copy(addrPadded[12:], exchangeAddr.Bytes())

	return crypto.Keccak256Hash(
		eip712DomainTypeHash.Bytes(),
		nameHash.Bytes(),
		versionHash.Bytes(),
		math.U256Bytes(big.NewInt(chainID)),
		addrPadded[:],
	)
}

// SignOrder signs a Rarible V2 order using EIP-712.
func SignOrder(order *Order, chainID int64, exchangeAddr common.Address, privateKey *ecdsa.PrivateKey) ([]byte, error) {
	ds := domainSeparator(chainID, exchangeAddr)
	oh := hashOrder(order)

	// EIP-712: keccak256("\x19\x01" || domainSeparator || structHash)
	raw := make([]byte, 66)
	raw[0] = 0x19
	raw[1] = 0x01
	copy(raw[2:34], ds.Bytes())
	copy(raw[34:66], oh.Bytes())

	hash := crypto.Keccak256Hash(raw)
	sig, err := crypto.Sign(hash.Bytes(), privateKey)
	if err != nil {
		return nil, fmt.Errorf("signing order: %w", err)
	}
	// Adjust v from 0/1 to 27/28
	sig[64] += 27
	return sig, nil
}

// --- API submission ---

type apiOrderRequest struct {
	Type      string       `json:"type"`
	Maker     string       `json:"maker"`
	Make      apiAsset     `json:"make"`
	Taker     string       `json:"taker"`
	Take      apiAsset     `json:"take"`
	Salt      string       `json:"salt"`
	Start     int64        `json:"start"`
	End       int64        `json:"end"`
	Data      apiOrderData `json:"data"`
	Signature string       `json:"signature"`
}

type apiAsset struct {
	AssetType apiAssetType `json:"assetType"`
	Value     string       `json:"value"`
}

type apiAssetType struct {
	AssetClass string `json:"assetClass"`
	Contract   string `json:"contract,omitempty"`
	TokenID    string `json:"tokenId,omitempty"`
}

type apiOrderData struct {
	DataType   string        `json:"dataType"`
	Payouts    []interface{} `json:"payouts"`
	OriginFees []interface{} `json:"originFees"`
}

// SubmitOrder submits a signed sell order to Rarible's API.
func (c *Client) SubmitOrder(order *Order, signature []byte, nftContract common.Address, tokenID *big.Int) error {
	req := apiOrderRequest{
		Type:  "RARIBLE_V2",
		Maker: order.Maker.Hex(),
		Make: apiAsset{
			AssetType: apiAssetType{
				AssetClass: "ERC721",
				Contract:   nftContract.Hex(),
				TokenID:    tokenID.String(),
			},
			Value: "1",
		},
		Taker: order.Taker.Hex(),
		Take: apiAsset{
			AssetType: apiAssetType{
				AssetClass: "ETH",
			},
			Value: order.TakeAsset.Value.String(),
		},
		Salt:  order.Salt.String(),
		Start: int64(order.Start),
		End:   int64(order.End),
		Data: apiOrderData{
			DataType:   "RARIBLE_V2_DATA_V2",
			Payouts:    []interface{}{},
			OriginFees: []interface{}{},
		},
		Signature: "0x" + hex.EncodeToString(signature),
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshaling order: %w", err)
	}

	url := fmt.Sprintf("%s/v0.1/orders", c.APIURL)
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		httpReq.Header.Set("X-API-KEY", c.APIKey)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
