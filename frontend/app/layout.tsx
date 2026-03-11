import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFT Minting Tool",
  description: "Deploy and batch mint ERC-721 NFTs on Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
