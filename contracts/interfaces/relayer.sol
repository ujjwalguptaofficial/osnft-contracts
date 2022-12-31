// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.0-rc.1) (token/ERC721/IERC721.sol)

pragma solidity ^0.8.17;

/**
 * @dev Required interface of an approver contract
 */
interface IOsNFTRelayer {
    struct SignatureMeta {
        bytes signature;
        address to;
        uint256 deadline;
    }

    // struct AuctionListingInput {
    //     bytes32 tokenId;
    //     uint32 share;
    //     uint256 initialBid;
    //     uint256 endAuction;
    //     address paymentToken;
    //     uint32 sellPriority;
    // }

    // struct SignatureMetaWithNonce {
    //     bytes signature;
    //     address to;
    //     uint256 deadline;
    //     uint256 nonce;
    // }
}
