package pinata

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
)

const (
	pinFileToIPFSURL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
	pinListURL       = "https://api.pinata.cloud/data/pinList"
)

// Client holds Pinata API credentials.
type Client struct {
	APIKey    string
	APISecret string
}

// NewClient creates a new Pinata client.
func NewClient(apiKey, apiSecret string) *Client {
	return &Client{
		APIKey:    apiKey,
		APISecret: apiSecret,
	}
}

// setAuth sets the auth headers on a request.
func (c *Client) setAuth(req *http.Request) {
	req.Header.Set("pinata_api_key", c.APIKey)
	req.Header.Set("pinata_secret_api_key", c.APISecret)
}

type pinataResponse struct {
	IpfsHash string `json:"IpfsHash"`
}

// PinInfo represents a single pinned file/directory.
type PinInfo struct {
	IpfsHash    string            `json:"ipfs_pin_hash"`
	Size        int64             `json:"size"`
	DatePinned  string            `json:"date_pinned"`
	Metadata    PinMetadata       `json:"metadata"`
}

// PinMetadata holds the metadata associated with a pin.
type PinMetadata struct {
	Name string `json:"name"`
}

type pinListResponse struct {
	Count int       `json:"count"`
	Rows  []PinInfo `json:"rows"`
}

// ListPins returns all pinned files from Pinata.
// status can be "pinned", "unpinned", or "all". Empty defaults to "pinned".
func (c *Client) ListPins(status string, pageLimit int, pageOffset int) ([]PinInfo, int, error) {
	if status == "" {
		status = "pinned"
	}
	if pageLimit <= 0 {
		pageLimit = 10
	}

	url := fmt.Sprintf("%s?status=%s&pageLimit=%d&pageOffset=%d", pinListURL, status, pageLimit, pageOffset)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("creating request: %w", err)
	}
	c.setAuth(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, 0, fmt.Errorf("pinata returned status %d: %s", resp.StatusCode, string(body))
	}

	var result pinListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, 0, fmt.Errorf("decoding response: %w", err)
	}

	return result.Rows, result.Count, nil
}

// UploadDirectory uploads all files in dirPath to Pinata as a directory pin
// and returns the IPFS CID.
func (c *Client) UploadDirectory(dirPath string) (string, error) {
	dirName := filepath.Base(dirPath)

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return "", fmt.Errorf("reading directory %s: %w", dirPath, err)
	}

	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	errCh := make(chan error, 1)
	go func() {
		defer pw.Close()
		defer writer.Close()

		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			filePath := filepath.Join(dirPath, entry.Name())
			partName := fmt.Sprintf("%s/%s", dirName, entry.Name())

			part, err := writer.CreateFormFile("file", partName)
			if err != nil {
				errCh <- fmt.Errorf("creating form file: %w", err)
				return
			}

			f, err := os.Open(filePath)
			if err != nil {
				errCh <- fmt.Errorf("opening file %s: %w", filePath, err)
				return
			}
			_, err = io.Copy(part, f)
			f.Close()
			if err != nil {
				errCh <- fmt.Errorf("copying file %s: %w", filePath, err)
				return
			}
		}
		errCh <- nil
	}()

	req, err := http.NewRequest(http.MethodPost, pinFileToIPFSURL, pr)
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.setAuth(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if writeErr := <-errCh; writeErr != nil {
		return "", writeErr
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("pinata returned status %d: %s", resp.StatusCode, string(body))
	}

	var result pinataResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decoding response: %w", err)
	}

	return result.IpfsHash, nil
}
