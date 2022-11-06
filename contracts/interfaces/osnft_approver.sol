// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.0-rc.1) (token/ERC721/IERC721.sol)

pragma solidity ^0.8.0;

/**
 * @dev Required interface of an approver contract
 */
interface IOSNFTApproverUpgradeable {
    event ProjectApproved(bytes32 indexed tokenId, address indexed account);

    event ApproverAdded(address account);

    event ApproverRemoved(address account);

    function isApprover(address account) external view returns (bool);

    function addApprover(address account) external;

    function removeApprover(address account) external;

    function approveProject(bytes32 tokenId, address account) external;

    function getProjectApproved(bytes32 tokenId)
        external
        view
        returns (address);
}
