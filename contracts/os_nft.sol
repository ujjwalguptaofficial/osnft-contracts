// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./os_nft_base.sol";

contract OSNFT is Initializable, OwnableUpgradeable, OSNFTBase {
    string public baseTokenURI;

    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata _baseTokenURI,
        address approver
    ) external initializer {
        __ERC721_init(name, symbol, approver);
        __Ownable_init();
        baseTokenURI = _baseTokenURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    // percentage methods

    function creatorOf(bytes32 tokenId) external view returns (address) {
        _requireMinted(tokenId);

        return _percentageTokens[tokenId].creator;
    }

    function creatorCut(bytes32 tokenId) external view returns (uint8) {
        _requireMinted(tokenId);

        return _percentageTokens[tokenId].creatorCut;
    }

    // equity methods

    function shareOf(bytes32 tokenId, address owner)
        external
        view
        returns (uint32)
    {
        _requireMinted(tokenId);
        return _shareOf(tokenId, owner);
    }

    function totalShareOf(bytes32 tokenId) external view returns (uint32) {
        _requireMinted(tokenId);

        return _equityTokens[tokenId].totalNoOfShare;
    }
}
