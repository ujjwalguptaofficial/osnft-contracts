// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "../interfaces/osnft_approver.sol";
import "../interfaces/osd_coin.sol";
import "../interfaces/osnft.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract OSNFT is ERC721Upgradeable, OwnableUpgradeable, IOSNFT {
    mapping(uint256 => TokenInformation) internal _tokens;
    mapping(uint256 => uint256) public tokenCount;
    uint256 internal _totalSupply;
    string internal _baseTokenURI;
    address internal _nativeToken;
    address internal _relayerAddress;

    IOSNFTApprover private _approver;

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        string calldata baseTokenURI_,
        address approver_,
        address nativeToken_
    ) public initializer {
        __ERC721_init(name_, symbol_);
        _baseTokenURI = baseTokenURI_;
        _approver = IOSNFTApprover(approver_);
        _nativeToken = nativeToken_;
    }

    function getRelayer() external view returns (address) {
        return _relayerAddress;
    }

    function setRelayer(address relayerAddress_) external onlyOwner {
        _relayerAddress = relayerAddress_;
    }

    function mintMeta(
        address to,
        string calldata projectUrl,
        uint8 creatorCut,
        uint64 expires
    ) external {
        _requireRelayer();

        mintTo_(to, projectUrl, creatorCut, expires);
    }

    function mint(
        string calldata projectUrl,
        uint8 creatorCut,
        uint64 expires
    ) external {
        mintTo_(_msgSender(), projectUrl, creatorCut, expires);
    }

    function mintTo_(
        address to,
        string calldata projectUrl,
        uint8 creatorPercentageCut,
        uint64 expires
    ) internal {
        uint256 projectHash = uint256(keccak256(abi.encodePacked(projectUrl)));

        IOSNFTApprover.ProjectApprovedInfo memory projectApproveInfo = _approver
            .getApprovedProject(projectHash);
        require(projectApproveInfo.mintTo == to, "Project not approved");

        uint256 newTokenIndex = ++tokenCount[projectHash];
        uint256 tokenId = uint256(
            keccak256(abi.encode(projectUrl, newTokenIndex))
        );
        _mint(to, tokenId);
        _burnProjectWorth(to, projectApproveInfo.worth);
        ++_totalSupply;

        _tokens[tokenId] = TokenInformation({
            creator: to,
            creatorCut: creatorPercentageCut,
            expires: expires,
            user: address(0)
        });

        emit ProjectMint(projectUrl, newTokenIndex);
    }

    function burn(uint256 tokenId) external {
        IOSNFTApprover.ProjectApprovedInfo memory projectApproveInfo = _approver
            .getApprovedProject(tokenId);

        // burn osd worth of project
        _burnProjectWorth(_msgSender(), projectApproveInfo.worth);
        _burn(tokenId);

        // burn NFT
        _approver.burnProject(tokenId);
    }

    function setUser(uint256 tokenId, address user, uint64 expires) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        TokenInformation storage info = _tokens[tokenId];
        info.user = user;
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
        emit Refill(tokenId, expires);
    }

    function userOf(uint256 tokenId) public view returns (address) {
        TokenInformation memory token = _tokens[tokenId];
        if (uint256(token.expires) >= block.timestamp) {
            return token.user;
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

    function creatorCut(uint256 tokenId) external view returns (uint8) {
        return _tokens[tokenId].creatorCut;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC4907).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _burnProjectWorth(address to, uint256 worth) internal {
        IOSDCoin paymentToken = IOSDCoin(_nativeToken);

        paymentToken.burnFrom(to, worth);
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

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _requireRelayer() internal view {
        require(_msgSender() == _relayerAddress, "Invalid relayer");
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
