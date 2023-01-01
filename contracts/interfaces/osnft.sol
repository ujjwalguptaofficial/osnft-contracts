// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./erc721_metadata_upgradable.sol";

interface IOSNFT is IERC721MetadataUpgradeable {
    struct EquityTokenInfo {
        uint32 totalNoOfShare;
        mapping(address => uint32) shares;
        address allShareOwner;
        address creator;
    }

    struct PercentageTokenInfo {
        uint8 creatorCut;
        address owner;
        address creator;
    }

    function mintMeta(
        address to,
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 totalShare
    ) external;
}
