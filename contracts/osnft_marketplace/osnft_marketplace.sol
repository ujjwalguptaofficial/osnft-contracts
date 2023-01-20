// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./osnft_marketplace_base.sol";

contract OSNFTMarketPlace is
    Initializable,
    OwnableUpgradeable,
    OSNFTMarketPlaceBase,
    IOSNFTMarketPlace
{
    function initialize(address nft, address nativeCoin_) external initializer {
        __Ownable_init();
        __MarketPlace_init(nft, nativeCoin_);
    }

    function relayer() external view returns (address) {
        return _relayerAddress;
    }

    function relayer(address relayerAddress_) external onlyOwner {
        _relayerAddress = relayerAddress_;
    }

    function getRoyality() external view returns (uint8) {
        return _marketPlaceRoyality;
    }

    function setRoyality(uint8 value) external onlyOwner {
        _marketPlaceRoyality = value;
    }

    function sellMeta(address to, SellListingInput calldata sellData) external {
        _requireRelayer();

        _listOnSale(
            SellListing({
                paymentToken: sellData.paymentToken,
                share: sellData.share,
                price: sellData.price,
                tokenId: sellData.tokenId,
                sellPriority: sellData.sellPriority,
                seller: to
            })
        );
    }

    function sell(SellListingInput calldata sellData) external {
        _listOnSale(
            SellListing({
                paymentToken: sellData.paymentToken,
                share: sellData.share,
                price: sellData.price,
                tokenId: sellData.tokenId,
                sellPriority: sellData.sellPriority,
                seller: _msgSender()
            })
        );
    }

    function addPayableToken(address token) external onlyOwner {
        _erc20TokensAllowed[token] = true;
    }

    function removePayableToken(address token) external onlyOwner {
        delete _erc20TokensAllowed[token];
    }

    function isPayableToken(address token) public view returns (bool) {
        return _isPayableToken(token);
    }

    function buyMeta(
        address buyer,
        bytes32 sellId,
        uint32 share,
        uint256 price
    ) external {
        _requireRelayer();
        _buyNFT(buyer, sellId, share, price);
    }

    function buy(bytes32 sellId, uint32 share, uint256 price) external {
        address buyer = _msgSender();
        _buyNFT(buyer, sellId, share, price);
    }

    function removeSell(bytes32 sellId) external {
        // nft should be listed
        SellListing memory listing = _requireListed(sellId);

        address seller = _msgSender();

        // should be seller
        _requireSeller(sellId, seller);

        delete _sellListings[sellId];

        _transferNFT(address(this), seller, listing.tokenId, listing.share);
        emit SellCancel(sellId, listing.tokenId, seller);
    }

    function updateSell(
        bytes32 sellId,
        SellUpdateInput calldata sellData
    ) external {
        address seller = _msgSender();

        SellListing storage listedNft = _requireListedStorage(sellId);

        // should be seller
        // if update allowed other than seller,
        // then someone can change price or something
        _requireSeller(sellId, seller);

        require(sellData.price > 0, "require_price_above_zero");

        _requirePayableToken(sellData.paymentToken);

        listedNft.price = sellData.price;
        listedNft.paymentToken = sellData.paymentToken;

        // osd is official coin so no chance of reentrancy attack
        _takePaymentForSellPriority(
            sellData.sellPriority - listedNft.sellPriority,
            seller
        );
        // setting sellPriority after taking payments
        listedNft.sellPriority = sellData.sellPriority;

        emit SellUpdate(
            sellId,
            sellData.price,
            sellData.paymentToken,
            sellData.sellPriority
        );
    }

    function setSellPriority(bytes32 sellId, uint32 sellPriority) external {
        SellListing storage listedNft = _requireListedStorage(sellId);

        address seller = _msgSender();

        // should be owner
        // if update allowed other than owner,
        // then someone can change price or something
        _requireSeller(sellId, seller);

        _takePaymentForSellPriority(
            sellPriority - listedNft.sellPriority,
            seller
        );
        listedNft.sellPriority = sellPriority;

        emit SellPriorityUpdate(sellId, sellPriority);
    }

    function getSell(bytes32 sellId) public view returns (SellListing memory) {
        return _sellListings[sellId];
    }

    function getAuction(
        bytes32 auctionId
    ) public view returns (SellAuction memory) {
        return _auctions[auctionId];
    }

    function isSellActive(bytes32 sellId) public view returns (bool) {
        if (getSell(sellId).price > 0) return true;
        return getAuction(sellId).currentBidPrice > 0;
    }

    function createAuctionMeta(
        address to,
        AuctionListingInput calldata input
    ) external {
        _requireRelayer();
        _createAuction(input, to);
    }

    function createAuction(AuctionListingInput calldata input) external {
        _createAuction(input, _msgSender());
    }

    function isAuctionOpen(bytes32 auctionId) public view returns (bool) {
        return _auctions[auctionId].endAuction > block.timestamp;
    }

    function getBidOwner(bytes32 auctionId) external view returns (address) {
        SellAuction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidOwner;
    }

    function getBidPrice(bytes32 auctionId) external view returns (uint256) {
        SellAuction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidPrice;
    }

    function placeBid(bytes32 auctionId, uint256 bidAmount) external {
        _requireAuctioned(auctionId);
        SellAuction storage auction = _auctions[auctionId];

        // check if auction is still open
        require(isAuctionOpen(auctionId), "require_auction_open");

        // check if new bid price is higher than the current one
        require(
            bidAmount > auction.currentBidPrice,
            "require_newbid_above_currentbid"
        );

        address newBidder = _msgSender();

        // check if new bider is not the owner
        require(newBidder != auction.seller, "require_bidder_not_creator");

        // transfer token from new bider account to the marketplace account
        // to lock the tokens

        _requirePayment(
            auction.paymentToken,
            newBidder,
            address(this),
            bidAmount
        );

        // new bid is valid so must refund the current bid owner (if there is one!)
        if (auction.currentBidOwner != address(0)) {
            _requireTransferFromMarketplace(
                auction.currentBidOwner,
                auction.currentBidPrice,
                auction.paymentToken
            );
        }

        // update auction info

        auction.currentBidOwner = newBidder;
        auction.currentBidPrice = bidAmount;

        emit Bid(auctionId, newBidder, bidAmount);
    }

    function claimNFT(bytes32 auctionId) external {
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "require_auction_close");

        // Get auction
        SellAuction memory auction = _auctions[auctionId];

        delete _auctions[auctionId];

        _processNFTSell(
            SellData({
                tokenId: auction.tokenId,
                share: auction.share,
                buyer: auction.currentBidOwner,
                seller: auction.seller,
                price: auction.currentBidPrice,
                paymentToken: auction.paymentToken,
                sellType: SELL_TYPE.Bid
            })
        );

        // from, to, share and token id can be extracted from transfer event of erc721
        emit Claim(
            auctionId,
            auction.currentBidPrice,
            auction.paymentToken,
            auction.seller
        );
    }

    function refundAuction(bytes32 auctionId) external {
        SellAuction memory auction = _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "require_auction_close");

        require(auction.currentBidOwner == address(0), "require_no_bidder");

        delete _auctions[auctionId];

        // Transfer NFT back from marketplace contract
        // to the creator of the auction
        _nftContract.transferFrom(
            address(this),
            auction.seller,
            auction.tokenId,
            auction.share
        );

        // tokenid, seller, share etc can be retrieved from nft contract event Transfer and TransferShare
        emit Refund(auctionId);
    }

    function withdrawEarning(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        withdrawEarningTo(owner(), tokenAddress, amount);
    }

    function withdrawEarningTo(
        address accountTo,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        _requireTransferFromMarketplace(accountTo, amount, tokenAddress);
    }
}
