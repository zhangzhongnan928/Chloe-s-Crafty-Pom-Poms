
//DVP contract needs to 

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

interface GenericNFT {
    function safeMint(address to, uint256 tokenId) external;
    function dvpBurn(uint256 tokenId) external;
} 

contract ShippingDvP is Ownable {

    // shipping DvP handles points

    uint256 public constant PLATFORM_FEE_FACTOR = 2 * 1000;
    uint256 public constant ESCROW_VALUE_FACTOR = 686 * 100; // (70% of 98%)
    uint256 public constant INITIAL_PAYMENT_FACTOR = 294 * 100; // (30% of 98%)
    uint256 constant _FEE_DECIMALS = 100 * 1000;
    uint256 private constant UINT256_MAX = type(uint256).max;
    uint32  public constant SHORTEST_EXPIRY = 60 * 30; // Half hour

    uint256 constant POINTS_PER_SALE = 10;
    uint256 constant POINTS_PER_PURCHASE = 2;
    uint256 constant POINTS_SELLER_COMPLETION = 20;
    uint256 constant POINTS_PURCHASER_COMPLETION = 5;
    uint256 constant POINTS_RESALE_SELLER = 5;
    uint256 constant POINTS_RESALE_BUYER = 2;

    uint256 private _platformEarnings;
    address private _megabucks;
    address private _shippingReceipt;
    address private _refundReceipt;

    struct NFTEntry {
        address deliverer;      // account of receiver of delivery funds
        address seller;         // current owner of token (receipent of sale or re-sale funds)
        address tokenContract;  // NFT info
        uint256 tokenId;
        uint256 nftPrice;   // current listed price of NFT
        uint256 escrowValue;// send funds to delivery address on goods completion
        uint256 entryIndex; // entry into DVP contract listing index
        uint32  expiryBlockTime; // Blocktime for expiry
    }

    struct NFTDelivery {
        uint256 tokenId;
        uint256 escrowValue;
        string shippingAddress;
        uint256 shippingFeePaid;
    }

    struct ShippingInstruction {
        string shippingAddress;
        uint256 shippingFeePaid;
    }

    // mapping of escrows
    mapping (bytes32 => NFTEntry) public _escrowEntries;
    mapping (address => uint256[]) public _nftListings;
    mapping (bytes32 => bool) public _deliveryComplete;
    mapping (address => bytes32[]) private _forDelivery;

    mapping (bytes32 => ShippingInstruction) private _shippingAddresses; //TODO: Remove and move to secure chat system

    // mapping of points
    mapping (address => uint256) private _points;

    event PurchaseNFT(address indexed seller, address indexed purchaser, address indexed nftContract, uint tokenId, uint256 nftPrice);
    event ResaleNFT(address indexed seller, address indexed purchaser, address indexed nftContract, uint256 nftPrice);
    event CompleteDelivery(address indexed seller, address indexed purchaser, address indexed nftContract, uint256 tokenId);
    event RefundPurchase(address indexed refundee, address indexed nftContract, uint256 tokenId, uint256 refundValue);
    event ListForResale(address indexed seller, address indexed sender, address indexed nftContract, uint256 tokenId, uint256 newNftPrice);
    event MarkForDeliver(address indexed nftContract, uint256 tokenId, uint256 shippingCost);

    constructor(address megabucksContract, address shippingReceipt, address refundReceipt)
        Ownable(msg.sender)
    {
        _megabucks = megabucksContract;
        _shippingReceipt = shippingReceipt;
        _refundReceipt = refundReceipt;
    }

    function getEntryHash(address tokenContract, uint256 tokenId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenContract, tokenId));
    }

    // TODO: extra set of functions for NFT without any hooks

    // 1. DvP contract takes ownership of NFT
    // TODO: This should be an attestation system with optional timeout
    function listToDVP(address tokenContract, uint256 tokenId, uint256 tokenPrice, uint32 expiryTime) public {
        bytes32 entryHash = getEntryHash(tokenContract, tokenId);
        NFTEntry memory nftEntry = _escrowEntries[entryHash];
        address nftOwner = IERC721(tokenContract).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Must own NFT to list");
        require(tokenPrice > 0, "Token price must be non-zero"); // set miniumum price?
        require(tokenPrice < UINT256_MAX, "Price too high");
        require(_deliveryComplete[entryHash] == false, "Cannot list completed NFT");
        require(nftEntry.nftPrice != UINT256_MAX, "Cannot list token marked for Delivery");
        require(expiryTime == 0 || expiryTime > uint32(block.timestamp) + SHORTEST_EXPIRY, "Expiry too soon");
        //IERC721(tokenContract).transferFrom(msg.sender, address(this), tokenId);

        //Does the token already have an entry?
        
        if (nftEntry.escrowValue > 0) { // already listed
            //since this NFT has already been listed in the DVP we only need to update the ownership and nftPrice
            _escrowEntries[entryHash].nftPrice = tokenPrice;
            _escrowEntries[entryHash].seller = msg.sender;
            _escrowEntries[entryHash].entryIndex = _nftListings[tokenContract].length;
            emit ListForResale(nftEntry.seller, msg.sender, tokenContract, tokenId, tokenPrice);
        } else {
            // first listing
            nftEntry = NFTEntry(msg.sender, msg.sender, tokenContract, tokenId, tokenPrice, 0, _nftListings[tokenContract].length, expiryTime);
            _escrowEntries[entryHash] = nftEntry;
        }
        
        _nftListings[tokenContract].push(tokenId);
        
        // Do not give points - points are awarded for double ended interactions.
    }

    //2. Purchase NFT from DVP - called by buyer
    //   If first purchase:
    //   - DvP receives 2% platform fee
    //   - DvP receives 70% remaining escrow (68.6%)
    //   - NFT collection owner receives remaining 30% (29.4%)
    //
    //   If purchase from re-list:
    //   - DvP receives 2% platform fee
    //   - Adjust NFT price on entry (which would still exist to hold the 70% Delivery escrow)
    //   - seller gets remainder 98% of fee
    function purchaseNFT(address tokenContract, uint256 tokenId) public {
        //first locate NFT
        bytes32 entryHash = getEntryHash(tokenContract, tokenId);
        NFTEntry memory nftEntry = _escrowEntries[entryHash];
        require(nftEntry.seller != address(0) && nftEntry.nftPrice > 0, "Not available");
        require(nftEntry.expiryBlockTime == 0 || nftEntry.expiryBlockTime > uint32(block.timestamp), "Listing Expired");

        // already pre-approved transfer of the ERC20 megabucks
        uint256 platformFee = nftEntry.nftPrice * PLATFORM_FEE_FACTOR / _FEE_DECIMALS;
        uint256 remainder = nftEntry.nftPrice - platformFee; //goes to seller immediately
        uint256 escrowValue = 0;
        
        if (nftEntry.escrowValue == 0) {
            //first purchase, NFT owner get 30% of remainder, plus set Escrow value
            escrowValue = nftEntry.nftPrice * ESCROW_VALUE_FACTOR / _FEE_DECIMALS;
            remainder -= escrowValue;
        }

        //update NFTEntry, to avoid re-entrancy
        _escrowEntries[entryHash].nftPrice = 0;
        _escrowEntries[entryHash].seller = address(0);

        // take platform fee and escrow if required
        SafeERC20.safeTransferFrom(IERC20(_megabucks), msg.sender, address(this), platformFee + escrowValue);
        // payment to seller
        SafeERC20.safeTransferFrom(IERC20(_megabucks), msg.sender, nftEntry.seller, remainder);
        // transfer ownership of NFT from current owner
        IERC721(tokenContract).transferFrom(nftEntry.seller, msg.sender, tokenId);

        // finally the state changes 

        _platformEarnings += platformFee;

        if (escrowValue > 0) {
            _escrowEntries[entryHash].escrowValue = escrowValue; //only need to set for first purchase
        }

        // remove from listing (no need to change index value)
        delete _nftListings[tokenContract][nftEntry.entryIndex];

        _points[msg.sender] += POINTS_PER_PURCHASE;
        _points[nftEntry.seller] += POINTS_PER_SALE;

        emit PurchaseNFT(nftEntry.seller, msg.sender, tokenContract, tokenId, nftEntry.nftPrice);
    }

    //2.5 purchase via attestation


    //3. Commit to delivery of physical goods
    //   - initiate delivery: burn NFT, Issue delivery receipt, flag to deliverer the delivery address
    //   - cannot put address onchain. How to specify delivery? For stage 1, write the delivery address onchain. Move to secure comms.
    //   - shipping cost is calculated from the API, can be independently checked
    function deliver(address tokenContract, uint256 tokenId, string memory deliveryAddress, uint256 shippingCost) public {
        bytes32 entryHash = getEntryHash(tokenContract, tokenId);
        NFTEntry memory nftEntry = _escrowEntries[entryHash];

        require(nftEntry.escrowValue > 0, "Not available for delivery");
        require(nftEntry.nftPrice != UINT256_MAX, "Already listed for delivery");

        address nftOwner = IERC721(tokenContract).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Must own NFT to authorise delivery"); //this check ensures the NFT was purchased

        //change status of DVP to 'in delivery'; issue Shipping receipt when shipping has been done
        //step 1: simulate sending delivery address
        //step 2: use secure comms to send delivery address

        // mark delivery request
        _escrowEntries[entryHash].nftPrice = UINT256_MAX; // marked for delivery (note at this point, there's no entry in the listing table)

        _shippingAddresses[entryHash] = ShippingInstruction(deliveryAddress, shippingCost);
        _escrowEntries[entryHash].entryIndex = _forDelivery[nftEntry.deliverer].length;
        _forDelivery[nftEntry.deliverer].push(entryHash);

        //after state changes, transfer delivery fee
        SafeERC20.safeTransferFrom(IERC20(_megabucks), msg.sender, nftEntry.deliverer, shippingCost);
        
        emit MarkForDeliver(tokenContract, tokenId, shippingCost);

        //must now burn the token to avoid it being listed
        GenericNFT(tokenContract).dvpBurn(tokenId);

        //Delivery Receipt NFT mint. This should have a status change (we can get this from listing). TokenId is the hash of the original NFT
        GenericNFT(_shippingReceipt).safeMint(nftOwner, uint256(entryHash));
    }

    //4. Delivery complete, called from current owner of NFT
    function deliveryComplete(uint256 tokenId) public {
        bytes32 entryHash = bytes32(tokenId);//getEntryHash(tokenContract, tokenId);
        NFTEntry memory nftEntry = _escrowEntries[entryHash];

        require(nftEntry.nftPrice == UINT256_MAX, "Not out for delivery");

        address nftOwner = IERC721(_shippingReceipt).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Must own NFT to authorise receipt of physical goods");

        //Mark delivery complete and complete the transaction

        _points[nftEntry.deliverer] += POINTS_SELLER_COMPLETION;
        _points[nftOwner] += POINTS_PURCHASER_COMPLETION;

        emit CompleteDelivery(nftEntry.deliverer, nftOwner, msg.sender, tokenId);
        delete _escrowEntries[entryHash];
        delete _shippingAddresses[entryHash];
        _deliveryComplete[entryHash] = true;
        // remove from _forDelivery
        delete _forDelivery[nftEntry.deliverer][nftEntry.entryIndex];

        // - perform DVP, complete payment
        SafeERC20.safeTransferFrom(IERC20(_megabucks), address(this), nftEntry.deliverer, nftEntry.escrowValue);
    }

    //5. Handle refund of purchase, called after a burn so msg.sender will be the NFT contract
    //   Called directly by owner.
    function refund(address tokenContract, uint256 tokenId) public {
        bytes32 entryHash = getEntryHash(tokenContract, tokenId);
        NFTEntry memory nftEntry = _escrowEntries[entryHash];

        address nftOwner = IERC721(tokenContract).ownerOf(tokenId);
        require(nftOwner == msg.sender, "Must own NFT to get refund");

        // refund to current owner
        SafeERC20.safeTransferFrom(IERC20(_megabucks), address(this), nftOwner, nftEntry.escrowValue);

        //send refund receipt
        GenericNFT(_refundReceipt).safeMint(nftOwner, tokenId);

        //Burn NFT
        GenericNFT(tokenContract).dvpBurn(tokenId);

        //no points
        emit RefundPurchase(nftOwner, tokenContract, tokenId, nftEntry.escrowValue);
        delete _escrowEntries[entryHash];
        delete _shippingAddresses[entryHash];
    }   

    function collectPlatformFee() public onlyOwner {
        SafeERC20.safeTransfer(IERC20(_megabucks), owner(), _platformEarnings);
    }

    //get listings
    function getCurrentListings(address tokenContract) public view returns (NFTEntry[] memory entries) {
        //form array of tokenIds
        uint256[] memory tokenIds = _nftListings[tokenContract];

        //now form the array
        entries = new NFTEntry[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            bytes32 entryHash = getEntryHash(tokenContract, tokenIds[i]);
            entries[i] = _escrowEntries[entryHash];
        }
    }

    function getCurrentDeliveries(address tokenContract, address seller) public view returns (NFTDelivery[] memory deliveries) {
        //form array of tokenIds
        bytes32[] memory deliveryHashes = _forDelivery[seller];

        uint256 resultLength = 0;

        // first pass: detemine number of entries
        for (uint256 i = 0; i < deliveryHashes.length; i++) {
            NFTEntry memory thisEntry = _escrowEntries[deliveryHashes[i]];
            if (thisEntry.deliverer == seller && thisEntry.tokenContract == tokenContract) { 
                resultLength++; 
            }
        }

        //now form the array
        deliveries = new NFTDelivery[](resultLength);
        uint256 thisDeliveryIndex = 0;

        // Second pass: populate return array
        for (uint256 i = 0; i < deliveryHashes.length; i++) {
            NFTEntry memory thisEntry = _escrowEntries[deliveryHashes[i]];
            if (thisEntry.deliverer == seller && thisEntry.tokenContract == tokenContract) {
                deliveries[thisDeliveryIndex] = NFTDelivery(thisEntry.tokenId, thisEntry.escrowValue, 
                _shippingAddresses[deliveryHashes[i]].shippingAddress, _shippingAddresses[deliveryHashes[i]].shippingFeePaid);
                thisDeliveryIndex++;
            }
        }
    }

    function getPlatformPoints(address user) public view returns (uint256) {
        return _points[user];
    }

    //Should this service have a facility to return fees by the owner?
}
