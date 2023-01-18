// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./osnft_base.sol";
import "../interfaces/osnft.sol";

// contract OSNFT is Initializable, OwnableUpgradeable, OSNFTBase {
contract OSNFT is Initializable, OwnableUpgradeable, OSNFTBase, IOSNFT {
    using StringHelper for bytes32;

    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata baseTokenURI_,
        address approver_,
        address nativeToken_
    ) external initializer {
        __ERC721_init(name_, symbol_, baseTokenURI_, approver_, nativeToken_);
        __Ownable_init();
    }

    function burn(bytes32 tokenId) external {
        _burn(tokenId);
    }

    function relayer() external view returns (address) {
        return _relayerAddress;
    }

    function relayer(address relayerAddress_) external onlyOwner {
        _relayerAddress = relayerAddress_;
    }

    function defaultMarketPlace(address value) external onlyOwner {
        _defaultMarketPlace = value;
    }

    function defaultMarketPlace() external view returns (address) {
        return _defaultMarketPlace;
    }

    function baseTokenURI(string calldata baseTokenURI_) external onlyOwner {
        _baseTokenURI = baseTokenURI_;
    }

    function baseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() external view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() external view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(bytes32 tokenId) external view returns (address) {
        return _requireValidOwner(tokenId);
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) external view returns (uint256) {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        return _balances[owner];
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

    function shareOf(
        bytes32 tokenId,
        address owner
    ) external view returns (uint32) {
        _requireMinted(tokenId);
        return _shareOf(tokenId, owner);
    }

    function totalShareOf(bytes32 tokenId) external view returns (uint32) {
        _requireMinted(tokenId);

        return _shareTokens[tokenId].totalNoOfShare;
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) external {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(bytes32 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);

        string memory baseURI = _baseTokenURI;
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString()))
                : "";
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool) {
        return _isApprovedForAll(owner, operator);
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(bytes32 tokenId) external view returns (address) {
        return _getApproved(tokenId);
    }

    function getApproved(
        bytes32 tokenId,
        address shareOwner
    ) external view returns (address) {
        return _getApproved(tokenId, shareOwner);
    }

    function approve(address to, bytes32 tokenId) external {
        approve(to, tokenId, _msgSender());
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, bytes32 tokenId, address shareOwner) public {
        address caller = _msgSender();
        if (_isShareToken(tokenId)) {
            // in case it is called by approved all address
            if (caller != shareOwner) {
                require(
                    _shareOf(tokenId, shareOwner) > 0,
                    "ERC721: invalid share owner"
                );
            }
            require(
                _shareOf(tokenId, caller) > 0 ||
                    _isApprovedForAll(shareOwner, caller),
                "ERC721: approve caller is not token owner nor approved for all"
            );
            _approve(to, tokenId, shareOwner);
        } else {
            address owner = _requireValidOwner(tokenId);
            require(to != owner, "ERC721: approval to current owner");

            require(
                caller == owner || _isApprovedForAll(owner, caller),
                "ERC721: approve caller is not token owner nor approved for all"
            );
            _approve(to, tokenId);
        }
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(address from, address to, bytes32 tokenId) external {
        //solhint-disable-next-line max-line-length
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );

        _transfer(from, to, tokenId, 0);
    }

    function transferFrom(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share
    ) external {
        //solhint-disable-next-line max-line-length

        require(
            _isApprovedOrShareOwner(_msgSender(), tokenId, from, share),
            "ERC721: caller is not token share owner nor approved"
        );

        _transfer(from, to, tokenId, share);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        bytes32 tokenId
    ) external {
        safeTransferFrom(from, to, tokenId, 0, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share
    ) external {
        safeTransferFrom(from, to, tokenId, share, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        bytes32 tokenId,
        bytes memory data
    ) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: caller is not token owner nor approved"
        );
        _safeTransfer(from, to, tokenId, 0, data);
    }

    function safeTransferFrom(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share,
        bytes memory data
    ) public {
        require(
            _isApprovedOrShareOwner(_msgSender(), tokenId, from, share),
            "ERC721: caller is not token share owner nor approved"
        );
        _safeTransfer(from, to, tokenId, share, data);
    }

    function mintMeta(
        address to,
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 totalShare
    ) external {
        _requireRelayer();
        _mint(to, projectUrl, nftType, totalShare);
    }

    function mint(
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 shares
    ) external {
        _mint(_msgSender(), projectUrl, nftType, shares);
    }

    function getNativeToken() external view returns (address) {
        return _nativeToken;
    }

    function isShareToken(bytes32 tokenId) external view returns (bool) {
        return _isShareToken(tokenId);
    }
}
