// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.0-rc.1) (token/ERC721/IERC721.sol)

pragma solidity ^0.8.17;

import "./osnft_approver_datatype.sol";

/**
 * @dev Required interface of an approver contract
 */
interface IOSNFTApprover is IOSNFTApproverDataType {
    function isApprover(address account) external view returns (bool);

    function addApprover(address account) external;

    function removeApprover(address account) external;

    function approveProject(ProjectApproveRequest memory data) external;

    function getApprovedProject(
        bytes32 tokenId
    ) external view returns (ProjectApprovedInfo memory);

    function burnProject(bytes32 tokenId) external;
}
