// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

import "./erc2771_context.sol";
import "./interfaces/nft.sol";
import "./interfaces/osnft_meta.sol";

contract OSNFT is
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable,
    IOSNFT,
    ERC2771ContextUpgradeable
{
    // variables

    mapping(uint256 => ProjectInfo) internal _projects;
    mapping(address => uint256) internal _earning;
    mapping(uint256 => mapping(address => uint256)) internal _usersInvestments;

    uint8 mintRoyalty;
    uint8 burnRoyalty;
    bytes32 internal _TYPE_HASH_ProjectTokenizeData;
    bytes32 internal _TYPE_HASH_NFTMintData;
    IOSNFTMeta _metaContract;

    function initialize(string memory uri_, address meta_) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        mintRoyalty = 1;
        burnRoyalty = 2;
        __EIP712_init("OSNFT", "1");
        _TYPE_HASH_ProjectTokenizeData = keccak256(
            "ProjectTokenizeData(string projectUrl,address creator,uint256 validUntil)"
        );
        _TYPE_HASH_NFTMintData = keccak256(
            "NFTMintData(uint256 tokenId,uint256 star,uint256 fork,uint256 validUntil)"
        );
        _metaContract = IOSNFTMeta(meta_);
    }

    function getProject(
        uint256 tokenId
    ) external view returns (ProjectInfo memory) {
        ProjectInfo memory project = _projects[tokenId];
        if (project.creator == address(0)) {
            revert InvalidToken(tokenId);
        }
        return project;
    }

    function tokenizeProject(
        ProjectTokenizeInput calldata input,
        SignatureMeta calldata verifierSignatureData
    ) external {
        if (input.paymentToken == address(0)) {
            revert ZeroPaymentToken();
        }

        if (!_metaContract.isPayableToken(input.paymentToken)) {
            revert PaymentTokenNotAllowed();
        }

        _requireVerifier(verifierSignatureData.by);

        address creator = _msgSender();

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_ProjectTokenizeData,
                    keccak256(bytes(input.projectUrl)),
                    creator,
                    verifierSignatureData.validUntil
                )
            )
        );

        _requireValidSignature(digest, verifierSignatureData);

        uint256 tokenId = uint256(
            keccak256(abi.encodePacked(input.projectUrl))
        );

        if (input.creatorRoyalty > 10) {
            revert RoyaltyLimitExceeded();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.creator != address(0)) {
            revert ProjectExist();
        }

        project.creator = creator;
        project.basePrice = input.basePrice;
        project.paymentToken = input.paymentToken;
        project.popularityFactorPrice = input.popularityFactorPrice;
        project.creatorRoyalty = input.creatorRoyalty;

        // mint first nft to creator free of cost
        _mintTo(tokenId, creator);

        emit ProjectTokenize(
            tokenId,
            creator,
            input.basePrice,
            input.popularityFactorPrice,
            input.paymentToken,
            input.creatorRoyalty,
            input.projectUrl
        );
    }

    function mintTo(
        uint256 tokenId,
        uint256 star,
        uint256 fork,
        SignatureMeta calldata verifierSignatureData
    ) external {
        _requireVerifier(verifierSignatureData.by);

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTMintData,
                    tokenId,
                    star,
                    fork,
                    verifierSignatureData.validUntil
                )
            )
        );

        _requireValidSignature(digest, verifierSignatureData);

        _mintAndTakePayment(tokenId, star, fork, _msgSender());
    }

    function mintPrice(
        uint256 tokenId,
        uint256 star,
        uint256 fork
    ) public view returns (uint256) {
        ProjectInfo memory project = _projects[tokenId];
        uint256 popularityFactor = 5 * fork + 4 * star;
        uint256 calculatedMintPrice = project.basePrice +
            (project.popularityFactorPrice * popularityFactor);
        return
            calculatedMintPrice > project.lastMintPrice
                ? calculatedMintPrice
                : project.lastMintPrice;
    }

    function _mintAndTakePayment(
        uint256 tokenId,
        uint256 star,
        uint256 fork,
        address to
    ) internal {
        if (balanceOf(to, tokenId) > 0) {
            revert AlreadyMinted();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.creator == address(0)) {
            revert InvalidToken(tokenId);
        }

        uint256 calculatedMintPrice = mintPrice(tokenId, star, fork);

        // take full payment to the contract
        _requirePayment(
            project.paymentToken,
            to,
            address(this),
            calculatedMintPrice
        );

        // send Royalty to creator

        uint256 creatorRoyalty = _percentageOf(
            calculatedMintPrice,
            project.creatorRoyalty
        );

        _requirePaymentFromContract(
            project.paymentToken,
            project.creator,
            creatorRoyalty
        );

        // store money in treasury

        uint256 contractRoyalty = _percentageOf(
            calculatedMintPrice,
            mintRoyalty
        );

        _earning[project.paymentToken] += contractRoyalty;

        uint256 amountForTreasury = calculatedMintPrice -
            contractRoyalty -
            creatorRoyalty;

        project.treasuryAmount += amountForTreasury;
        project.lastMintPrice = calculatedMintPrice;
        _usersInvestments[tokenId][to] = calculatedMintPrice;

        // send money to creator

        _mintTo(tokenId, to);
        emit TokenMint(tokenId, to, star, fork, calculatedMintPrice);
    }

    function _mintTo(uint256 tokenId, address to) internal {
        _projects[tokenId].tokenCount++;
        _mint(to, tokenId, 1, "");
    }

    function getInvestedAmount(
        uint256 tokenId,
        address owner
    ) external view returns (uint256) {
        if (balanceOf(owner, tokenId) == 0) {
            revert RequireTokenOwner();
        }

        return _usersInvestments[tokenId][owner];
    }

    function burn(uint256 tokenId) external {
        address caller = _msgSender();

        if (balanceOf(caller, tokenId) == 0) {
            revert RequireTokenOwner();
        }
        ProjectInfo storage project = _projects[tokenId];

        uint256 returnAmount = project.treasuryAmount / project.tokenCount;
        uint256 usersInvestments = _usersInvestments[tokenId][caller];
        uint256 profit = returnAmount > usersInvestments
            ? returnAmount - usersInvestments
            : 0;

        project.tokenCount--;
        project.treasuryAmount -= returnAmount;

        uint256 burnRoyaltyAmount = 0;

        if (profit > 0) {
            burnRoyaltyAmount = _percentageOf(profit, burnRoyalty);
            _earning[project.paymentToken] += burnRoyaltyAmount;
        }

        _requirePaymentFromContract(
            project.paymentToken,
            caller,
            returnAmount - burnRoyaltyAmount
        );

        _burn(caller, tokenId, 1);
    }

    function _percentageOf(
        uint256 value,
        uint8 percentage
    ) internal pure returns (uint256) {
        return (value / 100) * percentage;
    }

    function _requirePayment(
        address tokenAddress,
        address from,
        address to,
        uint256 price
    ) internal nonReentrant {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        if (!paymentToken.transferFrom(from, to, price)) {
            revert PaymentFailed();
        }
    }

    function _requirePaymentFromContract(
        address tokenAddress,
        address to,
        uint256 price
    ) internal nonReentrant {
        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);
        if (!paymentToken.transfer(to, price)) {
            revert PaymentFailed();
        }
    }

    function getContractEarning(
        address paymentToken
    ) external view returns (uint256) {
        return _earning[paymentToken];
    }

    function withdrawEarning(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        withdrawEarningTo(owner(), tokenAddress, amount);
    }

    function withdrawEarningTo(
        address accountTo,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        _requirePayment(tokenAddress, address(this), accountTo, amount);
    }

    function _requireValidSignature(
        bytes32 digest,
        SignatureMeta calldata signatureData
    ) internal view {
        if (block.timestamp > signatureData.validUntil) {
            revert SignatureExpired();
        }

        if (
            ECDSA.recover(digest, signatureData.signature) != signatureData.by
        ) {
            revert InvalidSignature();
        }
    }

    function _requireVerifier(address value) internal view {
        if (!_metaContract.isVerifier(value)) {
            revert RequireVerifier();
        }
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        sender = ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
