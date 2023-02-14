// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./osnft_datatype.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./erc4907.sol";

interface IOSNFT is IOSNFTDataType, IERC721Upgradeable, IERC4907 {
    function mint(
        string calldata projectUrl,
        uint8 creatorCut,
        uint64 expires
    ) external;

    function mintMeta(
        address to,
        string calldata projectUrl,
        uint8 creatorCut,
        uint64 expires
    ) external;

    function creatorOf(uint256 tokenId) external view returns (address);

    function creatorCut(uint256 tokenId) external view returns (uint8);
}
