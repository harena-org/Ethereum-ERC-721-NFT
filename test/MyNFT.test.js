const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyNFT", function () {
  let nft, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    nft = await MyNFT.deploy("TestNFT", "TNFT", "ipfs://QmTestHash/");
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await nft.name()).to.equal("TestNFT");
      expect(await nft.symbol()).to.equal("TNFT");
    });

    it("should set deployer as owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("mintBatch", function () {
    it("should mint specified quantity to address", async function () {
      await nft.mintBatch(owner.address, 10);
      expect(await nft.balanceOf(owner.address)).to.equal(10);
    });

    it("should assign sequential token IDs starting from 1", async function () {
      await nft.mintBatch(owner.address, 3);
      expect(await nft.ownerOf(1)).to.equal(owner.address);
      expect(await nft.ownerOf(2)).to.equal(owner.address);
      expect(await nft.ownerOf(3)).to.equal(owner.address);
    });

    it("should revert when called by non-owner", async function () {
      await expect(
        nft.connect(other).mintBatch(other.address, 1)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should handle large batch (500)", async function () {
      await nft.mintBatch(owner.address, 500);
      expect(await nft.balanceOf(owner.address)).to.equal(500);
    });
  });

  describe("tokenURI", function () {
    it("should return baseURI + tokenId", async function () {
      await nft.mintBatch(owner.address, 1);
      expect(await nft.tokenURI(1)).to.equal("ipfs://QmTestHash/1");
    });

    it("should revert for non-existent token", async function () {
      await expect(nft.tokenURI(999)).to.be.revertedWithCustomError(
        nft,
        "ERC721NonexistentToken"
      );
    });
  });
});
