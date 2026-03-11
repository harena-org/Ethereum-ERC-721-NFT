interface Props {
  contractAddress: string;
  totalMinted: number;
  txHashes: string[];
  totalCostETH: string;
  explorerUrl: string;
}

export default function ResultPanel({ contractAddress, totalMinted, txHashes, totalCostETH, explorerUrl }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm">✓</div>
        <h3 className="text-lg font-semibold text-emerald-400">Minting Complete</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[#0c0c1a] border border-[#141428]">
          <p className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">Contract</p>
          <a
            href={`${explorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0ea5e9] hover:underline font-mono text-xs break-all"
          >
            {contractAddress}
          </a>
        </div>
        <div className="p-3 rounded-lg bg-[#0c0c1a] border border-[#141428]">
          <p className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">Total Minted</p>
          <p className="text-[#e2e8f0] font-semibold">{totalMinted.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-[#0c0c1a] border border-[#141428]">
          <p className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">Transactions</p>
          <p className="text-[#e2e8f0] font-semibold">{txHashes.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-[#0c0c1a] border border-[#141428]">
          <p className="text-[10px] uppercase tracking-wider text-[#475569] mb-1">Gas Cost</p>
          <p className="text-[#e2e8f0] font-semibold">{totalCostETH} ETH</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#475569] mb-2">Transaction Hashes</p>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {txHashes.map((hash, i) => (
            <div key={hash} className="flex items-center justify-between text-xs py-1">
              <span className="text-[#334155]">{i + 1}.</span>
              <a
                href={`${explorerUrl}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0ea5e9] hover:underline font-mono"
              >
                {hash}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
