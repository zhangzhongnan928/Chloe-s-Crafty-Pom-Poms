
// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC5169 } from "stl-contracts/ERC/ERC5169.sol";

contract MegaBucks is ERC20, Ownable, ERC20Permit, ERC5169 {

    mapping(address => bool) private _platformApproved;

    uint256 private _maxAutoApprove;
    uint256 _exchangeRate;

    constructor()
        ERC20("MegaBucks", "$MB")
        Ownable(msg.sender)
        ERC20Permit("MegaBucks")
    {
        _maxAutoApprove = type(uint256).max;
        _exchangeRate = 1_000_000; // 1 ETH = 1M tokens
    }

    function approveContract(address contractAddress) public onlyOwner {
        _platformApproved[contractAddress] = true;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    //to purchase token with ETH. 1 ETH = 1,000,000 tokens
    function purchase() public payable { //amount in tokens
        //calculate required value
        require(msg.value > 0, "Requires > 0 ETH value");
        uint256 tokenCount = msg.value * _exchangeRate;
        //transfer tokens
        _mint(msg.sender, tokenCount);
    }

    function allowance(address owner, address spender) public override view virtual returns (uint256) {
        return _platformApproved[spender] ? _maxAutoApprove : super.allowance(owner, spender);
    }

    function _authorizeSetScripts(string[] memory) internal view override(ERC5169) {
		require(msg.sender == owner(), "You do not have the authority to set the script URI");
	}

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC5169) returns (bool) {
        return
            ERC5169.supportsInterface(interfaceId);
    }
}
