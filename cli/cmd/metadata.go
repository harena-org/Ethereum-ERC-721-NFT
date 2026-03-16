package cmd

import (
	"fmt"

	"nft-cli/internal/metadata"
	"nft-cli/internal/pinata"

	"github.com/spf13/cobra"
)

var metadataCmd = &cobra.Command{
	Use:   "metadata",
	Short: "Manage NFT metadata",
}

var metadataGenerateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Generate metadata JSON files",
	RunE: func(cmd *cobra.Command, args []string) error {
		imageCID, _ := cmd.Flags().GetString("image-cid")
		name, _ := cmd.Flags().GetString("name")
		description, _ := cmd.Flags().GetString("description")
		count, _ := cmd.Flags().GetInt("count")
		mappingFile, _ := cmd.Flags().GetString("mapping")
		outputDir, _ := cmd.Flags().GetString("output")

		if imageCID == "" || name == "" || count == 0 || mappingFile == "" {
			return fmt.Errorf("image-cid, name, count, and mapping are required")
		}
		if outputDir == "" {
			outputDir = "./metadata"
		}

		if err := metadata.GenerateAll(imageCID, name, description, count, mappingFile, outputDir); err != nil {
			return err
		}

		fmt.Printf("Generated %d metadata files in %s\n", count, outputDir)
		return nil
	},
}

var metadataUploadCmd = &cobra.Command{
	Use:   "upload",
	Short: "Upload metadata directory to IPFS via Pinata",
	RunE: func(cmd *cobra.Command, args []string) error {
		dir, _ := cmd.Flags().GetString("dir")
		pinataKey, _ := cmd.Flags().GetString("pinata-key")
		pinataSecret, _ := cmd.Flags().GetString("pinata-secret")

		if dir == "" {
			dir = "./metadata"
		}

		apiKey, apiSecret, err := pinata.GetPinataCredentials(pinataKey, pinataSecret)
		if err != nil {
			return err
		}

		client := pinata.NewClient(apiKey, apiSecret)
		cid, err := client.UploadDirectory(dir)
		if err != nil {
			return fmt.Errorf("upload failed: %w", err)
		}

		fmt.Printf("Metadata uploaded! CID: %s\n", cid)
		fmt.Printf("Base URI: ipfs://%s/\n", cid)
		fmt.Printf("IPFS gateway: https://gateway.pinata.cloud/ipfs/%s\n", cid)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(metadataCmd)

	metadataGenerateCmd.Flags().String("image-cid", "", "IPFS CID for images")
	metadataGenerateCmd.Flags().String("name", "", "Collection name")
	metadataGenerateCmd.Flags().String("description", "", "NFT description")
	metadataGenerateCmd.Flags().Int("count", 0, "Number of tokens")
	metadataGenerateCmd.Flags().String("mapping", "", "Path to image-mapping.json")
	metadataGenerateCmd.Flags().String("output", "", "Output directory for metadata files")
	metadataCmd.AddCommand(metadataGenerateCmd)

	metadataUploadCmd.Flags().String("dir", "", "Metadata directory to upload")
	metadataUploadCmd.Flags().String("pinata-key", "", "Pinata API key")
	metadataUploadCmd.Flags().String("pinata-secret", "", "Pinata API secret")
	metadataCmd.AddCommand(metadataUploadCmd)
}
