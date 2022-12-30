// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./osnft_marketplace_base.sol";

contract OSNFTMarketPlace is
    Initializable,
    OwnableUpgradeable,
    OSNFTMarketPlaceBase
{
    function initialize(address nft, address nativeCoin_) external initializer {
        __Ownable_init();
        __MarketPlace_init(nft, nativeCoin_);
    }
}
