// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./relayer_base.sol";

contract OSNFTRelayer is OSNFTRelayerBase {
    constructor(
        address marketplace_,
        address nft_
    ) OSNFTRelayerBase(marketplace_, nft_) {}

    function sell(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlace.SellListingInput calldata sellData
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTSellData,
                    sellData.tokenId,
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
        uint8 creatorCut,
        uint64 expires
    ) external {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTMintData,
                    keccak256(bytes(projectUrl)),
                    creatorCut,
                    expires,
                    signatureData.deadline
                )
            )
        );
        _requireValidSignature(digest, signatureData);

        _nft.mintMeta(signatureData.to, projectUrl, creatorCut, expires);
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

        _marketplace.buyMeta(signatureData.to, sellId, price);
    }
}
