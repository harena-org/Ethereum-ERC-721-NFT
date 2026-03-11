export interface Network {
  name: string;
  chainId: number;
  chainIdHex: string;
  explorerUrl: string;
  rpcUrl?: string;
}

export const NETWORKS: Network[] = [
  {
    name: "Ethereum Mainnet",
    chainId: 1,
    chainIdHex: "0x1",
    explorerUrl: "https://etherscan.io",
  },
  {
    name: "Sepolia Testnet",
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    explorerUrl: "https://sepolia.etherscan.io",
    rpcUrl: "https://rpc.sepolia.org",
  },
  {
    name: "Holesky Testnet",
    chainId: 17000,
    chainIdHex: "0x4268",
    explorerUrl: "https://holesky.etherscan.io",
    rpcUrl: "https://ethereum-holesky-rpc.publicnode.com",
  },
];

export async function switchNetwork(network: Network): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not detected");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainIdHex }],
    });
  } catch (err: any) {
    // Chain not added to MetaMask — try adding it
    if (err.code === 4902 && network.rpcUrl) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: network.chainIdHex,
          chainName: network.name,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.explorerUrl],
        }],
      });
    } else {
      throw err;
    }
  }
}
