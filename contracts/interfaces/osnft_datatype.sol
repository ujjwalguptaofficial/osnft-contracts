// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IOSNFTDataType {
    struct TokenInformation {
        uint64 expires;
        // user represents user of token - used for renting
        address user;
        // represents creator of token
        address creator;
        // percentage cut on sell
        uint8 creatorCut;
    }

    /**
     * @dev Emitted when new project id is created.
     */
    event ProjectMint(string indexed projectUrl, uint256 index);

    /**
     * @dev Emitted when new project id is created.
     */
    event Refill(uint256 indexed tokenId, uint64 expires);
}
