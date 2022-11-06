// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./osnft_approver_base.sol";

contract OSNFTApprover is Initializable, OwnableUpgradeable, OSNFTApproverBase {
    function initialize() external initializer {
        __Ownable_init();
        __OSNFTApproverInitialize__();
    }
}
