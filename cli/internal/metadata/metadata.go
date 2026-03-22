package metadata

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
)

// Attribute represents a single NFT trait.
type Attribute struct {
	TraitType string `json:"trait_type"`
	Value     int    `json:"value"`
}

// NFTMetadata represents the metadata for a single NFT token.
type NFTMetadata struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Image       string      `json:"image"`
	Attributes  []Attribute `json:"attributes"`
}

var attributeNames = []string{
	"Brawn", "Swift", "Wit", "Chill", "Tough", "Wander", "Crafty", "Lucky",
}

func generateAttributes() []Attribute {
	attrs := make([]Attribute, len(attributeNames))
	for i, name := range attributeNames {
		attrs[i] = Attribute{
			TraitType: name,
			Value:     rand.Intn(60) + 40, // 40-99
		}
	}
	return attrs
}

// GenerateAll creates metadata JSON files for each token ID from 1 to count.
// It reads the image mapping from mappingFile to resolve original filenames.
func GenerateAll(imageCID string, collectionName string, description string, count int, mappingFile string, outputDir string) error {
	data, err := os.ReadFile(mappingFile)
	if err != nil {
		return fmt.Errorf("reading mapping file %s: %w", mappingFile, err)
	}

	var mapping map[string]string
	if err := json.Unmarshal(data, &mapping); err != nil {
		return fmt.Errorf("parsing mapping file: %w", err)
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("creating output directory: %w", err)
	}

	for i := 1; i <= count; i++ {
		tokenID := strconv.Itoa(i)
		filename, ok := mapping[tokenID]
		if !ok {
			return fmt.Errorf("no mapping found for token ID %s", tokenID)
		}

		meta := NFTMetadata{
			Name:        fmt.Sprintf("%s #%s", collectionName, tokenID),
			Description: description,
			Image:       fmt.Sprintf("ipfs://%s/%s", imageCID, filename),
			Attributes:  generateAttributes(),
		}

		jsonData, err := json.MarshalIndent(meta, "", "  ")
		if err != nil {
			return fmt.Errorf("marshaling metadata for token %s: %w", tokenID, err)
		}

		outPath := filepath.Join(outputDir, tokenID+".json")
		if err := os.WriteFile(outPath, jsonData, 0644); err != nil {
			return fmt.Errorf("writing %s: %w", outPath, err)
		}
	}

	return nil
}
