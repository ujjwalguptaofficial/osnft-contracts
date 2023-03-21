// // SPDX-License-Identifier: SEE LICENSE IN LICENSE
// pragma solidity ^0.8.17;

// import "./interfaces/nft.sol";

// contract OSNFTRelayer is IOSNFT {
//     //variables
//     IOSNFT internal _nft;
//     bytes32 internal _TYPE_HASH_ProjectTokenizeData;

//     constructor(address nft_) {
//         _nft = IOSNFT(nft_);

//         _TYPE_HASH_ProjectTokenizeData = keccak256(
//             "ProjectTokenizeData(string projectUrl, uint256 basePrice, uint256 popularityFactorPrice, address paymentToken, uint8 creatorRoyalty, uint256 validUntil)"
//         );
//     }

//     function tokenizeProject(
//         IOSNFT.SignatureMeta calldata signatureByUser,
//         IOSNFT.ProjectTokenizeInput calldata input,
//         IOSNFT.SignatureMeta calldata signatureByVerifier
//     ) external {
//         bytes32 digest = _hashTypedDataV4(
//             keccak256(
//                 abi.encode(
//                     _TYPE_HASH_NFTSellData,
//                     input.projectUrl,
//                     input.basePrice,
//                     input.popularityFactorPrice,
//                     input.paymentERC20Token,
//                     input.creatorRoyalty,
//                     signatureData.deadline
//                 )
//             )
//         );

//         _requireValidSignature(digest, signatureData);

//         _nft.tokenizeProjectTo(signatureData.to, input);
//     }

//     function mint(
//         SignatureMeta calldata signatureData,
//         string calldata projectUrl,
//         IOSNFT.NFT_TYPE nftType,
//         uint32 totalShare
//     ) external {
//         bytes32 digest = _hashTypedDataV4(
//             keccak256(
//                 abi.encode(
//                     _TYPE_HASH_NFTMintData,
//                     keccak256(bytes(projectUrl)),
//                     nftType,
//                     totalShare,
//                     signatureData.deadline
//                 )
//             )
//         );
//         _requireValidSignature(digest, signatureData);

//         _nft.mintMeta(signatureData.to, projectUrl, nftType, totalShare);
//     }
// }
