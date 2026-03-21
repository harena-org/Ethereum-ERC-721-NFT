package cmd

import (
	"fmt"
	"time"

	"nft-cli/internal/config"
	"nft-cli/internal/contract"
	"nft-cli/internal/network"
	"nft-cli/internal/wallet"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/spf13/cobra"
)

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Deploy an ERC-721 NFT contract",
	RunE: func(cmd *cobra.Command, args []string) error {
		walletFlag, _ := cmd.Flags().GetString("wallet")
		password, _ := cmd.Flags().GetString("password")
		name, _ := cmd.Flags().GetString("name")
		symbol, _ := cmd.Flags().GetString("symbol")
		baseURI, _ := cmd.Flags().GetString("base-uri")
		royaltyBps, _ := cmd.Flags().GetUint64("royalty-bps")
		royaltyReceiverFlag, _ := cmd.Flags().GetString("royalty-receiver")

		if name == "" || symbol == "" || baseURI == "" {
			return fmt.Errorf("name, symbol, and base-uri are required")
		}

		address, err := defaultWallet(walletFlag)
		if err != nil {
			return err
		}

		net, err := network.GetCurrent()
		if err != nil {
			return fmt.Errorf("get current network: %w", err)
		}

		privateKey, err := wallet.LoadPrivateKey(address, password)
		if err != nil {
			return fmt.Errorf("load wallet: %w", err)
		}

		// Royalty receiver defaults to deployer address
		var royaltyReceiver common.Address
		if royaltyReceiverFlag != "" {
			royaltyReceiver = common.HexToAddress(royaltyReceiverFlag)
		} else {
			royaltyReceiver = crypto.PubkeyToAddress(privateKey.PublicKey)
		}

		fmt.Printf("Deploying to %s (chainID=%d)...\n", net.Name, net.ChainID)
		fmt.Printf("Royalty: %d bps (%.2f%%) -> %s\n", royaltyBps, float64(royaltyBps)/100, royaltyReceiver.Hex())

		result, err := contract.Deploy(net.RPC, net.ChainID, privateKey, name, symbol, baseURI, royaltyReceiver, royaltyBps)
		if err != nil {
			return fmt.Errorf("deploy failed: %w", err)
		}

		record := config.ContractRecord{
			Address:    result.ContractAddress,
			Network:    net.Name,
			Name:       name,
			Symbol:     symbol,
			BaseURI:    baseURI,
			TxHash:     result.TxHash,
			DeployedAt: time.Now(),
		}
		if err := config.SaveContract(record); err != nil {
			fmt.Printf("Warning: failed to save contract record: %v\n", err)
		}

		fmt.Printf("Contract deployed!\n")
		fmt.Printf("Address:  %s\n", result.ContractAddress)
		fmt.Printf("Tx Hash:  %s\n", result.TxHash)
		fmt.Printf("Gas Used: %d\n", result.GasUsed)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(deployCmd)

	deployCmd.Flags().StringP("wallet", "w", "", "Wallet address")
	deployCmd.Flags().StringP("password", "p", "", "Wallet password")
	deployCmd.Flags().String("name", "", "NFT collection name")
	deployCmd.Flags().String("symbol", "", "NFT symbol")
	deployCmd.Flags().String("base-uri", "", "Base URI for token metadata")
	deployCmd.Flags().Uint64("royalty-bps", 100, "Royalty in basis points (100 = 1%, default: 100)")
	deployCmd.Flags().String("royalty-receiver", "", "Royalty receiver address (default: deployer)")
}
