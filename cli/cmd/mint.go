package cmd

import (
	"fmt"

	"nft-cli/internal/contract"
	"nft-cli/internal/network"
	"nft-cli/internal/wallet"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/spf13/cobra"
)

var mintCmd = &cobra.Command{
	Use:   "mint",
	Short: "Batch mint NFTs",
	RunE: func(cmd *cobra.Command, args []string) error {
		walletFlag, _ := cmd.Flags().GetString("wallet")
		password, _ := cmd.Flags().GetString("password")
		contractAddr, _ := cmd.Flags().GetString("contract")
		to, _ := cmd.Flags().GetString("to")
		quantity, _ := cmd.Flags().GetInt("quantity")

		if contractAddr == "" || quantity == 0 {
			return fmt.Errorf("contract and quantity are required")
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

		if to == "" {
			to = crypto.PubkeyToAddress(privateKey.PublicKey).Hex()
		}

		fmt.Printf("Minting %d NFTs on %s to %s...\n", quantity, net.Name, to)

		results, err := contract.MintBatch(net.RPC, net.ChainID, privateKey, contractAddr, to, quantity)
		if err != nil {
			return fmt.Errorf("mint failed: %w", err)
		}

		fmt.Printf("\nMint complete! Summary:\n")
		var totalGas uint64
		for _, r := range results {
			fmt.Printf("  Batch %d-%d: tx=%s gas=%d\n", r.BatchStart, r.BatchEnd, r.TxHash, r.GasUsed)
			totalGas += r.GasUsed
		}
		fmt.Printf("Total gas used: %d\n", totalGas)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(mintCmd)

	mintCmd.Flags().StringP("wallet", "w", "", "Wallet address")
	mintCmd.Flags().StringP("password", "p", "", "Wallet password")
	mintCmd.Flags().String("contract", "", "Contract address")
	mintCmd.Flags().String("to", "", "Recipient address (defaults to wallet)")
	mintCmd.Flags().IntP("quantity", "q", 0, "Number of NFTs to mint")
}
