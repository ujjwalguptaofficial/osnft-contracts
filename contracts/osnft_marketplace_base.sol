// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/marketplace.sol";
import "./interfaces/erc721_upgradable.sol";
import "./interfaces/erc721_receiver_upgradable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./string_helper.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract OSNFTMarketPlaceBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTMarketPlaceUpgradeable,
    IERC721ReceiverUpgradeable,
    EIP712Upgradeable,
    ReentrancyGuardUpgradeable
{
    using StringHelper for bytes32;
    using ECDSAUpgradeable for bytes32;

    // tokenId -> { shareOwner: Listing }
    mapping(bytes32 => SellListing) private _sellListings;

    mapping(address => bool) private _erc20TokensAllowed;

    IERC721Upgradeable private _nftContract;

    uint8 internal _marketPlaceRoyality;

    mapping(bytes32 => SellAuction) _auctions;

    uint64 internal _sellPriorityConstant;

    address _nativeCoinAddress;

    function getRoyality() external view returns (uint8) {
        return _marketPlaceRoyality;
    }

    function setRoyality(uint8 value) external onlyOwner {
        _marketPlaceRoyality = value;
    }

    function listNFTOnSaleMeta(
        SignatureMeta calldata signatureData,
        SellListingInput calldata sellData
    ) external {
        require(block.timestamp < signatureData.deadline, "Signature expired");

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "NFTListOnSaleData(bytes32 tokenId,uint32 share,uint256 price,address erc20token,uint32 sellPriority,uint256 deadline)"
                    ),
                    sellData.tokenId,
                    sellData.share,
                    sellData.price,
                    sellData.paymentToken,
                    sellData.sellPriority,
                    signatureData.deadline
                )
            )
        );
        require(
            ECDSAUpgradeable.recover(digest, signatureData.signature) ==
                signatureData.to,
            "Invalid signature"
        );

        _listNFTOnSale(
            SellListing({
                paymentToken: sellData.paymentToken,
                share: sellData.share,
                price: sellData.price,
                tokenId: sellData.tokenId,
                sellPriority: sellData.sellPriority,
                seller: signatureData.to
            })
        );
    }

    function listNFTOnSale(SellListingInput calldata sellData) external {
        _listNFTOnSale(
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

    function _listNFTOnSale(SellListing memory sellData) internal {
        bytes32 tokenId = sellData.tokenId;
        address seller = sellData.seller;

        bytes32 sellId = _getSellId(tokenId, seller);

        //  should not be listed before
        _requireNotListed(sellId);

        // should be owner
        _requireNftOwner(tokenId, seller, sellData.share);

        _listItem(sellData);

        emit NFTSaleAdded(
            tokenId,
            seller,
            sellId,
            sellData.share,
            sellData.price,
            sellData.paymentToken,
            sellData.sellPriority
        );
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

    /**
     * @dev Initializes the contract
     */
    function __MarketPlace_init(
        address nft_,
        address nativeCoinAddress_
    ) internal onlyInitializing {
        _nftContract = IERC721Upgradeable(nft_);
        _marketPlaceRoyality = 2;
        _sellPriorityConstant = 1000000000000000; // 10^15 - allows sell Priority to be 1000 in one OSD
        __EIP712_init("OSNFT_MARKETPLACE", "1");
        _nativeCoinAddress = nativeCoinAddress_;
    }

    function _requireNotListed(bytes32 sellId) internal view {
        SellListing memory listing = _sellListings[sellId];
        require(listing.price <= 0, "Already on sale");
    }

    function _requireListed(
        bytes32 sellId
    ) internal view returns (SellListing memory) {
        SellListing memory listing = _sellListings[sellId];
        require(listing.price > 0, "Require NFT listed");
        return listing;
    }

    function _requireListedStorage(
        bytes32 sellId
    ) internal view returns (SellListing storage) {
        SellListing storage listing = _sellListings[sellId];
        require(listing.price > 0, "Require NFT listed");
        return listing;
    }

    function _requireNftOwner(
        bytes32 tokenId,
        address spender,
        uint32 share
    ) internal view {
        if (_nftContract.isShareToken(tokenId)) {
            require(share > 0, "Require input share to be above zero");
            uint32 shareOfOwner = _nftContract.shareOf(tokenId, spender);
            require(shareOfOwner >= share, "Owns less share than input");
        } else {
            address owner = _nftContract.ownerOf(tokenId);
            require(spender == owner, "Require NFT ownership");
        }
    }

    function buyNFT(
        bytes32 sellId,
        uint32 share,
        uint256 price
    ) external nonReentrant {
        address buyer = _msgSender();
        SellListing memory listedItem = _requireListed(sellId);

        bytes32 tokenId = listedItem.tokenId;
        bool isShareToken = listedItem.share > 0;
        if (isShareToken) {
            require(
                share <= listedItem.share,
                "Input share is greater than listed"
            );

            price = price * share;
        }
        require(price >= listedItem.price, "Price not met");

        if (isShareToken) {
            // will no overflow  as input share is already checked
            // share will be always less than or equal to stored share
            unchecked {
                _sellListings[sellId].share -= share;
            }
        } else {
            delete (_sellListings[sellId]);
        }

        _processNFTSell(
            NftSellData({
                tokenId: tokenId,
                share: share,
                buyer: buyer,
                seller: listedItem.seller,
                price: price,
                paymentToken: listedItem.paymentToken,
                sellType: SELL_TYPE.Buy
            })
        );

        emit NFTBought(buyer, tokenId, price, share);
    }

    function removeNFTSale(bytes32 sellId) external {
        // nft should be listed
        SellListing memory listing = _requireListed(sellId);

        // should be owner
        _requireNftOwner(listing.tokenId, _msgSender(), listing.share);

        delete _sellListings[sellId];
        emit NftSaleCanceled(sellId, listing.tokenId, _msgSender());
    }

    function updateNFTOnSale(
        bytes32 sellId,
        SellUpdateInput calldata sellData
    ) external {
        SellListing storage listedNft = _requireListedStorage(sellId);

        address seller = _msgSender();

        // should be owner
        // if update allowed other than owner,
        // then someone can change price or something
        _requireNftOwner(listedNft.tokenId, seller, listedNft.share);

        require(sellData.price > 0, "Price must be above zero");

        _requirePayableToken(sellData.paymentToken);

        listedNft.share = sellData.share;
        listedNft.price = sellData.price;
        listedNft.paymentToken = sellData.paymentToken;

        // osd is official coin so no chance of reentrancy attack
        _takePaymentForSellPriority(
            sellData.sellPriority - listedNft.sellPriority,
            seller
        );
        // setting sellPriority after taking payments
        listedNft.sellPriority = sellData.sellPriority;

        _sellListings[sellId] = listedNft;

        emit NFTSaleUpdated(
            sellId,
            sellData.share,
            sellData.price,
            sellData.paymentToken,
            sellData.sellPriority
        );
    }

    function updateSellPriorityOnSale(
        bytes32 sellId,
        uint32 sellPriority
    ) external {
        SellListing storage listedNft = _requireListedStorage(sellId);

        address seller = _msgSender();

        // should be owner
        // if update allowed other than owner,
        // then someone can change price or something
        _requireNftOwner(listedNft.tokenId, seller, listedNft.share);

        _takePaymentForSellPriority(
            sellPriority - listedNft.sellPriority,
            seller
        );
        listedNft.sellPriority = sellPriority;

        emit NFTSaleSellPriorityUpdated(sellId, sellPriority);
    }

    function getNFTFromSale(
        bytes32 sellId
    ) external view returns (SellListing memory) {
        return _sellListings[sellId];
    }

    function createAuctionMeta(
        SignatureMeta calldata signatureData,
        AuctionListingInput calldata input
    ) external {
        require(block.timestamp < signatureData.deadline, "Signature expired");

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "NFTAuctionData(bytes32 tokenId,uint32 share,uint256 initialBid,uint256 endAuction,address paymentToken,uint32 sellPriority,uint256 deadline)"
                    ),
                    input.tokenId,
                    input.share,
                    input.initialBid,
                    input.endAuction,
                    input.paymentToken,
                    input.sellPriority,
                    signatureData.deadline
                )
            )
        );
        require(
            ECDSAUpgradeable.recover(digest, signatureData.signature) ==
                signatureData.to,
            "Invalid signature"
        );

        _createAuction(input, signatureData.to);
    }

    function createAuction(AuctionListingInput calldata input) external {
        _createAuction(input, _msgSender());
    }

    function _createAuction(
        AuctionListingInput calldata input,
        address seller
    ) internal {
        // Check if the endAuction time is valid
        require(
            input.endAuction > block.timestamp,
            "Invalid end date for auction"
        );

        // Check if the initial bid price is > 0
        require(input.initialBid > 0, "Require bid price above zero");

        bytes32 tokenId = input.tokenId;

        _requireNftOwner(tokenId, seller, input.share);

        _requireTokenApproved(tokenId);

        bytes32 auctionId = _getSellId(tokenId, seller);

        // not listed for sells
        _requireNotListed(auctionId);

        _requirePayableToken(input.paymentToken);

        // Lock NFT in Marketplace contract
        _nftContract.safeTransferFrom(
            seller,
            address(this),
            input.tokenId,
            input.share
        );

        if (input.sellPriority > 0) {
            _requirePayment(
                _nativeCoinAddress,
                seller,
                address(this),
                input.sellPriority * _sellPriorityConstant
            );
        }

        // add auction to list
        _auctions[auctionId] = SellAuction({
            tokenId: tokenId,
            share: input.share,
            seller: seller,
            paymentToken: input.paymentToken,
            currentBidOwner: address(0),
            currentBidPrice: input.initialBid,
            endAuction: input.endAuction,
            bidCount: 0
        });

        // Trigger event and return index of new auction
        emit NewAuction(
            tokenId,
            seller,
            auctionId,
            input.share,
            input.initialBid,
            input.endAuction,
            input.paymentToken,
            input.sellPriority
        );
    }

    function isAuctionOpen(bytes32 auctionId) public view returns (bool) {
        SellAuction storage auction = _auctions[auctionId];
        return auction.endAuction > block.timestamp;
    }

    function getBidOwner(bytes32 auctionId) external view returns (address) {
        SellAuction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidOwner;
    }

    function getBidPrice(bytes32 auctionId) external view returns (uint256) {
        SellAuction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidPrice;
    }

    function placeBid(
        bytes32 auctionId,
        uint256 bidAmount
    ) external nonReentrant {
        _requireAuctioned(auctionId);
        SellAuction storage auction = _auctions[auctionId];

        // check if auction is still open
        require(isAuctionOpen(auctionId), "Auction is not open");

        // check if new bid price is higher than the current one
        require(
            bidAmount > auction.currentBidPrice,
            "New bid price must be higher than current bid"
        );

        address newBidder = _msgSender();

        // check if new bider is not the owner
        require(
            newBidder != auction.seller,
            "Creator of auction cannot place new bid"
        );

        // transfer token from new bider account to the marketplace account
        // to lock the tokens

        _requirePayment(
            auction.paymentToken,
            newBidder,
            address(this),
            bidAmount
        );

        // new bid is valid so must refund the current bid owner (if there is one!)
        if (auction.bidCount > 0) {
            _requireTransferFromMarketplace(
                auction.currentBidOwner,
                auction.currentBidPrice,
                auction.paymentToken
            );
        }

        // update auction info

        auction.currentBidOwner = newBidder;
        auction.currentBidPrice = bidAmount;
        auction.bidCount++;

        emit NewBidOnAuction(auctionId, bidAmount);
    }

    function claimNFT(bytes32 auctionId) external nonReentrant {
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        // Get auction
        SellAuction memory auction = _auctions[auctionId];

        delete _auctions[auctionId];

        _processNFTSell(
            NftSellData({
                tokenId: auction.tokenId,
                share: auction.share,
                buyer: auction.currentBidOwner,
                seller: auction.seller,
                price: auction.currentBidPrice,
                paymentToken: auction.paymentToken,
                sellType: SELL_TYPE.Bid
            })
        );

        emit NFTClaimed(
            auctionId,
            auction.tokenId,
            auction.share,
            auction.currentBidPrice,
            auction.paymentToken
        );
    }

    function refundAuction(bytes32 auctionId) external {
        SellAuction memory auction = _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        require(
            auction.currentBidOwner == address(0),
            "Bider exist for this auction"
        );

        delete _auctions[auctionId];

        // Transfer NFT back from marketplace contract
        // to the creator of the auction
        _nftContract.transferFrom(
            address(this),
            auction.seller,
            auction.tokenId,
            auction.share
        );

        emit NFTRefunded(auctionId, auction.tokenId, auction.share);
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

    function onERC721Received(
        address operator,
        address from,
        bytes32 tokenId,
        uint32 share,
        bytes calldata data
    ) external pure returns (bytes4) {
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }

    function _requirePayableToken(address payableToken) internal view {
        require(isPayableToken(payableToken), "Invalid payment token");
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

    function _takePaymentForSellPriority(
        uint32 sellPriority,
        address seller
    ) internal {
        // osd is official coin so no chance of reentrancy attack
        if (sellPriority > 0) {
            _requirePayment(
                _nativeCoinAddress,
                seller,
                address(this),
                sellPriority * _sellPriorityConstant
            );
        }
    }

    function _listItem(SellListing memory sellData) internal {
        require(sellData.price > 0, "Price must be above zero");

        _requirePayableToken(sellData.paymentToken);

        _requireTokenApproved(sellData.tokenId);

        bytes32 sellId = _getSellId(sellData.tokenId, sellData.seller);

        _takePaymentForSellPriority(sellData.sellPriority, sellData.seller);

        _sellListings[sellId] = sellData;
    }

    function _percentageOf(
        uint256 value,
        uint8 percentage
    ) internal pure returns (uint256) {
        // will overflow only if value is zero
        // percentage is greather than 100 - which comes from nft contract
        unchecked {
            return (value / 100) * percentage;
        }
    }

    function _processNFTSell(NftSellData memory sellData) internal {
        address seller = sellData.seller;

        bool isBuySell = sellData.sellType == SELL_TYPE.Buy;
        address nftOwner = isBuySell ? seller : address(this);

        uint256 price = sellData.price;
        bytes32 nftId = sellData.tokenId;

        address paymentToken = sellData.paymentToken;

        // transfer price amount from buyer to marketplace
        // in case of BID - amount is already taken to marketplace
        if (isBuySell) {
            _requirePayment(paymentToken, sellData.buyer, address(this), price);
        }

        // transfer nft from owner to buyer
        _nftContract.safeTransferFrom(
            nftOwner,
            sellData.buyer,
            nftId,
            sellData.share
        );

        address tokenCreator = _nftContract.creatorOf(nftId);

        uint256 amountForMarketplace = _percentageOf(
            price,
            _marketPlaceRoyality
        );
        uint256 amountForSeller = price - amountForMarketplace;

        if (seller != tokenCreator && !_nftContract.isShareToken(nftId)) {
            uint8 percentageOfCreator = _nftContract.creatorCut(nftId);
            if (percentageOfCreator > 0) {
                uint256 amountForCreator = _percentageOf(
                    price,
                    percentageOfCreator
                );

                // will not oveflow/ underflow
                // no underflow - amount for creator will be always less than amountForSeller
                // no overflow as substraction and amountForCreator will be always positive as uint
                unchecked {
                    amountForSeller = amountForSeller - amountForCreator;
                }

                // transfer creator money
                _requireTransferFromMarketplace(
                    tokenCreator,
                    amountForCreator,
                    paymentToken
                );
            }
        }

        // transfer seller money
        _requireTransferFromMarketplace(seller, amountForSeller, paymentToken);
    }

    function _requirePayment(
        address tokenAddress,
        address from,
        address to,
        uint256 price
    ) internal {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        require(paymentToken.transferFrom(from, to, price), "Payment failed");
    }

    function _getSellId(
        bytes32 nftId,
        address seller
    ) internal pure returns (bytes32) {
        // encodePacked can have hashed collision with multiple arguments,
        // encode is safe
        return keccak256(abi.encode(nftId, seller));
    }

    function _requireAuctioned(
        bytes32 auctionId
    ) internal view returns (SellAuction memory) {
        SellAuction memory auction = _auctions[auctionId];
        require(auction.currentBidPrice > 0, "No auction found");
        return auction;
    }

    function _requireTransferFromMarketplace(
        address to,
        uint256 amount,
        address tokenAddress
    ) internal {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        require(paymentToken.transfer(to, amount), "Payment failed");
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
