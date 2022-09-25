// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./os_nft_base.sol";

contract OSNFT is Initializable, OwnableUpgradeable, OSNFTBase {
    uint256 private _tokenId;
    string public baseTokenURI;
    mapping(bytes32 => uint256) private _projects;

    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata _baseTokenURI
    ) external initializer {
        __ERC721_init(name, symbol);
        __Ownable_init();
        baseTokenURI = _baseTokenURI;
    }

    function mint(string calldata projectUrl, address projectOwner)
        external
        onlyOwner
    {
        _mint(projectOwner, projectUrl);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    function projectUrlByTokenId(bytes32 tokenId)
        external
        view
        returns (string memory)
    {
        return _metadata[tokenId];
    }
}
