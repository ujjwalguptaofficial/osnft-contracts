// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./relayer_base.sol";

contract OSDRelayer is OSDRelayerBase {
    constructor(
        address marketplace_,
        address nft_
    ) OSDRelayerBase(marketplace_, nft_) {}

    function listNFTOnSale(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlaceUpgradeable.SellListingInput calldata sellData
    ) external {
        _requireDeadlineNotExpired(signatureData);

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTListOnSaleData,
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
        require(
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );

        _marketplace.createAuctionMeta(signatureData.to, input);
    }

    function mint(
        SignatureMeta calldata signatureData,
        string calldata projectUrl,
        IOSNFT.NFT_TYPE nftType,
        uint32 totalShare
    ) external {
        _requireDeadlineNotExpired(signatureData);

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "NFTMintData(string projectUrl,uint8 nftType,uint32 totalShare,uint256 deadline)"
                    ),
                    keccak256(bytes(projectUrl)),
                    nftType,
                    totalShare,
                    signatureData.deadline
                )
            )
        );
        require(
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );
        _nft.mintMeta(signatureData.to, projectUrl, nftType, totalShare);
    }
}
