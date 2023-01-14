// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

/**
 * @dev Required interface of an marketplace contract
 */
interface IOSNFTMarketPlaceDataType {
    struct SellListingInput {
        uint256 price;
        uint32 share;
        address paymentToken;
        bytes32 tokenId;
        uint32 sellPriority;
    }

    struct AuctionListingInput {
        bytes32 tokenId;
        uint32 share;
        uint256 initialBid;
        uint256 endAuction;
        address paymentToken;
        uint32 sellPriority;
    }

    struct SellUpdateInput {
        uint256 price;
        uint32 share;
        address paymentToken;
        uint32 sellPriority;
    }

    struct SellListing {
        uint256 price;
        address seller;
        uint32 share;
        address paymentToken;
        bytes32 tokenId;
        uint32 sellPriority;
    }

    struct SignatureMeta {
        bytes signature;
        address to;
        uint256 deadline;
    }

    // Structure to define auction properties
    struct SellAuction {
        bytes32 tokenId;
        uint32 share;
        address seller;
        address paymentToken; // Address of the ERC20 Payment Token contract
        address currentBidOwner; // Address of the highest bider
        uint256 currentBidPrice; // Current highest bid for the auction
        uint256 endAuction; // Timestamp for the end day&time of the auction
        uint256 bidCount; // Number of bid placed on the auction
    }

    enum SELL_TYPE {
        Buy,
        Bid
    }

    struct SellData {
        bytes32 tokenId;
        uint32 share;
        address seller;
        address paymentToken;
        address buyer;
        uint256 price;
        SELL_TYPE sellType;
    }

    event Sale(
        bytes32 indexed tokenId,
        address indexed seller,
        bytes32 indexed sellId,
        uint32 share,
        uint256 price,
        address paymentToken,
        uint32 sellPriority
    );

    event SaleUpdated(
        bytes32 indexed sellId,
        uint32 share,
        uint256 price,
        address paymentToken,
        uint32 sellPriority
    );

    event SalePriorityUpdated(bytes32 indexed sellId, uint32 sellPriority);

    event SaleCanceled(
        bytes32 indexed auctionId,
        bytes32 indexed tokenId,
        address canceledBy
    );

    event Sold(bytes32 indexed sellId, uint256 price);

    // Public event to notify that a new auction has been created
    event Auction(
        bytes32 indexed auctionId,
        uint256 bidPrice,
        uint256 endAuction,
        address paymentToken,
        uint32 sellPriority
    );

    // Public event to notify that a new bid has been placed
    event Bid(bytes32 tokenId, address bidder, uint256 bidAmount);

    // Public event to notify that winner of an
    // auction claim for his reward
    event Claimed(
        bytes32 indexed auctionId,
        uint256 price,
        address paymentToken,
        address seller
    );

    // Public event to notify that an NFT has been refunded to the
    // creator of an auction
    event Refunded(bytes32 indexed auctionId);
}
