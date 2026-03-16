package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"

	"nft-cli/internal/pinata"

	"github.com/spf13/cobra"
)

var imageCmd = &cobra.Command{
	Use:   "image",
	Short: "Manage images",
}

var imageUploadCmd = &cobra.Command{
	Use:   "upload",
	Short: "Upload images to IPFS via Pinata",
	RunE: func(cmd *cobra.Command, args []string) error {
		dir, _ := cmd.Flags().GetString("dir")
		output, _ := cmd.Flags().GetString("output")
		pinataKey, _ := cmd.Flags().GetString("pinata-key")
		pinataSecret, _ := cmd.Flags().GetString("pinata-secret")

		if dir == "" {
			return fmt.Errorf("dir is required")
		}

		apiKey, apiSecret, err := pinata.GetPinataCredentials(pinataKey, pinataSecret)
		if err != nil {
			return err
		}

		entries, err := os.ReadDir(dir)
		if err != nil {
			return fmt.Errorf("reading directory: %w", err)
		}

		var filenames []string
		for _, e := range entries {
			if !e.IsDir() {
				filenames = append(filenames, e.Name())
			}
		}
		sort.Strings(filenames)

		if len(filenames) == 0 {
			return fmt.Errorf("no files found in %s", dir)
		}

		fmt.Printf("Found %d files, uploading to Pinata...\n", len(filenames))

		client := pinata.NewClient(apiKey, apiSecret)
		cid, err := client.UploadDirectory(dir)
		if err != nil {
			return fmt.Errorf("upload failed: %w", err)
		}

		fmt.Printf("Upload complete! CID: %s\n", cid)

		// Generate image mapping: tokenId -> filename
		mapping := make(map[string]string)
		for i, name := range filenames {
			tokenID := strconv.Itoa(i + 1)
			mapping[tokenID] = name
		}

		if output == "" {
			output = filepath.Join(dir, "image-mapping.json")
		}

		data, err := json.MarshalIndent(mapping, "", "  ")
		if err != nil {
			return err
		}
		if err := os.WriteFile(output, data, 0644); err != nil {
			return err
		}

		fmt.Printf("Image mapping saved to %s\n", output)
		fmt.Printf("IPFS gateway: https://gateway.pinata.cloud/ipfs/%s\n", cid)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(imageCmd)

	imageUploadCmd.Flags().String("dir", "", "Directory containing images")
	imageUploadCmd.Flags().String("output", "", "Output path for image-mapping.json")
	imageUploadCmd.Flags().String("pinata-key", "", "Pinata API key")
	imageUploadCmd.Flags().String("pinata-secret", "", "Pinata API secret")
	imageCmd.AddCommand(imageUploadCmd)
}
