// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./marketplace_datatype.sol";

/**
 * @dev Required interface of an marketplace contract
 */
interface IOSNFTMarketPlace is IOSNFTMarketPlaceDataType {
    function listNFTOnSale(SellListingInput calldata sellData) external;

    function removeNFTSale(bytes32 tokenId) external;

    function buyNFT(bytes32 sellId, uint32 share, uint256 price) external;

    function updateNFTOnSale(
        bytes32 sellId,
        SellUpdateInput calldata sellData
    ) external;

    function getNFTFromSale(
        bytes32 sellId
    ) external view returns (SellListing memory);

    function addPayableToken(address token) external;

    function removePayableToken(address token) external;

    function isPayableToken(address token) external view returns (bool);

    function createAuctionMeta(
        address to,
        AuctionListingInput calldata input
    ) external;

    function listNFTOnSaleMeta(
        address to,
        SellListingInput calldata sellData
    ) external;
}
