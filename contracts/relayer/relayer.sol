// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./relayer_base.sol";

contract OSDRelayer is OSDRelayerBase {
    constructor(address marketplace_) OSDRelayerBase(marketplace_) {}

    function listNFTOnSale(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlaceUpgradeable.SellListingInput calldata sellData
    ) external {
        _requireDeadlineNotExpired(signatureData);

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
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );

        _marketplace.listNFTOnSaleMeta(signatureData.to, sellData);
    }

    function createAuction(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlaceUpgradeable.AuctionListingInput calldata input
    ) external {
        _requireDeadlineNotExpired(signatureData);

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
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );

        _marketplace.createAuctionMeta(signatureData.to, input);
    }
}
