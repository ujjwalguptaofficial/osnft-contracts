// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "../interfaces/erc4907.sol";

contract OSNFT is ERC721Upgradeable, IERC4907 {
    struct TokenInformation {
        uint64 expires;
        address owner;
        address creator;
    }

    /**
     * @dev Emitted when new project id is created.
     */
    event ProjectMint(string indexed projectUrl, uint256 index);

    mapping(uint256 => TokenInformation) internal _tokens;
    mapping(uint256 => uint256) public tokenCount;
    uint256 internal _totalSupply;

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function initialize(
        string memory name_,
        string memory symbol_
    ) public initializer {
        __ERC721_init(name_, symbol_);
    }

    function mint(string calldata projectUrl) external {
        uint256 projectHash = uint256(keccak256(abi.encodePacked(projectUrl)));
        uint256 newTokenIndex = ++tokenCount[projectHash];
        uint256 tokenId = uint256(
            keccak256(abi.encode(projectUrl, newTokenIndex))
        );
        address caller = _msgSender();
        _mint(caller, tokenId);

        ++_totalSupply;
        _tokens[tokenId].creator = caller;
        // emit event for index mint
        emit ProjectMint(projectUrl, newTokenIndex);
    }

    function setUser(uint256 tokenId, address user, uint64 expires) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        TokenInformation storage info = _tokens[tokenId];
        info.owner = user;
        info.expires = expires;
        emit UpdateUser(tokenId, user, expires);
    }

    function refill(uint256 tokenId, uint64 expires) external {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        TokenInformation storage info = _tokens[tokenId];
        info.expires = expires;
        emit UpdateUser(tokenId, info.owner, expires);
    }

    function changeUser(uint256 tokenId, address user) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        TokenInformation storage info = _tokens[tokenId];
        info.owner = user;
        emit UpdateUser(tokenId, user, info.expires);
    }

    function userOf(uint256 tokenId) public view returns (address) {
        TokenInformation memory token = _tokens[tokenId];
        if (uint256(token.expires) >= block.timestamp) {
            return token.owner;
        }
        return address(0);
    }

    function userExpires(
        uint256 tokenId
    ) public view virtual override returns (uint256) {
        return _tokens[tokenId].expires;
    }

    function creatorOf(uint256 tokenId) external view returns (address) {
        return _tokens[tokenId].creator;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC4907).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        require(userOf(tokenId) == address(0), "Token is in use");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
