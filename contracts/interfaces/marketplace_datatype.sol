// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

/**
 * @dev Required interface of an marketplace contract
 */
interface IOSNFTMarketPlaceDataType {
    struct SellListingInput {
        uint256 tokenId;
        uint256 price;
        uint32 share;
        address paymentToken;
        uint32 sellPriority;
    }

    struct AuctionListingInput {
        uint256 tokenId;
        uint256 initialBid;
        uint32 share;
        address paymentToken;
        uint32 sellPriority;
        uint256 endAuction;
    }

    struct SellUpdateInput {
        uint256 price;
        address paymentToken;
        uint32 sellPriority;
    }

    struct SellListing {
        uint256 price;
        address seller;
        uint32 share;
        address paymentToken;
        uint256 tokenId;
        uint32 sellPriority;
        uint256 sellTimestamp;
    }

    struct SignatureMeta {
        bytes signature;
        address to;
        uint256 deadline;
    }

    // Structure to define auction properties
    struct SellAuction {
        uint256 tokenId;
        uint32 share;
        address seller;
        address paymentToken; // Address of the ERC20 Payment Token contract
        address currentBidOwner; // Address of the highest bider
        uint256 currentBidPrice; // Current highest bid for the auction
        uint256 endAuction; // Timestamp for the end day&time of the auction
        uint256 sellTimestamp;
        uint32 sellPriority;
    }

    enum SELL_TYPE {
        Buy,
        Bid
    }

    struct SellData {
        uint256 tokenId;
        uint32 share;
        address seller;
        address paymentToken;
        address buyer;
        uint256 price;
        SELL_TYPE sellType;
    }

    event Sell(
        bytes32 indexed sellId,
        uint256 price,
        address paymentToken,
        uint32 sellPriority
    );

    event SellUpdate(
        bytes32 indexed sellId,
        uint256 price,
        address paymentToken,
        uint32 sellPriority,
        uint256 sellTimestamp
    );

    event SellPriorityUpdate(
        bytes32 indexed sellId,
        uint32 sellPriority,
        uint256 sellTimestamp
    );

    event SellCancel(
        bytes32 indexed auctionId,
        uint256 indexed tokenId,
        address canceledBy,
        uint256 sellTimestamp
    );

    event Sold(
        bytes32 indexed sellId,
        uint256 price,
        address seller,
        uint256 sellTimestamp
    );

    // Public event to notify that a new auction has been created
    event Auction(
        bytes32 indexed auctionId,
        uint256 bidPrice,
        uint256 endAuction,
        address paymentToken,
        uint32 sellPriority
    );

    // Public event to notify that a new bid has been placed
    event Bid(
        bytes32 auctionId,
        address bidder,
        uint256 bidAmount,
        uint256 sellTimestamp
    );

    // Public event to notify that winner of an
    // auction claim for his reward
    event Claim(
        bytes32 indexed auctionId,
        uint256 price,
        address seller,
        uint256 sellTimestamp
    );

    // Public event to notify that an NFT has been refunded to the
    // creator of an auction
    event Refund(bytes32 indexed auctionId, uint256 sellTimestamp);
}
