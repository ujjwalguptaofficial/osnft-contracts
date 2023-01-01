// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/osnft_approver.sol";

contract OSNFTApproverBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTApproverDataType
{
    mapping(address => bool) internal _approvers;

    mapping(bytes32 => ProjectApprovedInfo) internal _projectsApproved;

    uint256 internal _worthConstant;
    uint256 internal _oneToken;

    function __OSNFTApproverInitialize__() internal onlyInitializing {
        _worthConstant = 10 ** 13;
        _oneToken = 10 ** 18;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
