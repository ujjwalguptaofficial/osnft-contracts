// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IOSNFTDataType {
    struct ShareToken {
        uint32 totalNoOfShare;
        mapping(address => uint32) shares;
        address allShareOwner;
        address creator;
    }

    struct PercentageToken {
        uint8 creatorCut;
        address owner;
        address creator;
    }

    enum NFT_TYPE {
        PercentageCut,
        Share,
        Equity,
        Direct
    }

    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    event TransferShare(uint256 share);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    /**
     * @dev Emitted when new project id is created.
     */
    event ProjectMint(
        string indexed projectUrl,
        NFT_TYPE nftType,
        uint32 share
    );
}
