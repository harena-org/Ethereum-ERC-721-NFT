package network

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"nft-cli/internal/config"
)

type NetworkConfig struct {
	Name    string `json:"name"`
	RPC     string `json:"rpc"`
	ChainID int64  `json:"chain_id"`
	Builtin bool   `json:"builtin"`
}

var builtinNetworks = []NetworkConfig{
	{Name: "ethereum", RPC: "https://eth.llamarpc.com", ChainID: 1, Builtin: true},
	{Name: "sepolia", RPC: "https://rpc.sepolia.org", ChainID: 11155111, Builtin: true},
	{Name: "holesky", RPC: "https://rpc.holesky.ethpandaops.io", ChainID: 17000, Builtin: true},
}

func networksPath() string {
	return filepath.Join(config.DataDir(), "networks.json")
}

func loadCustomNetworks() ([]NetworkConfig, error) {
	var nets []NetworkConfig
	data, err := os.ReadFile(networksPath())
	if err != nil {
		if os.IsNotExist(err) {
			return nets, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, &nets); err != nil {
		return nil, err
	}
	return nets, nil
}

func saveCustomNetworks(nets []NetworkConfig) error {
	data, err := json.MarshalIndent(nets, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(networksPath(), data, 0600)
}

func List() ([]NetworkConfig, error) {
	custom, err := loadCustomNetworks()
	if err != nil {
		return nil, err
	}
	all := make([]NetworkConfig, len(builtinNetworks))
	copy(all, builtinNetworks)
	all = append(all, custom...)
	return all, nil
}

func Add(name, rpc string, chainID int64) error {
	for _, b := range builtinNetworks {
		if b.Name == name {
			return fmt.Errorf("cannot overwrite builtin network: %s", name)
		}
	}
	custom, err := loadCustomNetworks()
	if err != nil {
		return err
	}
	for i, n := range custom {
		if n.Name == name {
			custom[i] = NetworkConfig{Name: name, RPC: rpc, ChainID: chainID, Builtin: false}
			return saveCustomNetworks(custom)
		}
	}
	custom = append(custom, NetworkConfig{Name: name, RPC: rpc, ChainID: chainID, Builtin: false})
	return saveCustomNetworks(custom)
}

func Delete(name string) error {
	for _, b := range builtinNetworks {
		if b.Name == name {
			return fmt.Errorf("cannot delete builtin network: %s", name)
		}
	}
	custom, err := loadCustomNetworks()
	if err != nil {
		return err
	}
	found := false
	var filtered []NetworkConfig
	for _, n := range custom {
		if n.Name == name {
			found = true
			continue
		}
		filtered = append(filtered, n)
	}
	if !found {
		return fmt.Errorf("network not found: %s", name)
	}
	return saveCustomNetworks(filtered)
}

func Use(name string) error {
	all, err := List()
	if err != nil {
		return err
	}
	for _, n := range all {
		if n.Name == name {
			cfg, err := config.LoadConfig()
			if err != nil {
				return err
			}
			cfg.CurrentNetwork = name
			return config.SaveConfig(cfg)
		}
	}
	return fmt.Errorf("network not found: %s", name)
}

func GetCurrent() (*NetworkConfig, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}
	all, err := List()
	if err != nil {
		return nil, err
	}
	for _, n := range all {
		if n.Name == cfg.CurrentNetwork {
			return &n, nil
		}
	}
	// default to sepolia if no network selected
	if cfg.CurrentNetwork == "" {
		for _, n := range all {
			if n.Name == "sepolia" {
				return &n, nil
			}
		}
	}
	return nil, fmt.Errorf("current network not found: %s", cfg.CurrentNetwork)
}
