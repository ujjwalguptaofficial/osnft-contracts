// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../interfaces/relayer.sol";
import "../interfaces/marketplace.sol";

contract OSDRelayerBase is EIP712, IOsNFTRelayer {
    using ECDSA for bytes32;

    IOSNFTMarketPlaceUpgradeable private _marketplace;

    constructor(address marketplace_) EIP712("OSNFT_RELAYER", "1") {
        _marketplace = IOSNFTMarketPlaceUpgradeable(marketplace_);
    }

    function listNFTOnSale(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlaceUpgradeable.SellListingInput calldata sellData
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
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );

        _marketplace.listNFTOnSaleMeta(signatureData.to, sellData);
    }

    function createAuction(
        SignatureMeta calldata signatureData,
        IOSNFTMarketPlaceUpgradeable.AuctionListingInput calldata input
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
            ECDSA.recover(digest, signatureData.signature) == signatureData.to,
            "Invalid signature"
        );

        _marketplace.createAuctionMeta(signatureData.to, input);
    }
}
