
// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import 'stl-contracts/royalty/DerivedERC2981Royalty.sol';
import { ERC5169 } from "stl-contracts/ERC/ERC5169.sol";

contract PomPoms is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, Ownable, ERC5169, DerivedERC2981Royalty {
    uint256 private _nextTokenId;
    address private _royaltyRecipient;
    address private _dvpContract;

    mapping (uint256 => uint256) private _nftPrices;

    constructor(address dvpContract)
        ERC721("Chloes Crafty Pom Poms", "CCPP")
        Ownable(msg.sender)
    {
        _setRoyalty(10 * 100); // 10% royalty fee 
        _royaltyRecipient = msg.sender;
        _dvpContract = dvpContract;
    }

    function safeMint(uint256 nftPrice, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _nftPrices[tokenId] = nftPrice;
    }

    function royaltyInfo(
		uint256 tokenId,
		uint256 salePrice
	)
		external
		view
		virtual
		override
		returns (address receiver, uint256 royaltyAmount)
	{
		_requireOwned(tokenId);
		receiver = address(_royaltyRecipient);
		royaltyAmount = (_getRoyalty() * salePrice) / 10000;
	}

    function dvpBurn(uint256 tokenId) public {
        //burn can only be called from the DVP contract
        require(msg.sender == _dvpContract, "Can only be called from the DVP contract");

        // Call the parent function to perform the actual burn
        super.burn(tokenId);
    }

    function burn(uint256 tokenId) public pure override {
        tokenId; // solhint-disable-line no-unused-vars
        revert("Call refund from the DVP contract to burn");
    }

    function isApprovedForAll(address owner, address operator) public override(ERC721, IERC721) view returns (bool) {
        return (operator == _dvpContract) || super.isApprovedForAll(owner, operator);
    }

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

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC5169, DerivedERC2981Royalty) returns (bool) {
        return
            ERC5169.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId) ||
            ERC721.supportsInterface(interfaceId) ||
            DerivedERC2981Royalty.supportsInterface(interfaceId) ||
            ERC721URIStorage.supportsInterface(interfaceId);
    }
}
