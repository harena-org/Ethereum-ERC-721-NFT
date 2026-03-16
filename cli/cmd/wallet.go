package cmd

import (
	"context"
	"fmt"
	"math/big"

	"nft-cli/internal/network"
	"nft-cli/internal/wallet"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/params"
	"github.com/spf13/cobra"
)

var walletCmd = &cobra.Command{
	Use:   "wallet",
	Short: "Manage wallets",
}

var walletCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new wallet",
	RunE: func(cmd *cobra.Command, args []string) error {
		password, _ := cmd.Flags().GetString("password")
		info, err := wallet.Create(password)
		if err != nil {
			return err
		}
		fmt.Printf("Wallet created!\n")
		fmt.Printf("Address:  %s\n", info.Address)
		fmt.Printf("Mnemonic: %s\n", info.Mnemonic)
		fmt.Println("Please save your mnemonic in a safe place!")
		return nil
	},
}

var walletImportKeyCmd = &cobra.Command{
	Use:   "import-key",
	Short: "Import wallet from private key",
	RunE: func(cmd *cobra.Command, args []string) error {
		key, _ := cmd.Flags().GetString("private-key")
		password, _ := cmd.Flags().GetString("password")
		if key == "" {
			return fmt.Errorf("private-key is required")
		}
		addr, err := wallet.ImportFromPrivateKey(key, password)
		if err != nil {
			return err
		}
		fmt.Printf("Wallet imported: %s\n", addr)
		return nil
	},
}

var walletImportMnemonicCmd = &cobra.Command{
	Use:   "import-mnemonic",
	Short: "Import wallet from mnemonic",
	RunE: func(cmd *cobra.Command, args []string) error {
		mnemonic, _ := cmd.Flags().GetString("mnemonic")
		password, _ := cmd.Flags().GetString("password")
		if mnemonic == "" {
			return fmt.Errorf("mnemonic is required")
		}
		addr, err := wallet.ImportFromMnemonic(mnemonic, password)
		if err != nil {
			return err
		}
		fmt.Printf("Wallet imported: %s\n", addr)
		return nil
	},
}

var walletListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all wallets",
	RunE: func(cmd *cobra.Command, args []string) error {
		addrs, err := wallet.List()
		if err != nil {
			return err
		}
		if len(addrs) == 0 {
			fmt.Println("No wallets found.")
			return nil
		}
		for i, addr := range addrs {
			fmt.Printf("%d. %s\n", i+1, addr)
		}
		return nil
	},
}

var walletDeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete a wallet",
	RunE: func(cmd *cobra.Command, args []string) error {
		address, _ := cmd.Flags().GetString("address")
		if address == "" {
			return fmt.Errorf("address is required")
		}
		fmt.Printf("Are you sure you want to delete wallet %s? Type 'yes' to confirm: ", address)
		var confirm string
		fmt.Scanln(&confirm)
		if confirm != "yes" {
			fmt.Println("Cancelled.")
			return nil
		}
		if err := wallet.Delete(address); err != nil {
			return err
		}
		fmt.Println("Wallet deleted.")
		return nil
	},
}

var walletBalanceCmd = &cobra.Command{
	Use:   "balance",
	Short: "Check wallet balance",
	RunE: func(cmd *cobra.Command, args []string) error {
		addrFlag, _ := cmd.Flags().GetString("address")
		address, err := defaultWallet(addrFlag)
		if err != nil {
			return err
		}
		net, err := network.GetCurrent()
		if err != nil {
			return fmt.Errorf("no network selected, run 'nft-cli network use' first: %w", err)
		}
		client, err := ethclient.Dial(net.RPC)
		if err != nil {
			return fmt.Errorf("failed to connect to %s: %w", net.Name, err)
		}
		defer client.Close()
		balance, err := client.BalanceAt(context.Background(), common.HexToAddress(address), nil)
		if err != nil {
			return fmt.Errorf("failed to get balance: %w", err)
		}
		ethValue := new(big.Float).Quo(new(big.Float).SetInt(balance), new(big.Float).SetInt(big.NewInt(params.Ether)))
		fmt.Printf("Network: %s\n", net.Name)
		fmt.Printf("Address: %s\n", address)
		fmt.Printf("Balance: %s ETH\n", ethValue.Text('f', 18))
		return nil
	},
}

func init() {
	rootCmd.AddCommand(walletCmd)

	walletCreateCmd.Flags().StringP("password", "p", "", "Password for the wallet")
	walletCmd.AddCommand(walletCreateCmd)

	walletImportKeyCmd.Flags().String("private-key", "", "Private key hex string")
	walletImportKeyCmd.Flags().StringP("password", "p", "", "Password for the wallet")
	walletCmd.AddCommand(walletImportKeyCmd)

	walletImportMnemonicCmd.Flags().StringP("mnemonic", "m", "", "Mnemonic phrase")
	walletImportMnemonicCmd.Flags().StringP("password", "p", "", "Password for the wallet")
	walletCmd.AddCommand(walletImportMnemonicCmd)

	walletListCmd.Flags().StringP("password", "p", "", "Password (unused, for compatibility)")
	walletCmd.AddCommand(walletListCmd)

	walletDeleteCmd.Flags().StringP("address", "a", "", "Wallet address to delete")
	walletCmd.AddCommand(walletDeleteCmd)

	walletBalanceCmd.Flags().StringP("address", "a", "", "Wallet address")
	walletCmd.AddCommand(walletBalanceCmd)
}
