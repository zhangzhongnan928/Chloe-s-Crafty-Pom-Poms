const { ethers } = require("hardhat");
// const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
// import { ContractTransaction} from 'ethers';

// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
// import { Contract} from "ethers";
// import exp from "constants";
import {
	loadFixture,
	time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Signature } from "ethers";
// import { populate } from 'dotenv';

const PermitType = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ];

const ERC20_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "ECDSAInvalidSignature",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "length",
          "type": "uint256"
        }
      ],
      "name": "ECDSAInvalidSignatureLength",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "ECDSAInvalidSignatureS",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "allowance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientAllowance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSpender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        }
      ],
      "name": "ERC2612ExpiredSignature",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "signer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "ERC2612InvalidSigner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EmptyBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "currentNonce",
          "type": "uint256"
        }
      ],
      "name": "InvalidAccountNonce",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidShortString",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "PaymentRequired",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "str",
          "type": "string"
        }
      ],
      "name": "StringTooLong",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "TransferFailed",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "EIP712DomainChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "name": "ScriptUpdate",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DOMAIN_SEPARATOR",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "contractAddress",
          "type": "address"
        }
      ],
      "name": "approveContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "drainETH",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "eip712Domain",
      "outputs": [
        {
          "internalType": "bytes1",
          "name": "fields",
          "type": "bytes1"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "version",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "chainId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "verifyingContract",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        },
        {
          "internalType": "uint256[]",
          "name": "extensions",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "nonces",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "v",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "r",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "permit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "purchase",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "scriptURI",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string[]",
          "name": "newScriptURI",
          "type": "string[]"
        }
      ],
      "name": "setScriptURI",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

async function signPermit(signer:any, tokenAddress:string, spenderAddress:string, value:bigint, deadline:number) {
const chainId = (await ethers.provider.getNetwork()).chainId

const permitMessage = {
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      
    },
    domain: {
      name: 'MegaBucks',
      version: '1',
      chainId , 
      verifyingContract: tokenAddress,
    },
    message: {
      owner: signer.address,
      spender: spenderAddress,
      value: value,
      nonce: await getNonce(tokenAddress, signer.address), // Replace with the actual nonce
      deadline, // 1 hour from now
    },
  };
  
  // Sign the permit message with the owner's wallet
  const signature = await signer.signTypedData(permitMessage.domain, permitMessage.types, permitMessage.message);
  
  const sig = ethers.Signature.from(signature)
  // Extract the v, r, and s components from the signature
  const { v, r, s } = sig

    return {
      v,
      r,
      s,
      deadline,
    };
  }
  
  // Function to build Permit Domain Separator
  async function buildPermitDomain(tokenAddress:string, chainId:number) {
    const domain = {
      name: 'MegaBucks',
      version: '1',
      chainId,
      verifyingContract: tokenAddress,
    };
    
    return { domain, types: { Permit: PermitType } };
  }
  
  // Function to get the current nonce for an address (replace if needed)
  async function getNonce(tokenAddress:string, address:string) {
    // const ERC20 = new ethers.Contract(tokenAddress, ERC20_ABI, ethers.provider); // Replace with ERC20 ABI
    const ERC20 = (await ethers.getContractFactory("MegaBucks")).attach(tokenAddress);

    return await ERC20.nonces(address);
  }


const EXCHANGE_RATE = 1_000_000n;
async function deployInitialFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, otherAccount2] = await ethers.getSigners();

    const MegaBucks = (await ethers.getContractFactory("MegaBucks")).connect(
        owner
    );
    const megaBucks = await MegaBucks.deploy();
    await megaBucks.waitForDeployment();

    const Refund = (await ethers.getContractFactory("Refund")).connect(owner);
    const refund = await Refund.deploy();
    await refund.waitForDeployment();

    const Shipping = (await ethers.getContractFactory("Shipping")).connect(
        owner
    );
    const shipping = await Shipping.deploy();
    await shipping.waitForDeployment();

    const ShippingDvP = (
        await ethers.getContractFactory("ShippingDvP")
    ).connect(owner);

    const shippingDvP = await ShippingDvP.deploy(
        megaBucks.target,
        shipping.target,
        refund.target
    );
    await shippingDvP.waitForDeployment();

    const PomPoms = (await ethers.getContractFactory("PomPoms")).connect(owner);

    const pomPoms = await PomPoms.deploy(shippingDvP.target);
    await pomPoms.waitForDeployment();

    return {
        owner,
        otherAccount,
        otherAccount2,
        megaBucks,
        refund,
        shipping,
        shippingDvP,
        pomPoms,
    };
}

