// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BatchNFT is ERC721, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;
    uint256 private _nextTokenId = 1;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 500, "quantity must be 1-500");
        for (uint256 i = 0; i < quantity; i++) {
            _mint(to, _nextTokenId);
            _nextTokenId++;
        }
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
