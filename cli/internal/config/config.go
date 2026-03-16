package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type AppConfig struct {
	CurrentNetwork string `json:"current_network"`
}

type ContractRecord struct {
	Address    string    `json:"address"`
	Network    string    `json:"network"`
	Name       string    `json:"name"`
	Symbol     string    `json:"symbol"`
	BaseURI    string    `json:"base_uri"`
	TxHash     string    `json:"tx_hash"`
	DeployedAt time.Time `json:"deployed_at"`
}

func DataDir() string {
	home, _ := os.UserHomeDir()
	dir := filepath.Join(home, ".erc721-cli")
	os.MkdirAll(dir, 0700)
	return dir
}

func WalletsDir() string {
	dir := filepath.Join(DataDir(), "wallets")
	os.MkdirAll(dir, 0700)
	return dir
}

func configPath() string {
	return filepath.Join(DataDir(), "config.json")
}

func contractsPath() string {
	return filepath.Join(DataDir(), "contracts.json")
}

func LoadConfig() (*AppConfig, error) {
	cfg := &AppConfig{CurrentNetwork: "sepolia"}
	data, err := os.ReadFile(configPath())
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func SaveConfig(cfg *AppConfig) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath(), data, 0600)
}

func LoadContracts() ([]ContractRecord, error) {
	var records []ContractRecord
	data, err := os.ReadFile(contractsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return records, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func SaveContract(record ContractRecord) error {
	records, err := LoadContracts()
	if err != nil {
		return err
	}
	records = append(records, record)
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(contractsPath(), data, 0600)
}
