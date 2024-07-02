// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC5169} from "stl-contracts/ERC/ERC5169.sol";

contract MegaBucks is ERC20, Ownable, ERC20Permit, ERC5169 {
    mapping(address => bool) private _platformApproved;

    uint256 private constant _maxAutoApprove = type(uint256).max;
    // 1 ETH = 1M tokens
    uint256 private constant _exchangeRate = 1_000_000;

    error PaymentRequired();
    error TransferFailed();
    error EmptyBalance();

    constructor()
        ERC20("USD", "$US")
        Ownable(msg.sender)
        ERC20Permit("MegaBucks")
    { }

    function approveContract(address contractAddress) public onlyOwner {
        _platformApproved[contractAddress] = true;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    //to purchase token with ETH. 1 ETH = 1,000,000 tokens
    function purchase() public payable {
        //amount in tokens
        //calculate required value
        if (msg.value == 0) revert PaymentRequired();
        uint256 tokenCount = msg.value * _exchangeRate;
        //transfer tokens
        _mint(msg.sender, tokenCount);
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return
            _platformApproved[spender]
                ? _maxAutoApprove
                : super.allowance(owner, spender);
    }

    function _authorizeSetScripts(
        string[] memory
    ) internal view override(ERC5169) onlyOwner {
        // require(msg.sender == owner(), "You do not have the authority to set the script URI");
    }

    function drainETH() public onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert EmptyBalance();

        (bool success, ) = msg.sender.call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC5169) returns (bool) {
        return
            ERC5169.supportsInterface(interfaceId) ||
            interfaceId == type(IERC20).interfaceId;
    }
}
