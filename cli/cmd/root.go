package cmd

import (
	"fmt"
	"os"

	"nft-cli/internal/wallet"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "nft-cli",
	Short: "ERC-721 NFT deployment and minting CLI tool",
	Long:  "A command-line tool for deploying ERC-721 NFT contracts and batch minting NFTs on Ethereum networks.",
}

// defaultWallet returns the given address, or the first wallet if empty.
func defaultWallet(addr string) (string, error) {
	if addr != "" {
		return addr, nil
	}
	addrs, err := wallet.List()
	if err != nil {
		return "", fmt.Errorf("failed to list wallets: %w", err)
	}
	if len(addrs) == 0 {
		return "", fmt.Errorf("no wallets found, create one first with 'nft-cli wallet create'")
	}
	return addrs[0], nil
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
