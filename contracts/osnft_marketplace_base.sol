// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/marketplace.sol";
import "./interfaces/erc721_upgradable.sol";
import "./interfaces/erc721_receiver_upgradable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "./string_helper.sol";

contract OSNFTMarketPlaceBase is
    Initializable,
    OwnableUpgradeable,
    IOSNFTMarketPlaceUpgradeable,
    IERC721ReceiverUpgradeable
{
    using StringHelper for bytes32;

    // tokenId -> { shareOwner: Listing }
    mapping(bytes32 => Listing) private _sellListings;

    mapping(address => bool) private _erc20TokensAllowed;

    mapping(address => mapping(address => uint256)) private _balance;

    IERC721Upgradeable private _nftContract;

    uint8 public marketPlaceRoyality;

    /**
     * @dev Initializes the contract
     */
    function __MarketPlace_init(address nft_) internal onlyInitializing {
        _nftContract = IERC721Upgradeable(nft_);
        marketPlaceRoyality = 2;
    }

    function _requireNotListed(bytes32 sellId) internal view {
        Listing memory listing = _sellListings[sellId];
        require(listing.price <= 0, "Already on sale");
    }

    function _requireListed(bytes32 sellId)
        internal
        view
        returns (Listing memory)
    {
        Listing memory listing = _sellListings[sellId];
        require(listing.price > 0, "Require NFT listed");
        return listing;
    }

    function _requireNftOwner(
        bytes32 tokenId,
        address spender,
        uint32 share
    ) internal view {
        if (_nftContract.isShareToken(tokenId)) {
            require(share > 0, "Require input share to be above zero");
            uint32 shareOfOwner = _nftContract.shareOf(tokenId, spender);
            require(shareOfOwner >= share, "Owns less share than input");
        } else {
            address owner = _nftContract.ownerOf(tokenId);
            require(spender == owner, "Require NFT ownership");
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

    function onERC721Received(
        address operator,
        address from,
        bytes32 tokenId,
        uint32 share,
        bytes calldata data
    ) external returns (bytes4) {
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }

    function listNFTOnSale(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address erc20token
    ) external {
        address caller = _msgSender();

        bytes32 sellId = _getSellId(tokenId, caller);

        //  should not be listed before
        _requireNotListed(sellId);

        // should be owner
        _requireNftOwner(tokenId, caller, share);

        _listItem(tokenId, share, price, erc20token);

        emit NFTSaleAdded(tokenId, caller, sellId, share, price, erc20token);
    }

    function _requirePayableToken(address payableToken) internal view {
        require(isPayableToken(payableToken), "Invalid payment token");
    }

    function _requireTokenApproved(bytes32 tokenId) internal view {
        // token should be approved for marketplace, so that it can transfer to buyer
        // in case of osnft, it won't happen but let's add this

        require(
            _nftContract.isApprovedForAll(_msgSender(), address(this)) ||
                _nftContract.getApproved(tokenId) == address(this),
            "Require NFT ownership transfer approval"
        );
    }

    function _listItem(
        bytes32 tokenId,
        uint32 share,
        uint256 price,
        address paymentTokenAddress
    ) internal {
        require(price > 0, "Price must be above zero");

        _requirePayableToken(paymentTokenAddress);

        _requireTokenApproved(tokenId);

        bytes32 sellId = _getSellId(tokenId, _msgSender());
        _sellListings[sellId] = Listing({
            tokenId: tokenId,
            price: price,
            seller: _msgSender(),
            share: share,
            paymentTokenAddress: paymentTokenAddress
        });
    }

    function removeNFTSale(bytes32 sellId) external {
        // nft should be listed
        Listing memory listing = _requireListed(sellId);

        // should be owner
        _requireNftOwner(listing.tokenId, _msgSender(), listing.share);

        delete (_sellListings[sellId]);
        emit NftSaleCanceled(_msgSender(), listing.tokenId);
    }

    function _percentageOf(uint256 value, uint8 percentage)
        internal
        pure
        returns (uint256)
    {
        return (value / 100) * (percentage);
    }

    function buyNFT(
        bytes32 sellId,
        uint32 share,
        uint256 price
    ) external {
        address buyer = _msgSender();
        Listing memory listedItem = _requireListed(sellId);

        bytes32 tokenId = listedItem.tokenId;
        bool isShareToken = listedItem.share > 0;
        if (isShareToken) {
            require(
                share <= listedItem.share,
                "Input share is greater than listed"
            );

            price = price * share;
        }
        require(price >= listedItem.price, "Price not met");

        if (isShareToken) {
            // will no overflow  as input share is already checked
            // share will be always less than or equal to stored share
            unchecked {
                _sellListings[sellId].share -= share;
            }
        } else {
            delete (_sellListings[sellId]);
        }

        _processNFTSell(
            NftSellData({
                tokenId: tokenId,
                share: share,
                buyer: buyer,
                seller: listedItem.seller,
                price: price,
                paymentTokenAddress: listedItem.paymentTokenAddress,
                sellType: SELL_TYPE.Buy
            })
        );

        emit NFTBought(buyer, tokenId, listedItem.price, share);
    }

    function _processNFTSell(NftSellData memory sellData) internal {
        address seller = sellData.seller;

        address nftOwner = sellData.sellType == SELL_TYPE.Buy
            ? seller
            : address(this);

        // transfer price amount from buyer to marketplace

        address paymentTokenAddress = sellData.paymentTokenAddress;
        _requirePayment(
            paymentTokenAddress,
            sellData.buyer,
            address(this),
            sellData.price
        );

        // transfer nft from owner to buyer
        _nftContract.safeTransferFrom(
            nftOwner,
            sellData.buyer,
            sellData.tokenId,
            sellData.share
        );

        address tokenCreator = _nftContract.creatorOf(sellData.tokenId);

        uint256 amountForMarketplace = _percentageOf(
            sellData.price,
            marketPlaceRoyality
        );
        uint256 amountForSeller = sellData.price - amountForMarketplace;

        if (
            seller != tokenCreator &&
            !_nftContract.isShareToken(sellData.tokenId)
        ) {
            uint8 percentageOfCreator = _nftContract.creatorCut(
                sellData.tokenId
            );
            if (percentageOfCreator > 0) {
                uint256 amountForCreator = _percentageOf(
                    sellData.price,
                    percentageOfCreator
                );

                // will not oveflow/ underflow
                // no underflow - amount for creator will be always less than amountForSeller
                // no overflow as substraction and amountForCreator will be always positive as uint
                unchecked {
                    amountForSeller = amountForSeller - amountForCreator;
                }

                // store creator money
                _updateBalance(
                    tokenCreator,
                    amountForCreator,
                    paymentTokenAddress
                );
            }
        }

        // store seller money
        _updateBalance(seller, amountForSeller, paymentTokenAddress);
    }

    function _updateBalance(
        address account,
        uint256 amount,
        address paymentTokenAddress
    ) internal {
        _balance[account][paymentTokenAddress] += amount;
    }

    function _requirePayment(
        address tokenAddress,
        address from,
        address to,
        uint256 price
    ) internal {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        require(paymentToken.transferFrom(from, to, price), "Payment failed");
    }

    function updateNFTOnSale(
        bytes32 sellId,
        uint32 share,
        uint256 price,
        address paymentTokenAddress
    ) external {
        Listing memory listedNft = _requireListed(sellId);
        _listItem(listedNft.tokenId, share, price, paymentTokenAddress);
        emit NFTSaleUpdated(sellId, share, price, paymentTokenAddress);
    }

    function getNFTFromSale(bytes32 sellId)
        external
        view
        returns (Listing memory)
    {
        return _sellListings[sellId];
    }

    mapping(bytes32 => Auction) _auctions;

    function _getSellId(bytes32 nftId, address seller)
        internal
        pure
        returns (bytes32)
    {
        // encodePacked can have hashed collision with multiple arguments,
        // encode is safe
        return keccak256(abi.encode(nftId, seller));
    }

    function createAuction(
        bytes32 _nftId,
        uint32 share,
        uint256 _initialBid,
        uint256 _endAuction,
        address _addressPaymentToken
    ) external {
        // Check if the endAuction time is valid
        require(_endAuction > block.timestamp, "Invalid end date for auction");

        // Check if the initial bid price is > 0
        require(_initialBid > 0, "Require bid price above zero");

        address seller = _msgSender();

        _requireNftOwner(_nftId, seller, share);

        _requireTokenApproved(_nftId);

        bytes32 auctionId = _getSellId(_nftId, _msgSender());

        // not listed for sells
        _requireNotListed(auctionId);

        _requirePayableToken(_addressPaymentToken);

        // Lock NFT in Marketplace contract
        _nftContract.safeTransferFrom(seller, address(this), _nftId, share);

        // Create new Auction object
        Auction memory newAuction = Auction({
            tokenId: _nftId,
            share: share,
            seller: seller,
            paymentTokenAddress: _addressPaymentToken,
            currentBidOwner: address(0),
            currentBidPrice: _initialBid,
            endAuction: _endAuction,
            bidCount: 0
        });
        _auctions[auctionId] = newAuction; // add auction to list

        // Trigger event and return index of new auction
        emit NewAuction(
            _nftId,
            seller,
            auctionId,
            share,
            _initialBid,
            _endAuction,
            _addressPaymentToken
        );
    }

    function isAuctionOpen(bytes32 auctionId) public view returns (bool) {
        Auction storage auction = _auctions[auctionId];
        return auction.endAuction > block.timestamp;
    }

    function _requireAuctioned(bytes32 auctionId)
        internal
        view
        returns (Auction memory)
    {
        Auction memory auction = _auctions[auctionId];
        require(auction.currentBidPrice > 0, "No auction found");
        return auction;
    }

    function getCurrentBidOwner(bytes32 auctionId)
        public
        view
        returns (address)
    {
        Auction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidOwner;
    }

    function getCurrentBidPrice(bytes32 auctionId)
        public
        view
        returns (uint256)
    {
        Auction memory auction = _requireAuctioned(auctionId);
        return auction.currentBidPrice;
    }

    function placeBid(bytes32 auctionId, uint256 bidAmount) external {
        _requireAuctioned(auctionId);
        Auction storage auction = _auctions[auctionId];

        // check if auction is still open
        require(isAuctionOpen(auctionId), "Auction is not open");

        // check if new bid price is higher than the current one
        require(
            bidAmount > auction.currentBidPrice,
            "New bid price must be higher than current bid"
        );

        address buyer = _msgSender();

        // check if new bider is not the owner
        require(
            buyer != auction.seller,
            "Creator of auction cannot place new bid"
        );

        // get ERC20 token contract
        ERC20Upgradeable paymentToken = ERC20Upgradeable(
            auction.paymentTokenAddress
        );

        // transfer token from new bider account to the marketplace account
        // to lock the tokens
        require(
            paymentToken.transferFrom(buyer, address(this), bidAmount),
            "Tranfer of token failed"
        );

        // new bid is valid so must refund the current bid owner (if there is one!)
        if (auction.bidCount > 0) {
            paymentToken.transfer(
                auction.currentBidOwner,
                auction.currentBidPrice
            );
        }

        // update auction info
        address payable newBidOwner = payable(msg.sender);
        auction.currentBidOwner = newBidOwner;
        auction.currentBidPrice = bidAmount;
        auction.bidCount++;

        emit NewBidOnAuction(auctionId, bidAmount);
    }

    function claimNFT(bytes32 auctionId) external {
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        address caller = _msgSender();

        // Get auction
        Auction storage auction = _auctions[auctionId];

        require(
            caller == auction.seller || caller == auction.currentBidOwner,
            "Claimable by seller or bid owner"
        );

        delete _auctions[auctionId];

        _processNFTSell(
            NftSellData({
                tokenId: auction.tokenId,
                share: auction.share,
                buyer: auction.currentBidOwner,
                seller: auction.seller,
                price: auction.currentBidPrice,
                paymentTokenAddress: auction.paymentTokenAddress,
                sellType: SELL_TYPE.Bid
            })
        );

        emit NFTClaimed(auctionId, auction.tokenId);
    }

    function refund(bytes32 auctionId) external {
        _requireAuctioned(auctionId);

        // Check if the auction is closed
        require(!isAuctionOpen(auctionId), "Auction is still open");

        // Get auction
        Auction memory auction = _auctions[auctionId];

        require(
            auction.currentBidOwner == address(0),
            "Bider exist for this auction"
        );

        delete _auctions[auctionId];

        // Transfer NFT back from marketplace contract
        // to the creator of the auction
        _nftContract.transferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        emit NFTRefunded(auctionId, auction.tokenId);
    }

    function balanceOf(address user, address tokenAddress)
        public
        view
        returns (uint256)
    {
        return _balance[user][tokenAddress];
    }

    function withdrawToken(address tokenAddress) external {
        _requirePayment(
            tokenAddress,
            address(this),
            _msgSender(),
            balanceOf(_msgSender(), tokenAddress)
        );
    }

    function withdrawPaymentByOwner(address tokenAddress, uint256 amount)
        external
        onlyOwner
    {
        withdrawPaymentByOwner(tokenAddress, amount, owner());
    }

    function withdrawPaymentByOwner(
        address tokenAddress,
        uint256 amount,
        address accountTo
    ) public onlyOwner {
        _requirePayment(tokenAddress, address(this), accountTo, amount);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
