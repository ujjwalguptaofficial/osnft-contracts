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
        string calldata _baseTokenURI
    ) external initializer {
        __ERC721_init(name, symbol);
        __Ownable_init();
        baseTokenURI = _baseTokenURI;
    }

    function mintTo(
        address projectOwner,
        string calldata projectUrl,
        uint32 shares
    ) external onlyOwner {
        _mint(projectOwner, projectUrl, shares);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    // percentage methods

    function creatorOf(bytes32 tokenId) external view returns (address) {
        require(_exists(tokenId), "token does not exist");

        return _percentageTokens[tokenId].creator;
    }

    function creatorCut(bytes32 tokenId) external view returns (uint8) {
        require(_exists(tokenId), "token does not exist");

        return _percentageTokens[tokenId].creatorCut;
    }

    // equity methods

    function shareOf(address owner, bytes32 tokenId)
        external
        view
        returns (uint32)
    {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );

        return _equityTokens[tokenId].shares[owner];
    }

    function totalShareOf(bytes32 tokenId) external view returns (uint32) {
        require(_exists(tokenId), "token does not exist");

        return _equityTokens[tokenId].totalNoOfShare;
    }
}
