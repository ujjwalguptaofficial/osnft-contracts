// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

interface IOSDCoin is IERC20MetadataUpgradeable {
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

    event DefaultOperatorAdded(address indexed operator);
}
