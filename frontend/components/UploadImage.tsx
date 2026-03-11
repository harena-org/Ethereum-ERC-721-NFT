"use client";

import { useState } from "react";
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
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
      <div className="rounded-lg border border-gray-800 p-4">
        <p className="text-sm text-gray-400">Image uploaded to IPFS</p>
        <p className="font-mono text-sm break-all">ipfs://{cid}</p>
        {preview && <img src={preview} alt="NFT" className="mt-2 w-32 h-32 object-cover rounded" />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Pinata API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Pinata Secret Key"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-4">
        <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        {preview && <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />}
      </div>
      <button
        onClick={handleUpload}
        disabled={loading || !file || !apiKey || !secretKey}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-medium transition"
      >
        {loading ? "Uploading..." : "Upload to IPFS"}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