describe("PomPoms", function () {

	it("mint", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);

		await expect(pomPoms.connect(owner).safeMint())
			.to.emit(pomPoms, "Transfer")
			.withArgs(ethers.ZeroAddress, owner.address, 1);
		expect(await pomPoms.royaltyInfo(1, 20000)).to.deep.eq([
			owner.address,
			2000,
		]);
        expect(await pomPoms.royaltyInfo(0, 20000)).to.deep.eq([
			owner.address,
			2000,
		]);

        // expect(await pomPoms.tokenURI(0)).to.eq("123");

	});
	it("burn", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("dvpburn", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("set shipping status", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("setDVP", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("safeMint", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("royaltyInfo", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("dvpBurn", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("setDVP", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("supportsInterface", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("setDVP", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("setDVP", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("setDVP", async function () {
		const {
			owner,
			otherAccount,
			otherAccount2,
			megaBucks,
			refund,
			shipping,
			shippingDvP,
			pomPoms,
		} = await loadFixture(deployInitialFixture);
	});
    it("supportsInterface", async function () {
        const {
            owner,
            otherAccount,
            otherAccount2,
            megaBucks,
            refund,
            shipping,
            shippingDvP,
            pomPoms,
        } = await loadFixture(deployInitialFixture);
        const ERC20InterfaceId = "0x36372b07";
        expect(await pomPoms.supportsInterface(ERC20InterfaceId)).to.eq(false);

        const ERC721InterfaceId = "0x80ac58cd";
        expect(await pomPoms.supportsInterface(ERC721InterfaceId)).to.eq(true);

        // const _ERC4906_INTERFACE_ID = "0x49064906";
        // expect(await pomPoms.supportsInterface(_ERC4906_INTERFACE_ID)).to.eq(true);

        const _INTERFACE_ID_ERC721_METADATA = "0x5b5e139f";
        expect(await pomPoms.supportsInterface(_INTERFACE_ID_ERC721_METADATA)).to.eq(
            true
        );

        const _INTERFACE_ID_ERC721_ENUMERABLE = "0x780e9d63";
        expect(
            await pomPoms.supportsInterface(_INTERFACE_ID_ERC721_ENUMERABLE)
        ).to.eq(true);
    });
    it("5169", async function () {
        const {
            owner,
            otherAccount,
            pomPoms,
        } = await loadFixture(deployInitialFixture);

        const ERC5169InterfaceId = "0xa86517a1";

        expect((await pomPoms.scriptURI()).toString()).to.be.equal([].toString());

        expect(await pomPoms.supportsInterface(ERC5169InterfaceId)).to.eq(true);

        const scriptURI = ["uri1", "uri2", "uri3"];

        await expect(
            pomPoms.connect(otherAccount).setScriptURI(scriptURI)
        ).to.revertedWithCustomError(pomPoms, "OwnableUnauthorizedAccount");
        await expect(pomPoms.connect(owner).setScriptURI(scriptURI))
            .emit(pomPoms, "ScriptUpdate")
            .withArgs(scriptURI);

        expect((await pomPoms.scriptURI()).toString()).to.be.equal(
            scriptURI.toString()
        );
    });

});

describe("MegaBucks", function () {
    it("mint onlyOwner", async function () {
        const {
            owner,
            otherAccount,
            megaBucks,
            pomPoms,
        } = await loadFixture(deployInitialFixture);
        await expect(megaBucks.connect(owner).mint(otherAccount.address, 3)).to.emit(megaBucks, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, 3);
        await expect(megaBucks.connect(otherAccount).mint(otherAccount.address, 3)).to.revertedWithCustomError(pomPoms, "OwnableUnauthorizedAccount");
    });
    it("approveContract onlyOwner, allowance", async function () {
        const {
            owner,
            otherAccount,
            otherAccount2,
            megaBucks,
            pomPoms,
        } = await loadFixture(deployInitialFixture);

        await expect(megaBucks.connect(otherAccount).approveContract(otherAccount2.address)).to.revertedWithCustomError(pomPoms, "OwnableUnauthorizedAccount");
        
        expect(await megaBucks.allowance(otherAccount.address, otherAccount2.address)).to.eq(0n);

        await megaBucks.connect(owner).approveContract(otherAccount2.address);
        
        expect(await megaBucks.allowance(otherAccount.address, otherAccount2.address)).to.eq(2n**256n-1n);
  
    });
    it("permit", async function () {
        const {
            owner,
            otherAccount,
            otherAccount2,
            megaBucks,
            pomPoms,
        } = await loadFixture(deployInitialFixture);

        const emptyWallet = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)), ethers.provider)

        // now +  60sec
        const deadline = Math.floor(Date.now() / 1000) + 60;
        const approveAmount = 100n;

        const { v, r, s } = await signPermit(emptyWallet, megaBucks.target, otherAccount.address, approveAmount, deadline);

        await megaBucks.connect(otherAccount).purchase({value: 1});

        await megaBucks.connect(otherAccount).transfer(emptyWallet, EXCHANGE_RATE);

        expect(await megaBucks.allowance(emptyWallet.address, otherAccount.address)).to.eq(0n);


        await expect(megaBucks.permit(
            emptyWallet.address, 
            otherAccount.address, 
            approveAmount, 
            deadline, 
            v, 
            r,
            s
        )).to.emit(megaBucks, "Approval");
        
        expect(await megaBucks.allowance(emptyWallet.address, otherAccount.address)).to.eq(approveAmount);
  
    });
    it("purchase payable", async function () {
        const {
            otherAccount,
            megaBucks,
        } = await loadFixture(deployInitialFixture);

        const emptyWallet = new ethers.Wallet(ethers.hexlify(ethers.randomBytes(32)), ethers.provider)
        await expect(megaBucks.connect(emptyWallet).purchase()).to.revertedWithCustomError(megaBucks, "PaymentRequired");

        expect(await megaBucks.purchase({value: 1})).to.emit(megaBucks, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, EXCHANGE_RATE);

        expect(await megaBucks.purchase({value: 4})).to.changeEtherBalance(megaBucks, 4);

        expect(await megaBucks.purchase({value: 50})).to.emit(megaBucks, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, 50n * EXCHANGE_RATE);

    });
    it("drainETH", async function () {
        const {
            owner,
            otherAccount,
            megaBucks,
        } = await loadFixture(deployInitialFixture);

        await expect( megaBucks.drainETH()).to.revertedWithCustomError(megaBucks, "EmptyBalance");
        
        expect(await megaBucks.purchase({value: 50})).to.emit(megaBucks, "Transfer").withArgs(ethers.ZeroAddress, otherAccount.address, 50n * EXCHANGE_RATE);
        
        await expect( megaBucks.connect(otherAccount).drainETH()).to.revertedWithCustomError(megaBucks, "OwnableUnauthorizedAccount");

        expect(await megaBucks.drainETH()).to.changeEtherBalances([megaBucks.address, owner.address], [-50n, 50n]);
    });
    it("supportsInterface", async function () {
        const {
            megaBucks,
        } = await loadFixture(deployInitialFixture);
        const ERC20InterfaceId = "0x36372b07";
        expect(await megaBucks.supportsInterface(ERC20InterfaceId)).to.eq(true);

        const ERC721InterfaceId = "0x80ac58cd";
        expect(await megaBucks.supportsInterface(ERC721InterfaceId)).to.eq(false);

        const _ERC4906_INTERFACE_ID = "0x49064906";
        expect(await megaBucks.supportsInterface(_ERC4906_INTERFACE_ID)).to.eq(false);

        const _INTERFACE_ID_ERC721_METADATA = "0x5b5e139f";
        expect(await megaBucks.supportsInterface(_INTERFACE_ID_ERC721_METADATA)).to.eq(
            false
        );

        const _INTERFACE_ID_ERC721_ENUMERABLE = "0x780e9d63";
        expect(
            await megaBucks.supportsInterface(_INTERFACE_ID_ERC721_ENUMERABLE)
        ).to.eq(false);
    });

    it("5169", async function () {
        const {
            owner,
            otherAccount,
            megaBucks,
        } = await loadFixture(deployInitialFixture);

        const ERC5169InterfaceId = "0xa86517a1";

        expect((await megaBucks.scriptURI()).toString()).to.be.equal([].toString());

        expect(await megaBucks.supportsInterface(ERC5169InterfaceId)).to.eq(true);

        const scriptURI = ["uri1", "uri2", "uri3"];

        await expect(
            megaBucks.connect(otherAccount).setScriptURI(scriptURI)
        ).to.revertedWithCustomError(megaBucks, "OwnableUnauthorizedAccount");
        await expect(megaBucks.connect(owner).setScriptURI(scriptURI))
            .emit(megaBucks, "ScriptUpdate")
            .withArgs(scriptURI);

        expect((await megaBucks.scriptURI()).toString()).to.be.equal(
            scriptURI.toString()
        );
    });
})
describe("Refund", function () {
    it("5169", async function () {
        const {
            owner,
            otherAccount,
            refund,
        } = await loadFixture(deployInitialFixture);

        const ERC5169InterfaceId = "0xa86517a1";

        expect((await refund.scriptURI()).toString()).to.be.equal([].toString());

        expect(await refund.supportsInterface(ERC5169InterfaceId)).to.eq(true);

        const scriptURI = ["uri1", "uri2", "uri3"];

        await expect(
            refund.connect(otherAccount).setScriptURI(scriptURI)
        ).to.revertedWithCustomError(refund, "OwnableUnauthorizedAccount");
        await expect(refund.connect(owner).setScriptURI(scriptURI))
            .emit(refund, "ScriptUpdate")
            .withArgs(scriptURI);

        expect((await refund.scriptURI()).toString()).to.be.equal(
            scriptURI.toString()
        );
    });
    it("supportsInterface", async function () {
        const {
            refund,
        } = await loadFixture(deployInitialFixture);
        const ERC20InterfaceId = "0x36372b07";
        expect(await refund.supportsInterface(ERC20InterfaceId)).to.eq(false);

        const ERC721InterfaceId = "0x80ac58cd";
        expect(await refund.supportsInterface(ERC721InterfaceId)).to.eq(true);

        const _ERC4906_INTERFACE_ID = "0x49064906";
        expect(await refund.supportsInterface(_ERC4906_INTERFACE_ID)).to.eq(false);

        const _INTERFACE_ID_ERC721_METADATA = "0x5b5e139f";
        expect(await refund.supportsInterface(_INTERFACE_ID_ERC721_METADATA)).to.eq(
            true
        );

        const _INTERFACE_ID_ERC721_ENUMERABLE = "0x780e9d63";
        expect(
            await refund.supportsInterface(_INTERFACE_ID_ERC721_ENUMERABLE)
        ).to.eq(true);
    });
    it("tokenURI", async function () {
        // TODO
    })
})

describe("Shipping", function () {
    it("5169", async function () {
        const {
            owner,
            otherAccount,
            shipping,
        } = await loadFixture(deployInitialFixture);

        const ERC5169InterfaceId = "0xa86517a1";

        expect((await shipping.scriptURI()).toString()).to.be.equal([].toString());

        expect(await shipping.supportsInterface(ERC5169InterfaceId)).to.eq(true);

        const scriptURI = ["uri1", "uri2", "uri3"];

        await expect(
            shipping.connect(otherAccount).setScriptURI(scriptURI)
        ).to.revertedWithCustomError(shipping, "OwnableUnauthorizedAccount");
        await expect(shipping.connect(owner).setScriptURI(scriptURI))
            .emit(shipping, "ScriptUpdate")
            .withArgs(scriptURI);

        expect((await shipping.scriptURI()).toString()).to.be.equal(
            scriptURI.toString()
        );
    });
    it("supportsInterface", async function () {
        const {
            shipping,
        } = await loadFixture(deployInitialFixture);
        const ERC20InterfaceId = "0x36372b07";
        expect(await shipping.supportsInterface(ERC20InterfaceId)).to.eq(false);

        const ERC721InterfaceId = "0x80ac58cd";
        expect(await shipping.supportsInterface(ERC721InterfaceId)).to.eq(true);

        const _ERC4906_INTERFACE_ID = "0x49064906";
        expect(await shipping.supportsInterface(_ERC4906_INTERFACE_ID)).to.eq(false);

        const _INTERFACE_ID_ERC721_METADATA = "0x5b5e139f";
        expect(await shipping.supportsInterface(_INTERFACE_ID_ERC721_METADATA)).to.eq(
            true
        );

        const _INTERFACE_ID_ERC721_ENUMERABLE = "0x780e9d63";
        expect(
            await shipping.supportsInterface(_INTERFACE_ID_ERC721_ENUMERABLE)
        ).to.eq(true);
    });
    it("tokenURI", async function () {
        // TODO
    })
})