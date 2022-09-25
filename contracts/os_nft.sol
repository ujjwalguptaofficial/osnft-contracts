// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract OSNFT is Initializable, OwnableUpgradeable, ERC721Upgradeable {
    uint256 private _tokenId;
    string public baseTokenURI;
    mapping(bytes32 => uint256) private _projects;

    // mapping(uint256 => string) private _metadata;

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
        _mint(projectOwner, ++_tokenId);
        bytes32 projectUrlHash = keccak256(abi.encodePacked(projectUrl));

        require(_projects[projectUrlHash] == 0, "Project already minted");
        _projects[projectUrlHash] = _tokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    function tokenIdByProject(string calldata projectUrl)
        external
        view
        returns (uint256)
    {
        return _projects[keccak256(abi.encodePacked(projectUrl))];
    }
}
