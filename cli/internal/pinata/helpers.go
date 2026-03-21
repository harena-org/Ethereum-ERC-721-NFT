package pinata

import (
	"fmt"
	"os"
)

// GetPinataCredentials returns API key and secret from flags or environment variables.
func GetPinataCredentials(flagKey, flagSecret string) (string, string, error) {
	apiKey := flagKey
	if apiKey == "" {
		apiKey = os.Getenv("PINATA_API_KEY")
	}

	apiSecret := flagSecret
	if apiSecret == "" {
		apiSecret = os.Getenv("PINATA_API_SECRET")
	}

	if apiKey == "" || apiSecret == "" {
		return "", "", fmt.Errorf("pinata credentials required: provide --pinata-key and --pinata-secret flags or set PINATA_API_KEY and PINATA_API_SECRET environment variables")
	}

	return apiKey, apiSecret, nil
}