// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/osnft_datatype.sol";
import "../interfaces/erc721_receiver_upgradable.sol";
import "../interfaces/osnft_approver.sol";
import "../string_helper.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

contract OSNFTBase is
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable,
    ERC165Upgradeable,
    IOSNFTDataType
{
    using AddressUpgradeable for address;
    using StringsUpgradeable for uint256;
    using StringHelper for bytes32;

    // Token name
    string internal _name;

    // Token symbol
    string internal _symbol;

    // base token uri
    string internal _baseTokenURI;

    address internal _nativeToken;

    mapping(bytes32 => StockToken) internal _stockTokens;

    mapping(bytes32 => PercentageToken) internal _percentageTokens;

    // Mapping owner address to token count
    mapping(address => uint256) internal _balances;

    // Mapping from token ID to approved address
    mapping(bytes32 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    address internal _defaultMarketPlace;

    IOSNFTApprover private _approver;

    address internal _relayerAddress;

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    function __ERC721_init(
        string memory name_,
        string memory symbol_,
        string calldata baseTokenURI_,
        address approver_,
        address nativeToken_
    ) internal onlyInitializing {
        __ERC721_init_unchained(name_, symbol_);
        _approver = IOSNFTApprover(approver_);
        _nativeToken = nativeToken_;
        _baseTokenURI = baseTokenURI_;
    }

    function __ERC721_init_unchained(
        string memory name_,
        string memory symbol_
    ) internal onlyInitializing {
        _name = name_;
        _symbol = symbol_;
    }

    function _getTokenId(
        bytes32 tokenId,
        address shareOwner
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenId.toString(), shareOwner));
    }

    function _requireRelayer() internal view {
        require(_msgSender() == _relayerAddress, "Invalid relayer");
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

        IOSNFTApprover.ProjectApprovedInfo memory projectApproveInfo = _approver
            .getApprovedProject(tokenId);
        require(projectApproveInfo.mintTo == to, "project not approved");

        _burnProjectWorth(to, projectApproveInfo.worth);

        _increaseBalance(to);

        if (nftType == NFT_TYPE.Equity) {
            totalShare = 100;
            nftType = NFT_TYPE.Share;
        }

        // equity
        if (nftType == NFT_TYPE.Share) {
            require(totalShare > 0, "Total share should not be zero");

            // take mint payment

            StockToken storage token = _stockTokens[tokenId];
            token.totalNoOfShare = totalShare;
            token.shares[to] = totalShare;
            token.allShareOwner = to;
            token.creator = to;
        } else {
            if (nftType == NFT_TYPE.Direct) {
                totalShare = 0;
                nftType = NFT_TYPE.PercentageCut;
            }

            // percentage cut
            require(totalShare < 50, "Require creator cut to be below 50");

            // take mint payment

            _percentageTokens[tokenId] = PercentageToken({
                creator: to,
                creatorCut: uint8(totalShare),
                owner: to
            });
        }

        emit Transfer(address(0), to, tokenId);
        emit ProjectAdded(projectUrl, nftType, totalShare);
    }

    function _burnProjectWorth(address to, uint256 worth) internal {
        ERC20BurnableUpgradeable paymentToken = ERC20BurnableUpgradeable(
            _nativeToken
        );

        paymentToken.burnFrom(to, worth);
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
        PercentageToken memory percentageToken = _percentageTokens[tokenId];
        if (percentageToken.owner != address(0)) {
            return percentageToken.owner;
        }
        if (_stockTokens[tokenId].totalNoOfShare > 0) {
            return _stockTokens[tokenId].allShareOwner;
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
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(
        address spender,
        bytes32 tokenId
    ) internal view virtual returns (bool) {
        address owner = _requireValidOwner(tokenId);
        return (spender == owner ||
            _isApprovedForAll(owner, spender) ||
            _getApproved(tokenId) == spender);
    }

    function _getApproved(bytes32 tokenId) internal view returns (address) {
        return _getApproved(tokenId, _msgSender());
    }

    function _getApproved(
        bytes32 tokenId,
        address shareOwner
    ) internal view returns (address) {
        _requireMinted(tokenId);
        if (_isShareToken(tokenId)) {
            tokenId = _getTokenId(tokenId, shareOwner);
        }
        return _tokenApprovals[tokenId];
    }

    function _isApprovedForAll(
        address owner,
        address operator
    ) internal view returns (bool) {
        if (operator == _defaultMarketPlace) {
            return true;
        }
        return _operatorApprovals[owner][operator];
    }

    function _isApprovedOrShareOwner(
        address spender,
        bytes32 tokenId,
        address owner,
        uint32 share
    ) internal view virtual returns (bool) {
        return (_isApprovedForAll(owner, spender) ||
            _getApproved(tokenId, owner) == spender ||
            _shareOf(tokenId, spender) >= share);
    }

    function _shareOf(
        bytes32 tokenId,
        address owner
    ) internal view returns (uint32) {
        return _stockTokens[tokenId].shares[owner];
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits an {Approval} event.
     */
    function _approve(address to, bytes32 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;

        emit Approval(_requireValidOwner(tokenId), to, tokenId);
    }

    function _approve(
        address to,
        bytes32 tokenId,
        address shareOwner
    ) internal virtual {
        _tokenApprovals[_getTokenId(tokenId, shareOwner)] = to;
        emit Approval(shareOwner, to, tokenId);
    }

    function _requireValidOwner(
        bytes32 tokenId
    ) internal view returns (address) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
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

        PercentageToken memory token = _percentageTokens[tokenId];

        // if token is percentage
        if (token.creator != address(0)) {
            require(
                _requireValidOwner(tokenId) == from,
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

            StockToken storage equityToken = _stockTokens[tokenId];

            require(
                equityToken.shares[from] >= share,
                "ERC721: owner share is less than requested"
            );

            // if to does not own any share then increase the balance
            if (equityToken.shares[to] == 0) {
                _increaseBalance(to);
            }

            unchecked {
                equityToken.shares[to] += share;
                equityToken.shares[from] -= share;
            }

            // if from does not have any share left then decrease the balance
            if (equityToken.shares[from] == 0) {
                _decreaseBalance(from);
                // Clear approvals from the previous owner
                delete _tokenApprovals[tokenId];
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

    function _decreaseBalance(address from) internal {
        unchecked {
            _balances[from] -= 1;
        }
    }

    function _increaseBalance(address from) internal {
        unchecked {
            // Will not overflow unless all 2**256 token ids are minted to the same owner.
            // Given that tokens are minted one by one, it is impossible in practice that
            // this ever happens. Might change if we allow batch minting.
            // The ERC fails to describe this case.
            _balances[from] += 1;
        }
    }

    function _isShareToken(bytes32 tokenId) internal view returns (bool) {
        return _stockTokens[tokenId].totalNoOfShare > 0;
    }

    function _burn(bytes32 tokenId) internal {
        _requireMinted(tokenId);

        address from = _msgSender();
        require(_ownerOf(tokenId) == from, "Only owner can burn");

        if (_isShareToken(tokenId)) {
            delete _stockTokens[tokenId];
        } else {
            delete _percentageTokens[tokenId];
        }
        IOSNFTApprover.ProjectApprovedInfo memory projectApproveInfo = _approver
            .getApprovedProject(tokenId);

        // burn osd worth of project
        _burnProjectWorth(from, projectApproveInfo.worth);

        // burn NFT
        _approver.burnProject(tokenId);

        // decrease token count
        _decreaseBalance(from);
        emit Transfer(from, address(0), tokenId);
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
