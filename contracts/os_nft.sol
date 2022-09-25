// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract UjjwalNFT is Initializable, OwnableUpgradeable, ERC721Upgradeable {
    uint256 private _tokenId;
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

    function mint() external {
        _mint(_msgSender(), ++_tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseTokenURI(string calldata _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }
}
