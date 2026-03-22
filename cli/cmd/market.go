package cmd

import (
	"fmt"
	"math/big"
	"os"
	"time"

	"nft-cli/internal/contract"
	"nft-cli/internal/network"
	"nft-cli/internal/rarible"
	"nft-cli/internal/wallet"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/params"
	"github.com/spf13/cobra"
)

var marketCmd = &cobra.Command{
	Use:   "market",
	Short: "Marketplace operations",
}

var marketRaribleCmd = &cobra.Command{
	Use:   "rarible",
	Short: "Rarible marketplace operations",
}

var marketRaribleSepoliaCmd = &cobra.Command{
	Use:   "sepolia",
	Short: "Rarible Sepolia testnet operations",
}

var marketListCmd = &cobra.Command{
	Use:   "list",
	Short: "Batch list NFTs for sale on Rarible",
	RunE: func(cmd *cobra.Command, args []string) error {
		walletFlag, _ := cmd.Flags().GetString("wallet")
		password, _ := cmd.Flags().GetString("password")
		contractAddr, _ := cmd.Flags().GetString("contract")
		priceStr, _ := cmd.Flags().GetString("price")
		fromID, _ := cmd.Flags().GetInt("from-id")
		toID, _ := cmd.Flags().GetInt("to-id")
		exchangeAddr, _ := cmd.Flags().GetString("exchange")
		transferProxy, _ := cmd.Flags().GetString("transfer-proxy")
		apiURL, _ := cmd.Flags().GetString("api-url")
		apiKey, _ := cmd.Flags().GetString("api-key")

		if contractAddr == "" {
			return fmt.Errorf("--contract is required")
		}
		if toID == 0 {
			return fmt.Errorf("--to-id is required")
		}
		if fromID <= 0 {
			fromID = 1
		}

		// Parse price to wei
		priceWei := parseEther(priceStr)
		if priceWei.Sign() <= 0 {
			return fmt.Errorf("invalid price: %s", priceStr)
		}

		// API key from flag or env
		if apiKey == "" {
			apiKey = os.Getenv("RARIBLE_API_KEY")
		}

		walletAddr, err := defaultWallet(walletFlag)
		if err != nil {
			return err
		}

		net, err := network.GetCurrent()
		if err != nil {
			return fmt.Errorf("get current network: %w", err)
		}

		privateKey, err := wallet.LoadPrivateKey(walletAddr, password)
		if err != nil {
			return fmt.Errorf("load wallet: %w", err)
		}

		maker := crypto.PubkeyToAddress(privateKey.PublicKey)
		nftContract := common.HexToAddress(contractAddr)
		exchange := common.HexToAddress(exchangeAddr)
		total := toID - fromID + 1

		fmt.Printf("Network:        %s (chainID=%d)\n", net.Name, net.ChainID)
		fmt.Printf("NFT Contract:   %s\n", nftContract.Hex())
		fmt.Printf("Price:          %s ETH per NFT\n", priceStr)
		fmt.Printf("Token IDs:      %d - %d (%d NFTs)\n", fromID, toID, total)
		fmt.Println()

		// Step 1: Approve transfer proxy
		fmt.Printf("Step 1: Approving transfer proxy %s...\n", transferProxy)
		txHash, err := contract.SetApprovalForAll(net.RPC, net.ChainID, privateKey, contractAddr, transferProxy, true)
		if err != nil {
			return fmt.Errorf("approval failed: %w", err)
		}
		fmt.Printf("Approved! tx: %s\n\n", txHash)

		// Step 2: Sign and submit orders
		fmt.Printf("Step 2: Creating %d sell orders...\n", total)
		client := rarible.NewClient(apiURL, apiKey)

		success := 0
		failed := 0
		for id := fromID; id <= toID; id++ {
			tokenID := big.NewInt(int64(id))
			order := rarible.NewSellOrder(maker, nftContract, tokenID, priceWei)

			sig, err := rarible.SignOrder(order, net.ChainID, exchange, privateKey)
			if err != nil {
				fmt.Printf("  [%d/%d] Token #%d sign failed: %v\n", id-fromID+1, total, id, err)
				failed++
				continue
			}

			err = client.SubmitOrder(order, sig, nftContract, tokenID)
			if err != nil {
				fmt.Printf("  [%d/%d] Token #%d submit failed: %v\n", id-fromID+1, total, id, err)
				failed++
				continue
			}

			success++
			if success%100 == 0 || id == toID {
				fmt.Printf("  [%d/%d] Listed %d NFTs, %d failed\n", id-fromID+1, total, success, failed)
			}

			// Small delay to avoid rate limiting
			time.Sleep(50 * time.Millisecond)
		}

		fmt.Printf("\nDone! Listed: %d, Failed: %d\n", success, failed)
		return nil
	},
}

// parseEther converts an ETH amount string (e.g. "0.1") to wei.
func parseEther(eth string) *big.Int {
	f, _, err := big.ParseFloat(eth, 10, 256, big.ToNearestEven)
	if err != nil {
		return big.NewInt(0)
	}
	weiPerEth := new(big.Float).SetInt(big.NewInt(params.Ether))
	f.Mul(f, weiPerEth)
	wei, _ := f.Int(nil)
	return wei
}

func init() {
	rootCmd.AddCommand(marketCmd)
	marketCmd.AddCommand(marketRaribleCmd)
	marketRaribleCmd.AddCommand(marketRaribleSepoliaCmd)

	marketListCmd.Flags().StringP("wallet", "w", "", "Wallet address")
	marketListCmd.Flags().StringP("password", "p", "", "Wallet password")
	marketListCmd.Flags().String("contract", "", "NFT contract address")
	marketListCmd.Flags().String("price", "0.1", "Price per NFT in ETH (default: 0.1)")
	marketListCmd.Flags().Int("from-id", 1, "Start token ID (default: 1)")
	marketListCmd.Flags().Int("to-id", 0, "End token ID (required)")
	marketListCmd.Flags().String("exchange", rarible.SepoliaExchangeV2, "Rarible Exchange V2 address")
	marketListCmd.Flags().String("transfer-proxy", rarible.SepoliaTransferProxy, "Rarible Transfer Proxy address")
	marketListCmd.Flags().String("api-url", rarible.TestnetAPIURL, "Rarible API URL")
	marketListCmd.Flags().String("api-key", "", "Rarible API key (or RARIBLE_API_KEY env)")
	marketRaribleSepoliaCmd.AddCommand(marketListCmd)
}
