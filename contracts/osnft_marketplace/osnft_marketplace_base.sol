// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../string_helper.sol";
import "../interfaces/osnft.sol";
import "../interfaces/marketplace.sol";
import "../interfaces/erc721_receiver_upgradable.sol";

contract OSNFTMarketPlaceBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTMarketPlaceDataType,
    IERC721ReceiverUpgradeable,
    ReentrancyGuardUpgradeable
{
    using StringHelper for bytes32;

    mapping(bytes32 => SellListing) internal _sellListings;

    mapping(address => bool) internal _erc20TokensAllowed;

    IOSNFT internal _nftContract;

    uint8 internal _marketPlaceRoyality;

    mapping(bytes32 => SellAuction) _auctions;

    uint64 internal _sellPriorityConstant;

    address internal _nativeCoinAddress;

    address internal _relayerAddress;

    function _listOnSale(SellListing memory sellData) internal {
        bytes32 tokenId = sellData.tokenId;
        address seller = sellData.seller;

        bytes32 sellId = _getSellId(tokenId, seller);

        //  should not be listed before
        _requireNotListed(sellId);

        // should be owner
        _transferNFT(seller, address(this), tokenId, sellData.share);

        _listItem(sellData);

        emit Sell(
            tokenId,
            seller,
            sellId,
            sellData.share,
            sellData.price,
            sellData.paymentToken,
            sellData.sellPriority
        );
    }

    function _buyNFT(
        address buyer,
        bytes32 sellId,
        uint32 share,
        uint256 price
    ) internal {
        SellListing memory listedItem = _requireListed(sellId);

        bytes32 tokenId = listedItem.tokenId;

        require(
            price >= listedItem.price,
            "require_price_above_equal_sell_price"
        );

        uint256 totalPrice = price;

        if (listedItem.share > 0) {
            require(
                share <= listedItem.share,
                "require_input_share_less_equal_sell_share"
            );

            totalPrice = price * share;

            // will not underflow  as input share is already checked
            // share will be always less than or equal to stored share
            SellListing storage listedSell = _sellListings[sellId];
            unchecked {
                listedSell.share -= share;
            }
            if (listedSell.share == 0) {
                delete (_sellListings[sellId]);
            }
        } else {
            delete (_sellListings[sellId]);
        }

        _processNFTSell(
            SellData({
                tokenId: tokenId,
                share: share,
                buyer: buyer,
                seller: listedItem.seller,
                price: totalPrice,
                paymentToken: listedItem.paymentToken,
                sellType: SELL_TYPE.Buy
            })
        );

        emit Sold(sellId, price);
    }

    /**
     * @dev Initializes the contract
     */
    function __MarketPlace_init(
        address nft_,
        address nativeCoinAddress_
    ) internal onlyInitializing {
        _nftContract = IOSNFT(nft_);
        _marketPlaceRoyality = 2;
        _sellPriorityConstant = 1000000000000000; // 10^15 - allows sell Priority to be 1000 in one OSD
        _nativeCoinAddress = nativeCoinAddress_;
    }

    function _requireNotListed(bytes32 sellId) internal view {
        SellListing memory listing = _sellListings[sellId];
        require(listing.price == 0, "already_on_sale");
    }

    function _requireListed(
        bytes32 sellId
    ) internal view returns (SellListing memory) {
        SellListing memory listing = _sellListings[sellId];
        require(listing.price > 0, "require_on_sale");
        return listing;
    }

    function _requireListedStorage(
        bytes32 sellId
    ) internal view returns (SellListing storage) {
        SellListing storage listing = _sellListings[sellId];
        require(listing.price > 0, "require_on_sale");
        return listing;
    }

    function _requireSeller(bytes32 sellId, address seller) internal view {
        SellListing memory listing = _sellListings[sellId];
        require(listing.seller == seller, "require_caller_tobe_seller");
    }

    function _requireNftOwner(
        bytes32 tokenId,
        address spender,
        uint32 share
    ) internal view {
        if (_nftContract.isShareToken(tokenId)) {
            require(share > 0, "require_input_share_above_zero");
            uint32 shareOfOwner = _nftContract.shareOf(tokenId, spender);
            require(
                shareOfOwner >= share,
                "require_owner_share_above_equal_input"
            );
        } else {
            address owner = _nftContract.ownerOf(tokenId);
            require(share == 0, "require_input_share_zero");
            require(spender == owner, "require_nft_owner");
        }
    }

    function _requireRelayer() internal view {
        require(_msgSender() == _relayerAddress, "invalid_relayer");
    }

    function _createAuction(
        AuctionListingInput calldata input,
        address seller
    ) internal {
        // Check if the endAuction time is valid
        require(input.endAuction > block.timestamp, "invalid_end_auction");

        // Check if the initial bid price is > 0
        require(input.initialBid > 0, "require_bidprice_above_zero");

        bytes32 tokenId = input.tokenId;

        _requireNftOwner(tokenId, seller, input.share);

        _requireTokenApproved(tokenId);

        bytes32 auctionId = _getSellId(tokenId, seller);

        // not listed for sells
        _requireNotListed(auctionId);

        _requirePayableToken(input.paymentToken);

        // Lock NFT in Marketplace contract
        _transferNFT(seller, address(this), input.tokenId, input.share);

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
            currentBidPrice: input.share > 0
                ? input.initialBid * input.share
                : input.initialBid,
            endAuction: input.endAuction
        });

        // Trigger event and return index of new auction
        // tokenid, seller, share can be get from transfer event of NFT
        emit Auction(
            auctionId,
            input.initialBid,
            input.endAuction,
            input.paymentToken,
            input.sellPriority
        );
    }

    function _transferNFT(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share
    ) internal {
        _nftContract.safeTransferFrom(from, to, tokenId, share);
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

    function _isPayableToken(address token) internal view returns (bool) {
        return _erc20TokensAllowed[token];
    }

    function _requirePayableToken(address payableToken) internal view {
        require(_isPayableToken(payableToken), "invalid_payment_token");
    }

    function _requireTokenApproved(bytes32 tokenId) internal view {
        // token should be approved for marketplace, so that it can transfer to buyer
        // in case of osnft, it won't happen but let's add this

        require(
            _nftContract.isApprovedForAll(_msgSender(), address(this)) ||
                _nftContract.getApproved(tokenId) == address(this),
            "require_nft_transfer_approval"
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
        require(sellData.price > 0, "require_price_above_zero");

        _requirePayableToken(sellData.paymentToken);

        // _requireTokenApproved(sellData.tokenId);

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

    function _processNFTSell(SellData memory sellData) internal {
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
        _transferNFT(nftOwner, sellData.buyer, nftId, sellData.share);

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
        require(paymentToken.transferFrom(from, to, price), "payment_failed");
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
        require(auction.currentBidPrice > 0, "no_auction_found");
        return auction;
    }

    function _requireTransferFromMarketplace(
        address to,
        uint256 amount,
        address tokenAddress
    ) internal {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        require(paymentToken.transfer(to, amount), "payment_failed");
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
