// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/osnft_approver.sol";

contract OSNFTApproverBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTApproverUpgradeable
{
    mapping(address => bool) internal _approvers;
    mapping(bytes32 => address) internal _projectsApproved;

    function approveProject(bytes32 tokenId, address account) external {
        require(_approvers[_msgSender()], "only approvers allowed");
        _projectsApproved[tokenId] = account;
    }

    function getProjectApproved(bytes32 tokenId)
        external
        view
        override
        returns (address)
    {
        return _projectsApproved[tokenId];
    }

    function isApprover(address account) external view returns (bool) {
        return _approvers[account];
    }

    function addApprover(address account) external override onlyOwner {
        _approvers[account] = true;
        emit ApproverAdded(account);
    }

    function removeApprover(address account) external override onlyOwner {
        delete _approvers[account];
        emit ApproverRemoved(account);
    }

    function __OSNFTApproverInitialize__() internal onlyInitializing {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
