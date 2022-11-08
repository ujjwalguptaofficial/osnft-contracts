// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

/**
 * @dev Required interface of an marketplace contract
 */
interface IOSNFTMarketPlaceUpgradeable {
    struct Listing {
        uint256 price;
        address seller;
        uint32 share;
        address payableTokenAddress;
    }

    // Structure to define auction properties
    struct Auction {
        bytes32 tokenId;
        uint32 share;
        address seller;
        address paymentTokenAddress; // Address of the ERC20 Payment Token contract
        address currentBidOwner; // Address of the highest bider
        uint256 currentBidPrice; // Current highest bid for the auction
        uint256 endAuction; // Timestamp for the end day&time of the auction
        uint256 bidCount; // Number of bid placed on the auction
    }

    enum SELL_TYPE {
        Buy,
        Bid
    }

    struct NftSellData {
        bytes32 tokenId;
        uint32 share;
        address seller;
        address paymentTokenAddress;
        address buyer;
        uint256 price;
        SELL_TYPE sellType;
    }

    event ItemListed(
        address indexed seller,
        bytes32 indexed tokenId,
        uint32 indexed share,
        uint256 price
    );

    event ItemCanceled(address indexed seller, bytes32 indexed tokenId);

    event ItemBought(
        address indexed buyer,
        bytes32 indexed tokenId,
        uint256 price
    );

    error PriceNotMet(bytes32 tokenId, uint256 price);
    error ItemNotForSale(address nftAddress, bytes32 tokenId);
    error NotListed(address nftAddress, bytes32 tokenId);
    error AlreadyListed(address nftAddress, bytes32 tokenId);
    error NoProceeds();
    error NotOwner();
    error NotApprovedForMarketplace();
    error PriceMustBeAboveZero();

    function listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external;

    function cancelListing(bytes32 tokenId) external;

    function buyItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address seller
    ) external;

    function updateListing(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external;

    function getListing(bytes32 tokenId, address seller)
        external
        view
        returns (Listing memory);

    function addPayableToken(address token) external;

    function removePayableToken(address token) external;

    function isPayableToken(address token) external view returns (bool);
}
