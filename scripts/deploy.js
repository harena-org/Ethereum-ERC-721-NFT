const { ethers } = require("hardhat");

async function main() {
  const name = process.env.NFT_NAME || "MyNFT";
  const symbol = process.env.NFT_SYMBOL || "MNFT";
  const baseURI = process.env.BASE_URI || "ipfs://placeholder/";

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy(name, symbol, baseURI);
  await nft.waitForDeployment();

  console.log(`MyNFT deployed to: ${await nft.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
