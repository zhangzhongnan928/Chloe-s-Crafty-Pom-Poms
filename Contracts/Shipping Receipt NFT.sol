// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ERC5169} from "stl-contracts/ERC/ERC5169.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

interface DVP {
    function getTokenDetails(
        uint256 entryHashUint
    ) external view returns (address contractAddress, uint256 tokenId);
}

contract Shipping is ERC721, ERC721Enumerable, Ownable, ERC5169 {
    uint256 private _nextTokenId;
    address private _dvpContract;

    mapping(uint256 => uint256) private _tokenIdMapping;

    constructor() ERC721("Shipping Receipt", "SHPP") Ownable(msg.sender) {}

    function setDVP(address dvpContract) public onlyOwner {
        _dvpContract = dvpContract;
    }

    function safeMint(address to, uint256 tokenId) public {
        require(
            msg.sender == owner() || msg.sender == _dvpContract,
            "Not authorized to mint"
        );
        _safeMint(to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        string memory name = name();
        address nftContract;
        uint256 tokenId;
        (nftContract, tokenId) = DVP(_dvpContract).getTokenDetails(id);
        string memory tName = ERC721(nftContract).name();

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        abi.encodePacked(
                            '{"name": "',
                            name,
                            "",
                            '","description":"Goods have been shipped to you, use this receipt to confirm shipment.',
                            '","external_url":"https://www.smartlayer.network","image":"https://ipfs.io/ipfs/QmPzkMP4KPvrF3BkrSwK8gPTh6CuWVPV1MDi9BencFkLVv"',
                            ',"attributes":[{"trait_type":"Origin Name","value":"',
                            tName,
                            '", "trait_type":"Token ID#","value":"',
                            tokenId,
                            '"}]}'
                        )
                    )
                )
            );
    }

    function _authorizeSetScripts(
        string[] memory
    ) internal view override(ERC5169) onlyOwner {
        // require(msg.sender == owner(), "You do not have the authority to set the script URI");
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, ERC5169)
        returns (bool)
    {
        return
            ERC5169.supportsInterface(interfaceId) ||
            ERC721Enumerable.supportsInterface(interfaceId) ||
            ERC721.supportsInterface(interfaceId);
    }
}
