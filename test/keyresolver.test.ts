import {parseEthers} from "../EthUtils";
const { ethers, upgrades } = require('hardhat');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
import { ContractTransaction, Event, utils } from 'ethers';

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {BigNumber, Contract} from "ethers";
import exp from "constants";

const { solidityKeccak256, hexlify, toUtf8Bytes } = utils;

describe("KeyResolver.deploy", function () {
    let schemaRegistry: Contract;
    let EASContract: Contract;
    let keyResolver: Contract;
    let NFTWithAttestation: Contract;
    let keySchemaUID: string;
    let rootKey1UID: string;
    let rootKey2UID: string;

    let derivedKey1_1UID: string;
    let derivedKey2_1UID: string;
    
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let testAddr: SignerWithAddress;
    let testAddr2: SignerWithAddress;
    let deployAddr: SignerWithAddress;
    let nftUserAddr: SignerWithAddress;
    let provider: any;

    const ganacheChainId = 31337;
    const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const signedAttestation = '0x308182303c0201390c2841324344334137383045413345394446363346453630453342394546304337323046414641373432300d0204643d0c8c020500858c328c034200d6a9b48c2185d5d5325911666067bf9df835a9feadf1354d6742ca3ac71cb3400ccf07e35dde9d3a2048e7995e2d772f4b5b467bc9eec133ddd63206f6a5d2c81b';
    const signedAttestation58 = '0x308182303c02013a0c2841324344334137383045413345394446363346453630453342394546304337323046414641373432300d0204643d0c8c020500858c328c034200c4952e307bda5c651b6b4b16af054716f600b0ee767a8c1d2d229575ff173d9025dc9b3d81e97484948350e9ac3e064c9983a7ac78e9d4b48781ddf8455286c41b';
    const signedAttestation59 = '0x308182303c02013b0c2841324344334137383045413345394446363346453630453342394546304337323046414641373432300d0204643d0c8c020500858c328c0342009960535b9314b9f263b454f6e4e690c89d13bea513d5ecaf963c7648968852ed1f964c561d84e456ef94f657502f9ec141264601c543704689260fc22bef496f1b';
    const signedAttestation60 = '0x308182303c02013c0c2841324344334137383045413345394446363346453630453342394546304337323046414641373432300d0204643d0c8c020500858c328c034200cfc7317b05bca9744315f26fd0b2f300f406a47f124d6a8c9fca39095f4e2c1d247e8e84d965087c2df5d00fd467651fb49c4e501613a80a235e84c3f2dd848a1b';

     // Fake: Identifier has a different ID number, but correct signature (Twitter imposter)
    const fakeUniversalIdAttestation = '0x3082026a30820217308201c4a003020113020101300906072a8648ce3d040230193117301506035504030c0e6174746573746174696f6e2e69643022180f32303231303932363031333732375a180f39393939313233313132353935395a30393137303506092b06010401817a01390c2868747470733a2f2f747769747465722e636f6d2f7a68616e67776569777520323035353231363737308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004950c7c0bed23c3cac5cc31bbb9aad9bb5532387882670ac2b1cdf0799ab0ebc764c267f704e8fdda0796ab8397a4d2101024d24c4efff695b3a417f2ed0e48cd300906072a8648ce3d040203420066dd0460a8920709cabc1003c934d5fdfed47af4dd03b51dbaed878093152c9a4335f1eafdc7f2d20fe8dd15dcd08df8a9cc1ca76526a0e2450d80c233cbf36b1c300906072a8648ce3d04020342004ce8adbd9a9a338cd941d8838b68fbea154e02471cfe92a3a0c5559c104275be16841e4fdecff47707b9904866f78ef0d2786d51c7f3894fbbbf7c77b346cb6c1c';
    const attestationSubjectPrivateKey = '0x3C19FF5D453C7891EDB92FE70662D5E45AEF658E9F38DF9B0483F6AE2D8DE66E';
    const anyPrivateKey  = '0x2222222222222222222222222222222222222222222222222222222222222222';
    const anyPrivateKey2 = '0x2222222222222222222222222222222222222222222222222222222222222666';
    const testPrivateKey = '0x2222222222222222222222212345622222222222222222222222222222222666'; //There's no value on this guy :) ID 57 : 0xA2Cd3a780ea3E9DF63Fe60E3b9eF0C720fAfa742

    function calcContractAddress(sender: SignerWithAddress, nonce: number)
    {
        const rlp = require('rlp');
        const keccak = require('keccak');

        var input_arr = [ sender.address, nonce ];
        var rlp_encoded = rlp.encode(input_arr);

        var contract_address_long = keccak('keccak256').update(rlp_encoded).digest('hex');

        var contract_address = contract_address_long.substring(24); //Trim the first 24 characters.
        return "0x" + contract_address;
    }

    const getSchemaUID = (schema: string, resolverAddress: string, revocable: boolean) =>
        solidityKeccak256(['string', 'address', 'bool'], [schema, resolverAddress, revocable]);

    const getUIDsFromAttestEvents = (events?: Event[]): string[] => {
        if (!events) {
          return [];
        }
      
        const attestedEvents = events.filter((e) => e.event === 'Attested');
        if (attestedEvents.length === 0) {
          throw new Error('Unable to process attestation events');
        }
      
        return attestedEvents.map((event) => event.args?.uid);
      };

    const getUIDFromAttestTx = async (res: Promise<ContractTransaction> | ContractTransaction): Promise<string> => {
        const receipt = await (await res).wait();
      
        return (await getUIDsFromAttestEvents(receipt.events))[0];
    };


    it("deploy contracts", async function(){
        [owner, addr1, addr2] = await ethers.getSigners();

        testAddr = new ethers.Wallet(anyPrivateKey, owner.provider);
        testAddr2 = new ethers.Wallet(attestationSubjectPrivateKey, owner.provider); //testAddr2 address is subjectAddress
        deployAddr = new ethers.Wallet(anyPrivateKey2, owner.provider);
        nftUserAddr = new ethers.Wallet(testPrivateKey, owner.provider);

        await addr1.sendTransaction({
            to: deployAddr.address,
            value: ethers.utils.parseEther("1.0")
        });

        await addr1.sendTransaction({
            to: nftUserAddr.address,
            value: ethers.utils.parseEther("1.0")
        });

        provider = owner.provider;

        console.log("Deploy Address: " + deployAddr.address);

        //Deploy SchemaResolver
        const SchemaRegistry = await ethers.getContractFactory("SchemaRegistry");
        schemaRegistry = await SchemaRegistry.connect(deployAddr).deploy();
        await schemaRegistry.deployed();
        console.log("SchemaRegistry Addr: " + schemaRegistry.address);

        //Now Deploy EAS - need the address of SchemaRegistry
        const EAS = await ethers.getContractFactory("EAS");
        EASContract = await EAS.connect(deployAddr).deploy(schemaRegistry.address);

        console.log("EAS Addr: " + EASContract.address);

        //Now deploy the KeyResolver contract
        const KeyResolver = await ethers.getContractFactory("KeyResolver");
        keyResolver = await KeyResolver.connect(deployAddr).deploy(EASContract.address);

        console.log("Key Resolver Addr: " + keyResolver.address);

        //register our schema : register(string schema,address resolver,bool revocable)
        const schema = "string KeyDecription,bytes ASN1Key,bytes PublicKey";
        const resolver = keyResolver.address;
        const revocable = true;

        await schemaRegistry.connect(deployAddr).register(schema, resolver, revocable);

        keySchemaUID = getSchemaUID(schema, resolver, revocable);

        console.log("Key Schema UID: " + keySchemaUID);

        //let test = ethers.utils.parseBytes32String(keySchemaUID2);
        //console.log("Key Schema UID: " + test);

        //await proxyLPNFT.connect(deployAddr).reserve(15, carlaReceiveAddress);




        //deploy royalty receiver
        /*const RoyaltyReceiver = await ethers.getContractFactory("RoyaltyReceiver");
        royaltyReceiver = await RoyaltyReceiver.connect(owner).deploy(carlaReceiveAddress, charity1ReceiveAddress);
        await royaltyReceiver.deployed();
        console.log("RoyalyReceiver Addr: " + royaltyReceiver.address);

        const LPNFT = await ethers.getContractFactory("LaPrairieNFTLocalhost");
        proxyLPNFT = await upgrades.deployProxy(LPNFT.connect(deployAddr), [royaltyReceiver.address] ,{ kind: 'uups' });
        await proxyLPNFT.deployed();
        console.log("LP NFT Addr for Localhost: " + proxyLPNFT.address);

        // use this contract for MAINNET , but dont forgot to set correct addrsses for mainnet
        const LPNFTMainnet = await ethers.getContractFactory("LaPrairieNFT");
        proxyLPNFTMainnet = await upgrades.deployProxy(LPNFTMainnet.connect(deployAddr), [royaltyReceiver.address] ,{ kind: 'uups' });
        await proxyLPNFT.deployed();

        console.log("LP NFT Addr for Mainnet: " + proxyLPNFTMainnet.address);
        console.log("Owner: " + owner.address);        

        //now call init on the logic contract
        const currentProxyLogicAddress = await getImplementationAddress(provider, proxyLPNFT.address);
        console.log("[LOGIC CONTRACTS] --> logic address for LP NFT: " + currentProxyLogicAddress);
        let logicLPNFT = LPNFT.attach(currentProxyLogicAddress);
        await logicLPNFT.initialize(royaltyReceiver.address);
        console.log("[LOGIC CONTRACTS] --> initialize logic for LPNFT");

        //try init again, should fail
        await expect(logicLPNFT.initialize(royaltyReceiver.address)).to.be.revertedWith("Initializable: contract is already initialized");*/
    });

    it("Push rootkeys", async function(){
        {
            console.log("Create root key #1");

            let expirationTime: number;
            let revocable: boolean;
            let refUID: string;
            let data: any;
            //let rootKeyData: any;
            //let derivedKeyData: any;
            
            expirationTime = 0;
            revocable = true;
            refUID = '0x0000000000000000000000000000000000000000000000000000000000000000';
            data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000008526f6f744b6579310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d00000000000000000000000000000000000000000000000000000000000000000000000000000000040950c7c0bed23c3cac5cc31bbb9aad9bb5532387882670ac2b1cdf0799ab0ebc764c267f704e8fdda0796ab8397a4d2101024d24c4efff695b3a417f2ed0e48cd';
            //const data1 = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010446572697661746976654b6579322d32000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d0000000000000000000000000000000000000000000000000000000000000000000000000000000004008d4bc48bc518c82fb4ad216ef88c11068b3f0c40ba60c255f9e0a7a18382e27654eee6b2283266071567993392c1a338fa0b9f2db7aaab1ba8bf2179808dd34';

            //rootKeyData = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000008526f6f744b6579310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d00000000000000000000000000000000000000000000000000000000000000000000000000000000040950c7c0bed23c3cac5cc31bbb9aad9bb5532387882670ac2b1cdf0799ab0ebc764c267f704e8fdda0796ab8397a4d2101024d24c4efff695b3a417f2ed0e48cd';
            //derivedKeyData = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010446572697661746976654b6579322d32000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d0000000000000000000000000000000000000000000000000000000000000000000000000000000004008d4bc48bc518c82fb4ad216ef88c11068b3f0c40ba60c255f9e0a7a18382e27654eee6b2283266071567993392c1a338fa0b9f2db7aaab1ba8bf2179808dd34';


            rootKey1UID = await getUIDFromAttestTx(
                EASContract.attest({
                  schema: keySchemaUID,
                  data: {
                    recipient: deployAddr.address,
                    expirationTime,
                    revocable: true,
                    refUID: ZERO_BYTES32,
                    data,  //Why is TypeScript so shit ??! If this variable isn't called data, even 'data1' then this fails to run. If only these tests could be written in a real language. Now I just have to redeclare this var each time
                    value: 0
                  }
                })
              ); 

              console.log("Root Key #1 UID: " + rootKey1UID);

              //redeclare the value because Typescript is so lousy
              data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010446572697661746976654b6579322d32000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d0000000000000000000000000000000000000000000000000000000000000000000000000000000004008d4bc48bc518c82fb4ad216ef88c11068b3f0c40ba60c255f9e0a7a18382e27654eee6b2283266071567993392c1a338fa0b9f2db7aaab1ba8bf2179808dd34';

              //Now create a derivative key
              derivedKey1_1UID = await getUIDFromAttestTx(
                EASContract.attest({
                  schema: keySchemaUID,
                  data: {
                    recipient: deployAddr.address,
                    expirationTime,
                    revocable: true,
                    refUID: rootKey1UID,
                    data,
                    value: 0
                  }
                })
              );

              console.log("Derived Key #1 UID: " + derivedKey1_1UID);

              //PK: 
              data = '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010446572697661746976654b6579322d32000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000137308201333081ec06072a8648ce3d02013081e0020101302c06072a8648ce3d0101022100fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f3044042000000000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000000704410479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8022100fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd036414102010103420004ea4f8d88bf9738928426055abeaa127743f5512b580a59734326926592e15da057a42a40d8c6be657622d927df84988afbd4597aa98c56fe05f7d6afa38319d00000000000000000000000000000000000000000000000000000000000000000000000000000000040367bbd2f14741cdb258578a08a6670f6157b0cc6901cb48695a650cb9f4aa66af2b9d106094bbb7d6c77d920645e8587b5a2ed9b7a8731299282c13b66fa8cd3';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
              //data = '0x367bbd2f14741cdb258578a08a6670f6157b0cc6901cb48695a650cb9f4aa66af2b9d106094bbb7d6c77d920645e8587b5a2ed9b7a8731299282c13b66fa8cd3';

              derivedKey2_1UID = await getUIDFromAttestTx(
                EASContract.attest({
                  schema: keySchemaUID,
                  data: {
                    recipient: testAddr2.address,
                    expirationTime,
                    revocable: true,
                    refUID: rootKey1UID,
                    data,
                    value: 0
                  }
                })
              );

              console.log("Derived Key #2 UID: " + derivedKey2_1UID);

              //Check NFT ownership
              //await keyResolver.connect(deployAddr).ownerOf(1);
              var bal = await keyResolver.connect(deployAddr).balanceOf(testAddr2.address);

              console.log("Test Addr2 Bal: " + bal);

              //var ownerRoot1Addr = await keyResolver.ownerOf(rootKey1UID);
              //var ownerDerived1Addr = await keyResolver.ownerOf(derivedKey1_1UID);

              //console.log("Root Key #1 owner: " + ownerRoot1Addr);
              //console.log("Derived Key #1 Owner: " + ownerDerived1Addr);
        }
    });

    
    it("Mint ERC721 Using Key Attestation", async function(){
        {
            console.log("Mint Key Attestation");
            const AttestationNFT = await ethers.getContractFactory("DoorAttestation");
            NFTWithAttestation = await AttestationNFT.connect(deployAddr).deploy(rootKey1UID, EASContract.address);

            console.log("NFT Attestation: " + NFTWithAttestation.address);

            console.log("User Address: " + nftUserAddr.address);

            //let lala = await EASContract.getAttestation(rootKey1UID);
            //console.log("Attn: " + lala);
            //console.log("Root Schema: " + lala.schema);

            console.log("Attempt to mint token 57 from attestation");

            await NFTWithAttestation.connect(nftUserAddr).mintUsingAttestation(signedAttestation);

            //test balance
            var bal = await NFTWithAttestation.connect(nftUserAddr).balanceOf(nftUserAddr.address);

            console.log("Test NFT Bal for User: " + bal);

            var owner = await NFTWithAttestation.connect(nftUserAddr).ownerOf(57);

            console.log("Owner of TokenId 57: " + owner);

            //revoke key

            console.log("Attempt to mint token 58 from attestation");

            //try to mint 58
            await NFTWithAttestation.connect(nftUserAddr).mintUsingAttestation(signedAttestation58);

            var bal = await NFTWithAttestation.connect(nftUserAddr).balanceOf(nftUserAddr.address);

            console.log("Test NFT Bal for User: " + bal);

            expect(bal).to.equal(2);

            //60
            await NFTWithAttestation.connect(nftUserAddr).mintUsingAttestation(signedAttestation60);

            var bal = await NFTWithAttestation.connect(nftUserAddr).balanceOf(nftUserAddr.address);

            console.log("Test NFT Bal for User: " + bal);

            //Now revoke key #1
            /*
            struct RevocationRequestData {
    bytes32 uid; // The UID of the attestation to revoke.
    uint256 value; // An explicit ETH amount to send to the resolver. This is important to prevent accidental user errors.
            }
    
            
struct RevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData data; // The arguments of the revocation request.
}*/

            //RevocationRequest(attestation.schema, RevocationRequestData(attestation.uid, 0))
            

            //Attestation memory attn = easResolver.getAttestation(_keyUID);
            //bytes32 schema = attn.schema;

            /*let testor = await NFTWithAttestation.validd();
            console.log("Attn Detail: " + testor);


            //mint an NFT using attestation
            //await expect( nftContract.mintUsingAttestation(expiredTktAttestation)).to.be.revertedWith('Attestation not valid');
            //await expect(NFTWithAttestation.mintUsingAttestation(signedAttestation)).to.be.revertedWith("Minting has not started");
            //await KeyResolver.connect(deployAddr).deploy(EASContract.address);
            await NFTWithAttestation.connect(nftUserAddr).mintUsingAttestation(signedAttestation);

            //console.log("tx: " + tx);
            //did it work? 


            /*const mintFee = await proxyLPNFT.connect(addr1).mintFee();

            await expect(proxyLPNFT.connect(addr1).mintDirect({
                value: mintFee,
            })).to.be.revertedWith("Minting has not started");

            console.log("Reserve mint 15 NFTs");
            //test reserve limit and permissions
            await expect(proxyLPNFT.connect(addr1).reserve(400, carlaReceiveAddress)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(proxyLPNFT.connect(deployAddr).reserve(400, carlaReceiveAddress)).to.be.revertedWith("Reserve amount too high");
            //reserve 15 NFTs
            await proxyLPNFT.connect(deployAddr).reserve(15, carlaReceiveAddress);

            var nftBal = await proxyLPNFT.connect(addr1).totalSupply();

            console.log("New Supply: " + nftBal);

            //check reserved NFTs
            for (let i = 1; i < 5; i++) {
                var metadata = await proxyLPNFT.tokenURI(i);
                var ownerAddr = await proxyLPNFT.ownerOf(i);
                if (metadata.length > 0) {
                    console.log("Metadata: (" + i + ") " + metadata + "  Owner: " + ownerAddr);
                }
            }*/
        }
    });

    it("Test revocation", async function(){
        {
            await EASContract.revoke({ 
                schema: keySchemaUID,
                data: {
                  uid: derivedKey1_1UID,
                  value: 0
                }
              });

            console.log("Revoke " + derivedKey1_1UID);

            //now attempt to mint 59 
            console.log("Check that attestation can no longer be used.")
            await expect(NFTWithAttestation.connect(nftUserAddr).mintUsingAttestation(signedAttestation59)).to.be.revertedWith('Attestation issuer key not valid');
              
            var bal = await NFTWithAttestation.connect(nftUserAddr).balanceOf(nftUserAddr.address);

            console.log("Test NFT Bal for User: " + bal);

            // move some Ether to test account
            /*await addr1.sendTransaction({
                to: testAddr.address,
                value: ethers.utils.parseEther("50.0")
            });

            const mintFee = await proxyLPNFT.connect(addr1).mintFee();

            console.log("Mint Fee: " + ethers.utils.formatEther(mintFee));

            var testAddrBal = await ethers.provider.getBalance(testAddr.address);
            console.log("TestAddr Bal: " + testAddrBal);

            console.log("Attempt to mint");

            var mintNFT1 = await proxyLPNFT.connect(addr1).mint(mintAttestations[9]);

            var nftBal = await proxyLPNFT.connect(addr1).totalSupply();

            mintNFT1 = await proxyLPNFT.connect(addr1).testAttestation(mintAttestations[9]);

            console.log("Test Mint: " + mintNFT1);

            const thisTokenId = mintNFT1.tokenId;

            console.log("NFT Bal: " + nftBal);

            //check balance
            var nftOwner = await proxyLPNFT.connect(addr1).ownerOf(thisTokenId);

            console.log("Owner of LP(1): " + nftOwner);

            //expired NFT:
            await expect(proxyLPNFT.connect(addr1).mint(expiredAttestation)).to.be.revertedWith("Attestation not valid");

            //Attempt to mint again:
            await expect(proxyLPNFT.connect(addr1).mint(mintAttestations[9])).to.be.revertedWith("Attestation already used");

            console.log("Negative tests passed");

            console.log("Check interface");

            //test for Enumerable interface
            expect(await proxyLPNFT.supportsInterface("0x780e9d63")).to.eq(true);

            console.log("Now mint remaining NFTs");

            //now mint remaining NFTs
            for (let i = 0; i < 9; i++) {
                await proxyLPNFT.connect(addr1).mint(mintAttestations[i]);
            }

            var nftBal = await proxyLPNFT.connect(addr1).balanceOf(nftOwner);
            console.log("NFT Bal: " + nftBal);

            console.log("Check enumerable balance");

            for (let j = 0; j < nftBal; j++) {
                var tokenId = await proxyLPNFT.connect(addr1).tokenOfOwnerByIndex(nftOwner, j);
                console.log("NFT ID: " + tokenId);
            }*/
        }
    });

    /*it("Test royalty receiver", async function(){
        {
            expect(await proxyLPNFT.supportsInterface("0x2a55205a")).to.eq(true);
            expect(await proxyLPNFT.supportsInterface("0x2a55205b")).to.eq(false);

            //expecting royalty to be 10%

            var spendAmount = 332000;
            var expectedRoyalty = (spendAmount * 10)/100;

            let royalty = await proxyLPNFT.royaltyInfo(1, spendAmount);

            console.log("Royalty: " + royalty);

            expect(royalty.receiver.toLowerCase()).to.eq(royaltyReceiver.address.toLowerCase());
            expect(royalty.royaltyAmount).to.eq(expectedRoyalty);

            const anyPrivateKey3 = '0x2222222222222222222222222222222222222222222222222222222222222667';
            const anyPrivateKey4 = '0x2222222222222222222222222222222222222222222222222222222222222668';

            let carla = new ethers.Wallet(anyPrivateKey3, provider);
            let charity   = new ethers.Wallet(anyPrivateKey4, provider);
            let charityNumerator = 24; //24/120 (1/5th - 4/5th split - 8% to Carla, 2% to charity)
            let sum = 1;

            console.log("Transfer funds to RR");

            await addr1.sendTransaction({
                to: royaltyReceiver.address,
                value: ethers.utils.parseEther(sum.toString())
            })

            var testAddrBal = await ethers.provider.getBalance(royaltyReceiver.address);
            console.log("Receiver Bal: " + ethers.utils.formatEther(testAddrBal));

            testAddrBal = await ethers.provider.getBalance(carlaReceiveAddress);
            console.log("Carla Bal: " + testAddrBal);

            testAddrBal = await ethers.provider.getBalance(charity1ReceiveAddress);
            console.log("Charity Bal: " + testAddrBal);

            console.log("Transfer funds to RR");

            sum = 0.2;

            //send more to the receiver contract
            await addr1.sendTransaction({
                to: royaltyReceiver.address,
                value: ethers.utils.parseEther(sum.toString())
            })

            var rrBal = await ethers.provider.getBalance(royaltyReceiver.address);
            console.log("Receiver Bal: " + ethers.utils.formatEther(rrBal));

            console.log("Set Charity donation to " + (charityNumerator/120)*100 + "%");

            //set percentages
            //await royaltyReceiver.connect(owner).setReceiversData(carla.address, charity.address, charityPercentageMultiplier);

            //collect funds
            console.log("Collect Funds");

            await expect(royaltyReceiver.connect(addr1).withdrawEth()).to.be.revertedWith("Caller is not allowed");

            await royaltyReceiver.connect(owner).withdrawEth();

            testAddrBal = await ethers.provider.getBalance(carlaReceiveAddress);
            console.log("Carla Bal:   " + ethers.utils.formatEther(testAddrBal));

            const expectedCharityBal = (rrBal * charityNumerator)/120;

            expect(testAddrBal == (rrBal - expectedCharityBal)).to.eq(true);

            testAddrBal = await ethers.provider.getBalance(charity1ReceiveAddress);
            console.log("Charity Bal: " + ethers.utils.formatEther(testAddrBal));

            expect(testAddrBal == expectedCharityBal).to.eq(true);

            await expect(royaltyReceiver.connect(addr1).setReceiversData(carla.address, charity.address, charityNumerator)).to.be.revertedWith("Caller is not allowed");

            await royaltyReceiver.connect(owner).setReceiversData(carla.address, charity.address, charityNumerator);
        }
    });

    it("Test direct minting", async function(){
        {
            var testAddrBal = await ethers.provider.getBalance(testAddr.address);
            console.log("TestAddr Bal: " + testAddrBal);

            console.log("Attempt to direct mint");

            const mintFee = await proxyLPNFT.connect(addr1).mintFee();

            console.log("Mint Fee: " + ethers.utils.formatEther(mintFee));

            var transactionData = await proxyLPNFT.connect(addr1).mintDirect({
                value: mintFee,
            });

            var nftBal = await proxyLPNFT.connect(addr1).totalSupply();

            console.log("New Supply: " + nftBal);

            //incorrect mint fee
            const badMintFee = 1;

            await expect(proxyLPNFT.connect(addr1).mintDirect({
                value: badMintFee,
            })).to.be.revertedWith("Mint Fee not valid use mintFee()");

            var newBalance = await proxyLPNFT.connect(addr1).balanceOf(addr1.address);

            console.log("Addr1 Balance: " + newBalance);

            expect(await proxyLPNFT.connect(addr1).balanceOf(addr1.address)).to.eq(1);
        }
    });

    it("Test supply limit", async function(){
        {
            var testAddrBal = await ethers.provider.getBalance(testAddr.address);
            console.log("TestAddr Bal: " + testAddrBal);

            var remainingMintable = await proxyLPNFT.connect(addr1).getRemainingMintable();

            console.log("Remaining mintable: " + remainingMintable);

            //increase mintfee
            await expect(proxyLPNFT.connect(addr1).updateMintFee(ethers.utils.parseEther("0.2"))).to.be.revertedWith("Ownable: caller is not the owner");

            await proxyLPNFT.connect(deployAddr).updateMintFee(ethers.utils.parseEther("0.5"));
            
            const mintFee = await proxyLPNFT.connect(addr1).mintFee();

            console.log("Mint max tokens (mint fee: " + ethers.utils.formatEther(mintFee) + ")");

            for (let i = 0; i < remainingMintable; i++) {
                await proxyLPNFT.connect(addr1).mintDirect({
                    value: mintFee,
                });
            }

            var nftBal = await proxyLPNFT.connect(addr1).totalSupply();

            console.log("New Supply: " + nftBal);

            remainingMintable = await proxyLPNFT.connect(addr1).getRemainingMintable();

            console.log("Remaining mintable: " + remainingMintable);

            console.log("Test limit");

            await expect(proxyLPNFT.connect(addr1).mintDirect({
                value: mintFee,
            })).to.be.revertedWith("Mint limit has been reached - mint time is over");
        }
    });

    it("Test mint donations", async function(){
        {
            var testAddrBal = await ethers.provider.getBalance(testAddr.address);
            console.log("TestAddr Bal: " + testAddrBal);

            //mint count
            var nftBal = await proxyLPNFT.connect(addr1).totalSupply();
            //subtract pre-mint
            nftBal = nftBal - 20;

            var totalExpected = nftBal * 0.5;

            //var expectedCCBal = totalExpected * 0.78;
            var expectedNOMBal = (totalExpected * 1200)/10000;
            var expectedETHBal = (totalExpected * 1000)/10000;
            var expectedCCBal = totalExpected - (expectedNOMBal + expectedETHBal);

            var actualCCBal = ethers.utils.formatEther(await ethers.provider.getBalance(carlaReceiveAddress));
            var actualNOMBal = ethers.utils.formatEther(await ethers.provider.getBalance(charity2ReceiveAddress));
            var actualETHBal = ethers.utils.formatEther(await ethers.provider.getBalance(charity1ReceiveAddress));

            console.log("Actual: " + actualCCBal + " : " + actualNOMBal + " : " + actualETHBal);
            console.log("Expect: " + expectedCCBal + " : " + expectedNOMBal + " : " + expectedETHBal);

            expect(Math.abs(actualCCBal - expectedCCBal) < 0.00001, "Carla balance not correct");
            expect(Math.abs(actualNOMBal - expectedNOMBal) < 0.00001, "NOM balance not correct");
            expect(Math.abs(actualETHBal - expectedETHBal) < 0.00001, "ETH balance not correct");
        }
    });

    it("Test metadata", async function(){
        {
            var nftSupply = await proxyLPNFT.connect(addr1).totalSupply();

            console.log("Current Supply: " + nftSupply);

            var remainingMintable = await proxyLPNFT.connect(addr1).getRemainingMintable();

            console.log("Remaining mintable: " + remainingMintable);
            
            await proxyLPNFT.connect(deployAddr).updateMintFee(ethers.utils.parseEther("0.5"));

            var mintedFromAttestation = 0;

            //attempt to work out if token was minted from attestation or if token was direct minted
            for (let i = 1; i < 50; i++) {
                let ticketId = await proxyLPNFT.connect(addr1).getTicketId(i);
                let ownerAddr = await proxyLPNFT.ownerOf(i);
                if (ticketId > 0) {
                    console.log("Minted TokenID: " + i + " From TicketId: " + ticketId + " (" + ownerAddr + ")");
                    mintedFromAttestation++;
                }
                else {
                    console.log("TokenID (" + i + ") was directly minted (" + ownerAddr + ")");
                }
            }

            //should have minted 10 tokens from attestations
            expect(mintedFromAttestation == 10).to.eq(true);
            console.log("Expected 10 tokens minted from attestations: " + mintedFromAttestation);
            console.log("Metadata: " + await proxyLPNFT.tokenURI(1));

            //try metadata for tokens
            for (let i = 1; i < 20; i++) {
                var metadata = await proxyLPNFT.tokenURI(i);
                if (metadata.length > 0) {
                   expect(metadata).to.eq(correctBaseMetadata + ganacheChainId + "/" + proxyLPNFT.address.toLowerCase() + "/" + i + ".json");
                }
            }

            await expect(proxyLPNFT.connect(addr1).setTokenMetadataBaseURI(baseMetadata)).to.be.revertedWith("Ownable: caller is not the owner");

            await proxyLPNFT.connect(deployAddr).setTokenMetadataBaseURI("https://alchemynft.io/");

            for (let i = 1; i < 10; i++) {
                var metadata = await proxyLPNFT.tokenURI(i);
                if (metadata.length > 0) {
                    console.log("Metadata: (" + i + ") " + metadata);
                }
            }
        }
    });*/
});