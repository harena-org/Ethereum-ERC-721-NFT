// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MyNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;
    string private _sharedTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory sharedTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _sharedTokenURI = sharedTokenURI;
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        for (uint256 i = 0; i < quantity; i++) {
            _mint(to, _nextTokenId);
            _nextTokenId++;
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _sharedTokenURI;
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }
}
