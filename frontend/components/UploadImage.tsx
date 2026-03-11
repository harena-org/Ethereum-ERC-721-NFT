"use client";

import { useState, useRef } from "react";
import { uploadImageToIPFS } from "@/lib/ipfs";
import type { PinataConfig } from "@/lib/ipfs";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError(e.message || "Upload failed");
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

      <button
        onClick={handleUpload}
        disabled={loading || !file || !apiKey || !secretKey}
        className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] text-white rounded-lg font-medium text-sm transition-colors"
      >
        {loading ? "Uploading..." : "Upload to IPFS"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
