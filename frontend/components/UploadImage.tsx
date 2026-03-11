"use client";

import { useState, useRef } from "react";
import { uploadImageToIPFS, listRecentPins } from "@/lib/ipfs";
import { formatError } from "@/lib/error";
import type { PinataConfig, PinataPin } from "@/lib/ipfs";

interface Props {
  onUploaded: (imageCID: string, pinataConfig: PinataConfig) => void;
}

export default function UploadImage({ onUploaded }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cid, setCid] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [recentPins, setRecentPins] = useState<PinataPin[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState("");
  const [manualCID, setManualCID] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function useCID(hash: string) {
    const config = { apiKey, secretKey };
    setCid(hash);
    onUploaded(hash, config);
  }

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file || !apiKey || !secretKey) return;
    setLoading(true);
    setError("");
    try {
      const config = { apiKey, secretKey };
      const hash = await uploadImageToIPFS(file, config);
      setCid(hash);
      onUploaded(hash, config);
    } catch (e: any) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }

  if (cid) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0ea5e9]/5 border border-[#0ea5e9]/20">
        {preview && <img src={preview} alt="NFT" className="w-12 h-12 object-cover rounded-lg" />}
        <div className="min-w-0">
          <p className="text-sm text-[#0ea5e9] font-medium">Uploaded to IPFS</p>
          <p className="font-mono text-xs text-[#64748b] truncate">ipfs://{cid}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-[#0ea5e9] bg-[#0ea5e9]/5" : "border-[#e2e8f0] hover:border-[#cbd5e1]"
        }`}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
            <p className="text-xs text-[#64748b]">{file?.name}</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm text-[#64748b]">Drag & drop or click to browse</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      <input
        type="text"
        placeholder="Pinata API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
      />
      <input
        type="password"
        placeholder="Pinata Secret Key"
        value={secretKey}
        onChange={(e) => setSecretKey(e.target.value)}
        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
      />

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={loading || !file || !apiKey || !secretKey}
          className="flex-1 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
        >
          {loading ? "Uploading..." : "Upload to IPFS"}
        </button>
        <button
          onClick={async () => {
            if (!apiKey || !secretKey) return;
            setListLoading(true);
            try {
              const pins = await listRecentPins({ apiKey, secretKey }, 3);
              setRecentPins(pins);
            } catch (e: any) {
              setError(formatError(e));
            } finally {
              setListLoading(false);
            }
          }}
          disabled={listLoading || !apiKey || !secretKey}
          className="px-4 py-2.5 bg-[#f1f5f9] border border-[#e2e8f0] hover:bg-[#e2e8f0] disabled:opacity-50 rounded-lg text-xs text-[#64748b] transition-colors whitespace-nowrap"
        >
          {listLoading ? "Loading..." : "List From IPFS"}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#e2e8f0]" />
        <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">or use existing CID</span>
        <div className="flex-1 h-px bg-[#e2e8f0]" />
      </div>

      {/* Manual CID input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste IPFS CID, e.g. Qm..."
          value={manualCID}
          onChange={(e) => setManualCID(e.target.value)}
          className="flex-1 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] font-mono"
        />
        <button
          onClick={() => { if (manualCID.trim()) useCID(manualCID.trim()); }}
          disabled={!manualCID.trim() || !apiKey || !secretKey}
          className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-xs transition-colors whitespace-nowrap"
        >
          Use This CID
        </button>
      </div>

      {recentPins.length > 0 && (
        <div className="rounded-lg border border-[#e2e8f0] overflow-hidden">
          <div className="px-3 py-2 bg-[#f8fafc] border-b border-[#e2e8f0]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">Recent IPFS Files</p>
          </div>
          {recentPins.map((pin) => (
            <div key={pin.ipfs_pin_hash} className="flex items-center justify-between px-3 py-2.5 border-b border-[#e2e8f0] last:border-b-0">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-xs text-[#0f172a] truncate">{pin.metadata?.name || "Untitled"}</p>
                <p className="font-mono text-[10px] text-[#94a3b8] truncate">ipfs://{pin.ipfs_pin_hash}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => useCID(pin.ipfs_pin_hash)}
                  disabled={!apiKey || !secretKey}
                  className="px-2 py-1 text-[10px] rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white transition-colors disabled:opacity-50"
                >
                  Use
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pin.ipfs_pin_hash);
                    setCopiedHash(pin.ipfs_pin_hash);
                    setTimeout(() => setCopiedHash(""), 2000);
                  }}
                  className="px-2 py-1 text-[10px] rounded border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                >
                  {copiedHash === pin.ipfs_pin_hash ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Pinata help */}
      <div className="rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] p-4 text-xs text-[#64748b] space-y-2">
        <p className="font-medium text-[#475569]">How to get Pinata API Key?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Visit <a href="https://app.pinata.cloud" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline">app.pinata.cloud</a> and sign up</li>
          <li>Go to <strong>API Keys</strong> page</li>
          <li>Click <strong>New Key</strong> to generate API Key and API Secret</li>
          <li>Free tier includes 1GB storage + 100 requests/month</li>
        </ol>
      </div>
    </div>
  );
}
