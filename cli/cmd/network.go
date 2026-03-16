package cmd

import (
	"fmt"

	"nft-cli/internal/network"

	"github.com/spf13/cobra"
)

var networkCmd = &cobra.Command{
	Use:   "network",
	Short: "Manage networks",
}

var networkListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all networks",
	RunE: func(cmd *cobra.Command, args []string) error {
		nets, err := network.List()
		if err != nil {
			return err
		}
		cur, _ := network.GetCurrent()
		for _, n := range nets {
			marker := "  "
			if cur != nil && cur.Name == n.Name {
				marker = "* "
			}
			builtinTag := ""
			if n.Builtin {
				builtinTag = " (builtin)"
			}
			fmt.Printf("%s%s  rpc=%s  chainID=%d%s\n", marker, n.Name, n.RPC, n.ChainID, builtinTag)
		}
		return nil
	},
}

var networkAddCmd = &cobra.Command{
	Use:   "add",
	Short: "Add a custom network",
	RunE: func(cmd *cobra.Command, args []string) error {
		name, _ := cmd.Flags().GetString("name")
		rpc, _ := cmd.Flags().GetString("rpc")
		chainID, _ := cmd.Flags().GetInt64("chain-id")
		if name == "" || rpc == "" || chainID == 0 {
			return fmt.Errorf("name, rpc, and chain-id are required")
		}
		if err := network.Add(name, rpc, chainID); err != nil {
			return err
		}
		fmt.Printf("Network '%s' added.\n", name)
		return nil
	},
}

var networkDeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete a custom network",
	RunE: func(cmd *cobra.Command, args []string) error {
		name, _ := cmd.Flags().GetString("name")
		if name == "" {
			return fmt.Errorf("name is required")
		}
		if err := network.Delete(name); err != nil {
			return err
		}
		fmt.Printf("Network '%s' deleted.\n", name)
		return nil
	},
}

var networkUseCmd = &cobra.Command{
	Use:   "use",
	Short: "Set the current network",
	RunE: func(cmd *cobra.Command, args []string) error {
		name, _ := cmd.Flags().GetString("name")
		if name == "" {
			return fmt.Errorf("name is required")
		}
		if err := network.Use(name); err != nil {
			return err
		}
		fmt.Printf("Switched to network '%s'.\n", name)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(networkCmd)

	networkCmd.AddCommand(networkListCmd)

	networkAddCmd.Flags().String("name", "", "Network name")
	networkAddCmd.Flags().String("rpc", "", "RPC URL")
	networkAddCmd.Flags().Int64("chain-id", 0, "Chain ID")
	networkCmd.AddCommand(networkAddCmd)

	networkDeleteCmd.Flags().String("name", "", "Network name")
	networkCmd.AddCommand(networkDeleteCmd)

	networkUseCmd.Flags().String("name", "", "Network name")
	networkCmd.AddCommand(networkUseCmd)
}
