export interface PinataConfig {
  apiKey: string;
  secretKey: string;
}

export async function uploadImageToIPFS(
  file: File,
  config: PinataConfig
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Pinata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export async function uploadMetadataToIPFS(
  metadata: object,
  config: PinataConfig
): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: config.apiKey,
      pinata_secret_api_key: config.secretKey,
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error(`Pinata metadata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export interface PinataPin {
  ipfs_pin_hash: string;
  metadata: { name: string };
  mime_type: string;
  date_pinned: string;
}

export async function listRecentPins(config: PinataConfig, limit = 3): Promise<PinataPin[]> {
  const res = await fetch(
    `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=20&sortBy=date_pinned&sortOrder=DESC`,
    {
      headers: {
        pinata_api_key: config.apiKey,
        pinata_secret_api_key: config.secretKey,
      },
    }
  );
  if (!res.ok) throw new Error(`Pinata list failed: ${res.statusText}`);
  const data = await res.json();
  const images = (data.rows as PinataPin[]).filter(
    (pin) => pin.mime_type && pin.mime_type.startsWith("image/")
  );
  return images.slice(0, limit);
}

export async function uploadSharedMetadata(
  name: string,
  description: string,
  imageCID: string,
  config: PinataConfig
): Promise<string> {
  const metadata = {
    name,
    description,
    image: `ipfs://${imageCID}`,
  };

  return uploadMetadataToIPFS(metadata, config);
}
