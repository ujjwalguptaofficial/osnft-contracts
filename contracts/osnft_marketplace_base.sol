// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/marketplace.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/erc721_upgradable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract OSNFTMarketPlaceBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTMarketPlaceUpgradeable,
    ReentrancyGuardUpgradeable
{
    // tokenId -> { shareOwner: Listing }
    mapping(bytes32 => mapping(address => Listing)) private _sellListings;
    mapping(address => bool) private _erc20TokensAllowed;

    IERC721Upgradeable private _nftContract;

    /**
     * @dev Initializes the contract
     */
    function __MarketPlace_init__(address nft_) internal onlyInitializing {
        _nftContract = IERC721Upgradeable(nft_);
    }

    function _requireNotListed(bytes32 tokenId, address shareOwner)
        internal
        view
    {
        Listing memory listing = _sellListings[tokenId][shareOwner];
        require(listing.price <= 0, "already listed");
    }

    function _requireListed(bytes32 tokenId, address shareOwner) internal view {
        Listing memory listing = _sellListings[tokenId][shareOwner];
        require(listing.price > 0, "not listed");
    }

    function _requireNftOwner(bytes32 tokenId, address spender) internal view {
        if (_nftContract.isShareToken(tokenId)) {
            require(
                _nftContract.shareOf(tokenId, spender) > 0,
                "not share owner"
            );
        } else {
            address owner = _nftContract.ownerOf(tokenId);
            require(spender == owner, "not owner");
        }
    }

    function addPayableToken(address token) external onlyOwner {
        _erc20TokensAllowed[token] = true;
    }

    function removePayableToken(address token) external onlyOwner {
        delete _erc20TokensAllowed[token];
    }

    function isPayableToken(address token) public view returns (bool) {
        return _erc20TokensAllowed[token];
    }

    function listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external {
        //  should not be listed before
        _requireNotListed(tokenId, _msgSender());

        // should be owner
        _requireNftOwner(tokenId, _msgSender());

        _listItem(tokenId, share, price, erc20token);
    }

    function _listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address payableToken
    ) internal {
        require(price > 0, "Price must be above zero");

        require(isPayableToken(payableToken), "token is not payable");

        // token should be approved for marketplace, so that it can transfer to buyer
        // in case of osnft, it won't happen but let's add this
        if (_nftContract.getApproved(tokenId) != address(this)) {
            revert NotApprovedForMarketplace();
        }

        _sellListings[tokenId][_msgSender()] = Listing(
            price,
            _msgSender(),
            share,
            payableToken
        );
    }

    function cancelListing(bytes32 tokenId) external {
        // should be owner
        _requireNftOwner(tokenId, _msgSender());
        // nft should be listed
        _requireListed(tokenId, _msgSender());

        delete (_sellListings[tokenId][_msgSender()]);
        emit ItemCanceled(_msgSender(), tokenId);
    }

    function buyItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address seller
    ) external nonReentrant {
        address buyer = _msgSender();
        _requireListed(tokenId, seller);

        Listing memory listedItem = _sellListings[tokenId][seller];
        if (price < listedItem.price) {
            revert PriceNotMet(tokenId, listedItem.price);
        }

        delete (_sellListings[tokenId][seller]);
        _nftContract.safeTransferFrom(
            listedItem.seller,
            seller,
            tokenId,
            share
        );

        ERC20Upgradeable erc20Token = ERC20Upgradeable(
            listedItem.payableTokenAddress
        );

        erc20Token.transferFrom(buyer, seller, price);

        emit ItemBought(_msgSender(), tokenId, listedItem.price);
    }

    function updateListing(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external {
        _requireListed(tokenId, _msgSender());
        _listItem(tokenId, share, price, erc20token);
        emit ItemListed(_msgSender(), tokenId, share, price);
    }

    function getListing(bytes32 tokenId, address seller)
        external
        view
        returns (Listing memory)
    {
        return _sellListings[tokenId][seller];
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
