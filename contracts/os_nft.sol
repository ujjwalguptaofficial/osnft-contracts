// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./os_nft_base.sol";

contract OSNFT is Initializable, OwnableUpgradeable, OSNFTBase {
    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata baseTokenURI,
        address approver,
        address nativeToken_
    ) external initializer {
        __ERC721_init(name, symbol, baseTokenURI, approver, nativeToken_);
        __Ownable_init();
    }

    function burn(bytes32 tokenId) external {
        _burn(tokenId);
    }
}
