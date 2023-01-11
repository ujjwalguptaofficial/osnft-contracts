// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./relayer_base.sol";

contract OSDRelayer is OSDRelayerBase {
    constructor(
        address marketplace_,
        address nft_
    ) OSDRelayerBase(marketplace_, nft_) {}

    function sell(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlace.SellListingInput calldata sellData
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTSellData,
                    sellData.tokenId,
                    sellData.share,
                    sellData.price,
                    sellData.paymentToken,
                    sellData.sellPriority,
                    signatureData.deadline
                )
            )
        );

        _requireValidSignature(digest, signatureData);

        _marketplace.sellMeta(signatureData.to, sellData);
    }

    function createAuction(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlace.AuctionListingInput calldata input
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTAuctionData,
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

        _requireValidSignature(digest, signatureData);

        _marketplace.createAuctionMeta(signatureData.to, input);
    }

    function mint(
        SignatureMeta calldata signatureData,
        string calldata projectUrl,
        IOSNFT.NFT_TYPE nftType,
        uint32 totalShare
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTMintData,
                    keccak256(bytes(projectUrl)),
                    nftType,
                    totalShare,
                    signatureData.deadline
                )
            )
        );
        _requireValidSignature(digest, signatureData);

        _nft.mintMeta(signatureData.to, projectUrl, nftType, totalShare);
    }

    function buy(
        SignatureMeta calldata signatureData,
        bytes32 sellId,
        uint32 share,
        uint256 price
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTBuyData,
                    sellId,
                    share,
                    price,
                    signatureData.deadline
                )
            )
        );

        _requireValidSignature(digest, signatureData);

        _marketplace.buyNFTMeta(signatureData.to, sellId, share, price);
    }
}
