package contract

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"nft-cli/contracts"
)

type DeployResult struct {
	ContractAddress string
	TxHash          string
	GasUsed         uint64
}

type MintResult struct {
	TxHash     string
	GasUsed    uint64
	BatchStart int
	BatchEnd   int
}

func Deploy(rpcURL string, chainID int64, privateKey *ecdsa.PrivateKey, name, symbol, baseURI string, royaltyReceiver common.Address, royaltyBps uint64) (*DeployResult, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

	if !strings.HasSuffix(baseURI, "/") {
		baseURI += "/"
	}

	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to get nonce: %w", err)
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get gas price: %w", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(chainID))
	if err != nil {
		return nil, fmt.Errorf("failed to create transactor: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.GasPrice = gasPrice
	auth.GasLimit = 3000000

	parsed, err := abi.JSON(strings.NewReader(contracts.BatchNFTABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	bytecode := common.FromHex(contracts.BatchNFTBytecode)
	input, err := parsed.Pack("", name, symbol, baseURI, royaltyReceiver, new(big.Int).SetUint64(royaltyBps))
	if err != nil {
		return nil, fmt.Errorf("failed to pack constructor args: %w", err)
	}

	txData := append(bytecode, input...)
	tx := types.NewContractCreation(nonce, big.NewInt(0), auth.GasLimit, gasPrice, txData)

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(big.NewInt(chainID)), privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return nil, fmt.Errorf("failed to send transaction: %w", err)
	}

	fmt.Println("Transaction sent, waiting for confirmation...")
	receipt, err := bind.WaitMined(context.Background(), client, signedTx)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for transaction: %w", err)
	}

	if receipt.Status == 0 {
		return nil, fmt.Errorf("transaction failed")
	}

	return &DeployResult{
		ContractAddress: receipt.ContractAddress.Hex(),
		TxHash:          signedTx.Hash().Hex(),
		GasUsed:         receipt.GasUsed,
	}, nil
}

// SetApprovalForAll approves an operator to transfer all NFTs on behalf of the owner.
func SetApprovalForAll(rpcURL string, chainID int64, privateKey *ecdsa.PrivateKey, contractAddr string, operator string, approved bool) (string, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return "", fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

	parsed, err := abi.JSON(strings.NewReader(contracts.BatchNFTABI))
	if err != nil {
		return "", fmt.Errorf("failed to parse ABI: %w", err)
	}

	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
	contractAddress := common.HexToAddress(contractAddr)
	operatorAddress := common.HexToAddress(operator)

	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %w", err)
	}

	input, err := parsed.Pack("setApprovalForAll", operatorAddress, approved)
	if err != nil {
		return "", fmt.Errorf("failed to pack args: %w", err)
	}

	tx := types.NewTransaction(nonce, contractAddress, big.NewInt(0), 100000, gasPrice, input)
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(big.NewInt(chainID)), privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	receipt, err := bind.WaitMined(context.Background(), client, signedTx)
	if err != nil {
		return "", fmt.Errorf("failed to wait for transaction: %w", err)
	}

	if receipt.Status == 0 {
		return "", fmt.Errorf("transaction failed")
	}

	return signedTx.Hash().Hex(), nil
}

func MintBatch(rpcURL string, chainID int64, privateKey *ecdsa.PrivateKey, contractAddr string, to string, quantity int) ([]MintResult, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

	parsed, err := abi.JSON(strings.NewReader(contracts.BatchNFTABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
	toAddress := common.HexToAddress(to)
	contractAddress := common.HexToAddress(contractAddr)

	var results []MintResult
	remaining := quantity
	minted := 0

	for remaining > 0 {
		batchSize := remaining
		if batchSize > 500 {
			batchSize = 500
		}

		nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
		if err != nil {
			return results, fmt.Errorf("failed to get nonce: %w", err)
		}

		gasPrice, err := client.SuggestGasPrice(context.Background())
		if err != nil {
			return results, fmt.Errorf("failed to get gas price: %w", err)
		}

		input, err := parsed.Pack("mintBatch", toAddress, big.NewInt(int64(batchSize)))
		if err != nil {
			return results, fmt.Errorf("failed to pack mintBatch args: %w", err)
		}

		gasLimit := uint64(80000 + uint64(batchSize)*3500)
		tx := types.NewTransaction(nonce, contractAddress, big.NewInt(0), gasLimit, gasPrice, input)
		signedTx, err := types.SignTx(tx, types.NewEIP155Signer(big.NewInt(chainID)), privateKey)
		if err != nil {
			return results, fmt.Errorf("failed to sign transaction: %w", err)
		}

		err = client.SendTransaction(context.Background(), signedTx)
		if err != nil {
			return results, fmt.Errorf("failed to send transaction: %w", err)
		}

		fmt.Printf("Batch %d-%d sent (tx: %s), waiting for confirmation...\n", minted+1, minted+batchSize, signedTx.Hash().Hex())

		receipt, err := bind.WaitMined(context.Background(), client, signedTx)
		if err != nil {
			return results, fmt.Errorf("failed to wait for transaction: %w", err)
		}

		if receipt.Status == 0 {
			return results, fmt.Errorf("mint transaction failed at batch %d-%d", minted+1, minted+batchSize)
		}

		results = append(results, MintResult{
			TxHash:     signedTx.Hash().Hex(),
			GasUsed:    receipt.GasUsed,
			BatchStart: minted + 1,
			BatchEnd:   minted + batchSize,
		})

		fmt.Printf("Batch %d-%d confirmed, gas used: %d\n", minted+1, minted+batchSize, receipt.GasUsed)

		minted += batchSize
		remaining -= batchSize
	}

	return results, nil
}
