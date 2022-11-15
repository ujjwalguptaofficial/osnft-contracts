// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./dev_coin_base.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract OSDevCoin is Initializable, OwnableUpgradeable, DevCoinBase {
    function initialize(string memory name, string memory symbol)
        external
        initializer
    {
        __Ownable_init();
        __ERC20_init(name, symbol);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function setOSNFT(address nftContract) external {
        _osnftAddress = nftContract;
    }
}
