// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/marketplace.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/erc721_upgradable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./string_helper.sol";

contract OSNFTMarketPlaceBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTMarketPlaceUpgradeable,
    ReentrancyGuardUpgradeable
{
    using StringHelper for bytes32;

    // tokenId -> { shareOwner: Listing }
    mapping(bytes32 => mapping(address => Listing)) private _sellListings;

    mapping(address => bool) private _erc20TokensAllowed;

    IERC721Upgradeable private _nftContract;

    /**
     * @dev Initializes the contract
     */
    function __MarketPlace_init__(address nft_) internal onlyInitializing {
        _nftContract = IERC721Upgradeable(nft_);
    }

    function _requireNotListed(bytes32 tokenId, address shareOwner)
        internal
        view
    {
        Listing memory listing = _sellListings[tokenId][shareOwner];
        require(listing.price <= 0, "already listed");
    }

    function _requireListed(bytes32 tokenId, address shareOwner) internal view {
        Listing memory listing = _sellListings[tokenId][shareOwner];
        require(listing.price > 0, "not listed");
    }

    function _requireNftOwner(bytes32 tokenId, address spender) internal view {
        if (_nftContract.isShareToken(tokenId)) {
            require(
                _nftContract.shareOf(tokenId, spender) > 0,
                "not share owner"
            );
        } else {
            address owner = _nftContract.ownerOf(tokenId);
            require(spender == owner, "not owner");
        }
    }

    function addPayableToken(address token) external onlyOwner {
        _erc20TokensAllowed[token] = true;
    }

    function removePayableToken(address token) external onlyOwner {
        delete _erc20TokensAllowed[token];
    }

    function isPayableToken(address token) public view returns (bool) {
        return _erc20TokensAllowed[token];
    }

    function listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external {
        //  should not be listed before
        _requireNotListed(tokenId, _msgSender());

        // should be owner
        _requireNftOwner(tokenId, _msgSender());

        _listItem(tokenId, share, price, erc20token);
    }

    function _requirePayableToken(address payableToken) internal view {
        require(isPayableToken(payableToken), "token is not payable");
    }

    function _requireTokenApproved(bytes32 tokenId) internal view {
        // token should be approved for marketplace, so that it can transfer to buyer
        // in case of osnft, it won't happen but let's add this

        require(
            _nftContract.isApprovedForAll(_msgSender(), address(this)) ||
                _nftContract.getApproved(tokenId) == address(this),
            "Require NFT ownership transfer approval"
        );
    }

    function _listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address paymentTokenAddress
    ) internal {
        require(price > 0, "Price must be above zero");

        _requirePayableToken(paymentTokenAddress);

        _requireTokenApproved(tokenId);

        _sellListings[tokenId][_msgSender()] = Listing(
            price,
            _msgSender(),
            share,
            paymentTokenAddress
        );
    }

    function cancelListing(bytes32 tokenId) external {
        // should be owner
        _requireNftOwner(tokenId, _msgSender());
        // nft should be listed
        _requireListed(tokenId, _msgSender());

        delete (_sellListings[tokenId][_msgSender()]);
        emit ItemCanceled(_msgSender(), tokenId);
    }

    function buyItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address seller
    ) external nonReentrant {
        address buyer = _msgSender();
        _requireListed(tokenId, seller);

        Listing memory listedItem = _sellListings[tokenId][seller];
        if (price < listedItem.price) {
            revert PriceNotMet(tokenId, listedItem.price);
        }

        delete (_sellListings[tokenId][seller]);
        _nftContract.safeTransferFrom(
            listedItem.seller,
            seller,
            tokenId,
            share
        );

        ERC20Upgradeable erc20Token = ERC20Upgradeable(
            listedItem.payableTokenAddress
        );

        erc20Token.transferFrom(buyer, seller, price);

        emit ItemBought(_msgSender(), tokenId, listedItem.price);
    }

    function updateListing(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external {
        _requireListed(tokenId, _msgSender());
        _listItem(tokenId, share, price, erc20token);
        emit ItemListed(_msgSender(), tokenId, share, price);
    }

    function getListing(bytes32 tokenId, address seller)
        external
        view
        returns (Listing memory)
    {
        return _sellListings[tokenId][seller];
    }

    // Structure to define auction properties
    struct Auction {
        bytes32 tokenId;
        address seller;
        address paymentTokenAddress; // Address of the ERC20 Payment Token contract
        address currentBidOwner; // Address of the highest bider
        uint256 currentBidPrice; // Current highest bid for the auction
        uint256 endAuction; // Timestamp for the end day&time of the auction
        uint256 bidCount; // Number of bid placed on the auction
    }

    mapping(bytes32 => Auction) _auctions;

    // Public event to notify that a new auction has been created
    event NewAuction(
        bytes32 indexed tokenId,
        address seller,
        uint256 bidPrice,
        uint256 endAuction
    );

    // Public event to notify that a new bid has been placed
    event NewBidOnAuction(bytes32 tokenId, uint256 bidAmount);

    // Public event to notif that winner of an
    // auction claim for his reward
    event NFTClaimed(bytes32 auctionid, bytes32 tokenId);

    // Public event to notify that an NFT has been refunded to the
    // creator of an auction
    event NFTRefunded(bytes32 auctionid, bytes32 tokenId);

    function createAuction(
        bytes32 _nftId,
        uint32 share,
        uint256 _initialBid,
        uint256 _endAuction,
        address _addressPaymentToken
    ) external {
        // Check if the endAuction time is valid
        require(_endAuction > block.timestamp, "Invalid end date for auction");

        // Check if the initial bid price is > 0
        require(_initialBid > 0, "Invalid initial bid price");

        address seller = _msgSender();

        _requireNftOwner(_nftId, seller);

        _requireTokenApproved(_nftId);

        // not listed for sells
        _requireNotListed(_nftId, seller);

        _requirePayableToken(_addressPaymentToken);

        // Lock NFT in Marketplace contract
        _nftContract.safeTransferFrom(seller, address(this), _nftId, share);

        //Casting from address to address payable
        address payable currentBidOwner = payable(address(0));

        // Create new Auction object
        Auction memory newAuction = Auction({
            tokenId: _nftId,
            seller: seller,
            paymentTokenAddress: _addressPaymentToken,
            currentBidOwner: currentBidOwner,
            currentBidPrice: _initialBid,
            endAuction: _endAuction,
            bidCount: 0
        });

        bytes32 auctionId = keccak256(
            abi.encodePacked(_nftId.toString(), seller)
        );

        // add auction to list
        _auctions[auctionId] = newAuction;

        // Trigger event and return index of new auction
        emit NewAuction(_nftId, currentBidOwner, _initialBid, _endAuction);
    }

    function isAuctionOpen(bytes32 auctionId) public view returns (bool) {
        Auction storage auction = _auctions[auctionId];
        return auction.endAuction > block.timestamp;
    }

    function _requireAuctioned(bytes32 auctionId)
        internal
        view
        returns (Auction memory)
    {
        Auction memory auction = _auctions[auctionId];
        require(auction.currentBidPrice > 0, "No auction found");
        return auction;
    }

    function getCurrentBidOwner(bytes32 auctionId)
        public
        view
        returns (address)
    {
        Auction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidOwner;
    }

    function getCurrentBid(bytes32 auctionId) public view returns (uint256) {
        Auction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidPrice;
    }

    function bid(bytes32 auctionId, uint256 bidAmount) external {
        _requireAuctioned(auctionId);
        Auction storage auction = _auctions[auctionId];

        // check if auction is still open
        require(isAuctionOpen(auctionId), "Auction is not open");

        // check if new bid price is higher than the current one
        require(
            bidAmount > auction.currentBidPrice,
            "New bid price must be higher than the current bid"
        );

        address buyer = _msgSender();

        // check if new bider is not the owner
        require(
            buyer != auction.seller,
            "Creator of the auction cannot place new bid"
        );

        // get ERC20 token contract
        ERC20Upgradeable paymentToken = ERC20Upgradeable(
            auction.paymentTokenAddress
        );

        // new bid is better than current bid!

        // transfer token from new bider account to the marketplace account
        // to lock the tokens
        require(
            paymentToken.transferFrom(buyer, address(this), bidAmount),
            "Tranfer of token failed"
        );

        // new bid is valid so must refund the current bid owner (if there is one!)
        if (auction.bidCount > 0) {
            paymentToken.transfer(
                auction.currentBidOwner,
                auction.currentBidPrice
            );
        }

        // update auction info
        address payable newBidOwner = payable(msg.sender);
        auction.currentBidOwner = newBidOwner;
        auction.currentBidPrice = bidAmount;
        auction.bidCount++;

        emit NewBidOnAuction(auctionId, bidAmount);
    }

    function claimNFT(bytes32 auctionId) external {
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        // Get auction
        Auction storage auction = _auctions[auctionId];

        delete _auctions[auctionId];

        // Transfer NFT from marketplace contract
        // to the winner address
        _nftContract.transferFrom(
            address(this),
            auction.currentBidOwner,
            auction.tokenId
        );

        // Get ERC20 Payment token contract
        ERC20Upgradeable paymentToken = ERC20Upgradeable(
            auction.paymentTokenAddress
        );
        // Transfer locked token from the marketplace
        // contract to the auction creator address
        paymentToken.transfer(auction.seller, auction.currentBidPrice);

        emit NFTClaimed(auctionId, auction.tokenId);
    }

    function refund(bytes32 auctionId) external {
        delete _auctions[auctionId];
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        // Get auction
        Auction storage auction = _auctions[auctionId];

        require(
            auction.currentBidOwner == address(0),
            "Bider exist for this auction"
        );

        // Transfer NFT back from marketplace contract
        // to the creator of the auction
        _nftContract.transferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        emit NFTRefunded(auctionId, auction.tokenId);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
