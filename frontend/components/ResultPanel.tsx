interface Props {
  contractAddress: string;
  totalMinted: number;
  txHashes: string[];
  totalCostETH: string;
}

export default function ResultPanel({ contractAddress, totalMinted, txHashes, totalCostETH }: Props) {
  return (
    <div className="rounded-lg border border-green-800 bg-green-950/30 p-6 space-y-4">
      <h3 className="text-lg font-bold text-green-400">Minting Complete!</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400">Contract Address</p>
          <a
            href={`https://etherscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono text-xs break-all"
          >
            {contractAddress}
          </a>
        </div>
        <div>
          <p className="text-gray-400">Total Minted</p>
          <p className="text-white font-medium">{totalMinted.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400">Total Transactions</p>
          <p className="text-white font-medium">{txHashes.length}</p>
        </div>
        <div>
          <p className="text-gray-400">Estimated Gas Cost</p>
          <p className="text-white font-medium">{totalCostETH} ETH</p>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-gray-400 mb-1">Transaction Hashes</p>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {txHashes.map((hash, i) => (
            <a
              key={hash}
              href={`https://etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:underline font-mono text-xs"
            >
              {i + 1}. {hash}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
