// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/erc721_metadata_upgradable.sol";
import "./interfaces/erc721_receiver_upgradable.sol";
import "./interfaces/osnft_approver.sol";
import "./string_helper.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract OSNFTBase is
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable,
    ERC165Upgradeable,
    IERC721MetadataUpgradeable
{
    using AddressUpgradeable for address;
    using StringsUpgradeable for uint256;
    using ECDSAUpgradeable for bytes32;
    using StringHelper for bytes32;

    struct EquityTokenInfo {
        uint32 totalNoOfShare;
        mapping(address => uint32) shares;
        address allShareOwner;
    }

    struct PercentageTokenInfo {
        uint8 creatorCut;
        address owner;
        address creator;
    }

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    mapping(bytes32 => EquityTokenInfo) internal _equityTokens;

    mapping(bytes32 => PercentageTokenInfo) internal _percentageTokens;

    // Mapping owner address to token count
    mapping(address => uint256) internal _balances;

    // Mapping from token ID to approved address
    mapping(bytes32 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    address public defaultMarketPlace;

    IOSNFTApproverUpgradeable private _approver;

    function setDefaultMarketPlace(address value) external onlyOwner {
        defaultMarketPlace = value;
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
    function ownerOf(bytes32 tokenId) public view returns (address) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) public view returns (uint256) {
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

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(bytes32 tokenId)
        public
        view
        virtual
        returns (string memory)
    {
        _requireMinted(tokenId);

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString()))
                : "";
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        returns (bool)
    {
        if (operator == defaultMarketPlace) {
            return true;
        }
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(bytes32 tokenId) public view returns (address) {
        return getApproved(tokenId, _msgSender());
    }

    function getApproved(bytes32 tokenId, address shareOwner)
        public
        view
        returns (address)
    {
        _requireMinted(tokenId);
        if (isShareToken(tokenId)) {
            tokenId = _getTokenId(tokenId, shareOwner);
        }
        return _tokenApprovals[tokenId];
    }

    function approve(address to, bytes32 tokenId) public virtual override {
        approve(to, tokenId, _msgSender());
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(
        address to,
        bytes32 tokenId,
        address shareOwner
    ) public {
        if (isShareToken(tokenId)) {
            // in case it is called by approved all address
            if (_msgSender() != shareOwner) {
                require(
                    _shareOf(tokenId, shareOwner) > 0,
                    "ERC721: invalid share owner"
                );
            }
            require(
                _shareOf(tokenId, _msgSender()) > 0 ||
                    isApprovedForAll(shareOwner, _msgSender()),
                "ERC721: approve caller is not token owner nor approved for all"
            );
            _approve(to, tokenId, shareOwner);
        } else {
            address owner = ownerOf(tokenId);
            require(to != owner, "ERC721: approval to current owner");

            require(
                _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
                "ERC721: approve caller is not token owner nor approved for all"
            );
            _approve(to, tokenId);
        }
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        bytes32 tokenId
    ) external virtual override {
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
    ) external virtual override {
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
    ) public virtual override {
        safeTransferFrom(from, to, tokenId, 0, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share
    ) public virtual override {
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
    ) public virtual override {
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
    ) public virtual override {
        require(
            _isApprovedOrShareOwner(_msgSender(), tokenId, from, share),
            "ERC721: caller is not token share owner nor approved"
        );
        _safeTransfer(from, to, tokenId, share, data);
    }

    function mintTo(
        bytes32 data,
        bytes memory signature,
        address to,
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 shares
    ) external onlyOwner {
        require(
            data.toEthSignedMessageHash().recover(signature) == to,
            "invalid signature"
        );
        _mint(to, projectUrl, nftType, shares);
    }

    function mint(
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 shares
    ) external {
        _mint(_msgSender(), projectUrl, nftType, shares);
    }

    address internal _nativeToken;

    function setNativeToken(address token) public onlyOwner {
        _nativeToken = token;
    }

    function getNativeToken() external view returns (address) {
        return _nativeToken;
    }

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    function __ERC721_init(
        string memory name_,
        string memory symbol_,
        address approver_,
        address nativeToken_
    ) internal onlyInitializing {
        __ERC721_init_unchained(name_, symbol_);
        _approver = IOSNFTApproverUpgradeable(approver_);
        _nativeToken = nativeToken_;
    }

    function __ERC721_init_unchained(string memory name_, string memory symbol_)
        internal
        onlyInitializing
    {
        _name = name_;
        _symbol = symbol_;
    }

    function _getTokenId(bytes32 tokenId, address shareOwner)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(tokenId.toString(), shareOwner));
    }

    function isShareToken(bytes32 tokenId) public view returns (bool) {
        return _equityTokens[tokenId].totalNoOfShare > 0;
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(
        address to,
        string calldata projectUrl,
        NFT_TYPE nftType,
        uint32 totalShare
    ) internal virtual {
        bytes32 tokenId = keccak256(abi.encodePacked(projectUrl));

        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        IOSNFTApproverUpgradeable.ProjectApprovedInfo
            memory projectApproveInfo = _approver.getApprovedProject(tokenId);
        require(projectApproveInfo.mintTo == to, "project not approved");

        ERC20Upgradeable paymentToken = ERC20Upgradeable(_nativeToken);
        require(
            paymentToken.transferFrom(
                to,
                address(this),
                projectApproveInfo.worth
            ),
            "Payment for minting failed"
        );

        unchecked {
            // Will not overflow unless all 2**256 token ids are minted to the same owner.
            // Given that tokens are minted one by one, it is impossible in practice that
            // this ever happens. Might change if we allow batch minting.
            // The ERC fails to describe this case.
            _balances[to] += 1;
        }

        if (nftType == NFT_TYPE.Equity) {
            totalShare = 100;
            nftType = NFT_TYPE.Share;
        }

        // equity
        if (nftType == NFT_TYPE.Share) {
            require(totalShare > 0, "Total share should not be zero");

            // take mint payment

            EquityTokenInfo storage token = _equityTokens[tokenId];
            token.totalNoOfShare = totalShare;
            token.shares[to] = totalShare;
            token.allShareOwner = to;
        } else {
            require(totalShare < 100, "Require total share to be below 100");

            // take mint payment

            _percentageTokens[tokenId] = PercentageTokenInfo({
                creator: to,
                creatorCut: uint8(totalShare),
                owner: to
            });
        }

        emit Transfer(address(0), to, tokenId);
        emit ProjectAdded(projectUrl, nftType, totalShare);
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits an {ApprovalForAll} event.
     */
    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "ERC721: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(bytes32 tokenId) internal view virtual returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Returns the owner of the `tokenId`. Does NOT revert if token doesn't exist
     */
    function _ownerOf(bytes32 tokenId) internal view returns (address) {
        PercentageTokenInfo memory percentageToken = _percentageTokens[tokenId];
        if (percentageToken.owner != address(0)) {
            return percentageToken.owner;
        }
        if (_equityTokens[tokenId].totalNoOfShare > 0) {
            return _equityTokens[tokenId].allShareOwner;
        }
        return address(0);
    }

    /**
     * @dev Reverts if the `tokenId` has not been minted yet.
     */
    function _requireMinted(bytes32 tokenId) internal view virtual {
        require(_exists(tokenId), "ERC721: invalid token ID");
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    /**
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, bytes32 tokenId)
        internal
        view
        virtual
        returns (bool)
    {
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender);
    }

    function _isApprovedOrShareOwner(
        address spender,
        bytes32 tokenId,
        address owner,
        uint32 share
    ) internal view virtual returns (bool) {
        return (isApprovedForAll(owner, spender) ||
            getApproved(tokenId, owner) == spender ||
            _shareOf(tokenId, spender) >= share);
    }

    function _shareOf(bytes32 tokenId, address owner)
        internal
        view
        returns (uint32)
    {
        return _equityTokens[tokenId].shares[owner];
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function _approve(address to, bytes32 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;

        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _approve(
        address to,
        bytes32 tokenId,
        address shareOwner
    ) internal virtual {
        _tokenApprovals[_getTokenId(tokenId, shareOwner)] = to;
        emit Approval(shareOwner, to, tokenId);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share
    ) internal {
        require(to != address(0), "ERC721: transfer to the zero address");

        PercentageTokenInfo memory token = _percentageTokens[tokenId];

        // if token is percentage
        if (token.creator != address(0)) {
            require(
                ownerOf(tokenId) == from,
                "ERC721: transfer from incorrect owner"
            );

            // Clear approvals from the previous owner
            delete _tokenApprovals[tokenId];

            unchecked {
                // `_balances[from]` cannot overflow for the same reason as described in `_burn`:
                // `from`'s balance is the number of token held, which is at least one before the current
                // transfer.
                // `_balances[to]` could overflow in the conditions described in `_mint`. That would require
                // all 2**256 token ids to be minted, which in practice is impossible.
                _balances[from] -= 1;
                _balances[to] += 1;
            }
            _percentageTokens[tokenId].owner = to;
        } else {
            require(share > 0, "Input share should be above zero");

            EquityTokenInfo storage equityToken = _equityTokens[tokenId];

            require(
                equityToken.shares[from] >= share,
                "ERC721: owner share is less than requested"
            );

            // if to does not own any share then increase the balance
            if (equityToken.shares[to] == 0) {
                unchecked {
                    _balances[to] += 1;
                }
            }

            unchecked {
                equityToken.shares[to] += share;
                equityToken.shares[from] -= share;
            }

            // if from does not have any share left then decrease the balance
            if (equityToken.shares[from] == 0) {
                unchecked {
                    _balances[from] -= 1;
                }
            }

            uint32 totalShare = equityToken.totalNoOfShare;

            address totalShareOwner = address(this);
            if (equityToken.shares[to] == totalShare) {
                totalShareOwner = to;
            } else if (equityToken.shares[from] == totalShare) {
                totalShareOwner = from;
            }

            if (equityToken.allShareOwner != totalShareOwner) {
                equityToken.allShareOwner = totalShareOwner;
            }

            emit TransferShare(share);
        }

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share,
        bytes memory data
    ) internal virtual {
        _transfer(from, to, tokenId, share);
        require(
            _checkOnERC721Received(from, to, tokenId, share, data),
            "ERC721: transfer to non ERC721Receiver implementer"
        );
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        bytes32 tokenId,
        uint32 share,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try
                IERC721ReceiverUpgradeable(to).onERC721Received(
                    _msgSender(),
                    from,
                    tokenId,
                    share,
                    data
                )
            returns (bytes4 retval) {
                return
                    retval ==
                    IERC721ReceiverUpgradeable.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert(
                        "ERC721: transfer to non ERC721Receiver implementer"
                    );
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[44] private __gap;
}
