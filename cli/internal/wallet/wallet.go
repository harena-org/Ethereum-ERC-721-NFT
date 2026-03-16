package wallet

import (
	"crypto/ecdsa"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"nft-cli/internal/config"

	"github.com/btcsuite/btcd/btcutil/hdkeychain"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/tyler-smith/go-bip39"
)

type WalletInfo struct {
	Address  string
	Mnemonic string
}

func Create(password string) (*WalletInfo, error) {
	entropy, err := bip39.NewEntropy(128)
	if err != nil {
		return nil, fmt.Errorf("generate entropy: %w", err)
	}
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return nil, fmt.Errorf("generate mnemonic: %w", err)
	}

	privateKey, err := deriveKeyFromMnemonic(mnemonic)
	if err != nil {
		return nil, err
	}

	addr, err := saveToKeystore(privateKey, password)
	if err != nil {
		return nil, err
	}

	return &WalletInfo{Address: addr, Mnemonic: mnemonic}, nil
}

func ImportFromPrivateKey(hexKey, password string) (string, error) {
	hexKey = strings.TrimPrefix(hexKey, "0x")
	privateKey, err := crypto.HexToECDSA(hexKey)
	if err != nil {
		return "", fmt.Errorf("parse private key: %w", err)
	}
	return saveToKeystore(privateKey, password)
}

func ImportFromMnemonic(mnemonic, password string) (string, error) {
	privateKey, err := deriveKeyFromMnemonic(mnemonic)
	if err != nil {
		return "", err
	}
	return saveToKeystore(privateKey, password)
}

func List() ([]string, error) {
	ks := keystore.NewKeyStore(config.WalletsDir(), keystore.StandardScryptN, keystore.StandardScryptP)
	var addrs []string
	for _, a := range ks.Accounts() {
		addrs = append(addrs, a.Address.Hex())
	}
	return addrs, nil
}

func Delete(address string) error {
	dir := config.WalletsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	lower := strings.ToLower(strings.TrimPrefix(address, "0x"))
	for _, e := range entries {
		if strings.Contains(strings.ToLower(e.Name()), lower) {
			return os.Remove(filepath.Join(dir, e.Name()))
		}
	}
	return fmt.Errorf("wallet not found: %s", address)
}

func LoadPrivateKey(address, password string) (*ecdsa.PrivateKey, error) {
	ks := keystore.NewKeyStore(config.WalletsDir(), keystore.StandardScryptN, keystore.StandardScryptP)
	lower := strings.ToLower(strings.TrimPrefix(address, "0x"))
	for _, a := range ks.Accounts() {
		if strings.ToLower(a.Address.Hex()[2:]) == lower {
			keyJSON, err := os.ReadFile(a.URL.Path)
			if err != nil {
				return nil, err
			}
			key, err := keystore.DecryptKey(keyJSON, password)
			if err != nil {
				return nil, fmt.Errorf("decrypt key: %w", err)
			}
			return key.PrivateKey, nil
		}
	}
	return nil, fmt.Errorf("wallet not found: %s", address)
}

func deriveKeyFromMnemonic(mnemonic string) (*ecdsa.PrivateKey, error) {
	seed := bip39.NewSeed(mnemonic, "")

	masterKey, err := hdkeychain.NewMaster(seed, &chaincfg.MainNetParams)
	if err != nil {
		return nil, fmt.Errorf("derive master key: %w", err)
	}

	// BIP44 path: m/44'/60'/0'/0/0
	purpose, err := masterKey.Derive(hdkeychain.HardenedKeyStart + 44)
	if err != nil {
		return nil, fmt.Errorf("derive purpose: %w", err)
	}
	coinType, err := purpose.Derive(hdkeychain.HardenedKeyStart + 60)
	if err != nil {
		return nil, fmt.Errorf("derive coin type: %w", err)
	}
	account, err := coinType.Derive(hdkeychain.HardenedKeyStart + 0)
	if err != nil {
		return nil, fmt.Errorf("derive account: %w", err)
	}
	change, err := account.Derive(0)
	if err != nil {
		return nil, fmt.Errorf("derive change: %w", err)
	}
	index, err := change.Derive(0)
	if err != nil {
		return nil, fmt.Errorf("derive index: %w", err)
	}

	privKeyEC, err := index.ECPrivKey()
	if err != nil {
		return nil, fmt.Errorf("extract ec private key: %w", err)
	}

	privateKey, err := crypto.ToECDSA(privKeyEC.Serialize())
	if err != nil {
		return nil, fmt.Errorf("convert to ecdsa: %w", err)
	}

	return privateKey, nil
}

func saveToKeystore(privateKey *ecdsa.PrivateKey, password string) (string, error) {
	ks := keystore.NewKeyStore(config.WalletsDir(), keystore.StandardScryptN, keystore.StandardScryptP)
	acc, err := ks.ImportECDSA(privateKey, password)
	if err != nil {
		return "", fmt.Errorf("import to keystore: %w", err)
	}
	return acc.Address.Hex(), nil
}
