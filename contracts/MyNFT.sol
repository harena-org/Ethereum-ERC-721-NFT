// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721A, Ownable {
    string private _sharedTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory sharedTokenURI
    ) ERC721A(name, symbol) Ownable(msg.sender) {
        _sharedTokenURI = sharedTokenURI;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 500, "quantity must be 1-500");
        _mint(to, quantity);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        return _sharedTokenURI;
    }
}
