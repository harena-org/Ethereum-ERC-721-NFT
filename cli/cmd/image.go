package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"

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

var imageListCmd = &cobra.Command{
	Use:   "list",
	Short: "List files pinned on Pinata",
	RunE: func(cmd *cobra.Command, args []string) error {
		pinataKey, _ := cmd.Flags().GetString("pinata-key")
		pinataSecret, _ := cmd.Flags().GetString("pinata-secret")
		status, _ := cmd.Flags().GetString("status")
		limit, _ := cmd.Flags().GetInt("limit")
		offset, _ := cmd.Flags().GetInt("offset")

		apiKey, apiSecret, err := pinata.GetPinataCredentials(pinataKey, pinataSecret)
		if err != nil {
			return err
		}

		client := pinata.NewClient(apiKey, apiSecret)
		pins, total, err := client.ListPins(status, limit, offset)
		if err != nil {
			return fmt.Errorf("failed to list pins: %w", err)
		}

		fmt.Printf("Total pinned items: %d (showing %d-%d)\n\n", total, offset+1, offset+len(pins))

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "NAME\tCID\tSIZE\tDATE PINNED")
		fmt.Fprintln(w, "----\t---\t----\t-----------")
		for _, pin := range pins {
			name := pin.Metadata.Name
			if name == "" {
				name = "-"
			}
			datePinned := pin.DatePinned
			if idx := strings.IndexByte(datePinned, 'T'); idx > 0 {
				datePinned = datePinned[:idx]
			}
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", name, pin.IpfsHash, formatSize(pin.Size), datePinned)
		}
		w.Flush()

		return nil
	},
}

func formatSize(bytes int64) string {
	const (
		kb = 1024
		mb = kb * 1024
		gb = mb * 1024
	)
	switch {
	case bytes >= gb:
		return fmt.Sprintf("%.1f GB", float64(bytes)/float64(gb))
	case bytes >= mb:
		return fmt.Sprintf("%.1f MB", float64(bytes)/float64(mb))
	case bytes >= kb:
		return fmt.Sprintf("%.1f KB", float64(bytes)/float64(kb))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

func init() {
	rootCmd.AddCommand(imageCmd)

	imageUploadCmd.Flags().String("dir", "", "Directory containing images")
	imageUploadCmd.Flags().String("output", "", "Output path for image-mapping.json")
	imageUploadCmd.Flags().String("pinata-key", "", "Pinata API key")
	imageUploadCmd.Flags().String("pinata-secret", "", "Pinata API secret")
	imageCmd.AddCommand(imageUploadCmd)

	imageListCmd.Flags().String("pinata-key", "", "Pinata API key")
	imageListCmd.Flags().String("pinata-secret", "", "Pinata API secret")
	imageListCmd.Flags().String("status", "pinned", "Pin status filter: pinned, unpinned, all")
	imageListCmd.Flags().Int("limit", 10, "Number of items per page")
	imageListCmd.Flags().Int("offset", 0, "Pagination offset")
	imageCmd.AddCommand(imageListCmd)
}
