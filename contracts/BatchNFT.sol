// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BatchNFT is ERC721A, ERC2981, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) ERC721A(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function mintBatch(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 500, "quantity must be 1-500");
        _mint(to, quantity);
    }

    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }
}
