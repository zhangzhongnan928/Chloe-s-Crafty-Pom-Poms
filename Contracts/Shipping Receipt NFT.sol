

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { ERC5169 } from "stl-contracts/ERC/ERC5169.sol";

contract Shipping is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ERC5169 {
    uint256 private _nextTokenId;
    address private _dvpContract;

    mapping (uint256 => uint256) private _tokenIdMapping;

    constructor()
        ERC721("Shipping Receipt", "SHPP")
        Ownable(msg.sender)
    {}

    function setDVP(address dvpContract) public onlyOwner {
        _dvpContract = dvpContract;
    } 

    function safeMint(address to, uint256 tokenId) public {
        require (msg.sender == owner() || msg.sender == _dvpContract, "Not authorized to mint");
        //uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        //_setTokenURI(tokenId, uri);
    }

    /*function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }*/

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _authorizeSetScripts(string[] memory) internal view override(ERC5169) {
		require(msg.sender == owner(), "You do not have the authority to set the script URI");
	}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC5169) returns (bool) {
        return
            ERC5169.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId) ||
            ERC721.supportsInterface(interfaceId) ||
            ERC721URIStorage.supportsInterface(interfaceId);
    }
}
