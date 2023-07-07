// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
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
    Ownable2StepUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable,
    IOSNFT,
    ERC2771ContextUpgradeable
{
    // variables
    // tokenId => ProjectInfo
    mapping(uint256 => ProjectInfo) internal _projects;
    // payableTokenAddress => amountEarned
    mapping(address => uint256) internal _earning;
    // tokenId => contributor => creator royalty paid in percentage with base 1000, ie 1% = 10
    mapping(uint256 => mapping(address => uint16)) internal _paidCreatorRoyalty;

    // percentage with base 1000, ie 1% = 10
    uint16 internal mintRoyalty;
    // percentage with base 1000, ie 1% = 10
    uint16 internal burnRoyalty;
    bytes32 internal _TYPE_HASH_ProjectTokenizeData;
    bytes32 internal _TYPE_HASH_NFTMintData;
    IOSNFTMeta internal _metaContract;

    function initialize(string memory uri_, address meta_) public initializer {
        __ERC1155_init(uri_);
        __Ownable2Step_init();

        mintRoyalty = 10;
        emit MintRoyaltyUpdated(10);
        burnRoyalty = 20;
        emit BurnRoyaltyUpdated(20);

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

        if (input.minCreatorRoyalty > 100) {
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
        project.minCreatorRoyalty = input.minCreatorRoyalty;

        // mint first nft to creator free of cost
        _mintTo(tokenId, creator);

        emit ProjectTokenized(
            tokenId,
            creator,
            input.basePrice,
            input.popularityFactorPrice,
            input.paymentToken,
            input.minCreatorRoyalty,
            input.projectUrl
        );
    }

    function isApprovedForAll(
        address account,
        address operator
    ) public view virtual override returns (bool) {
        return
            _metaContract.isApprovedForAll(operator) ||
            super.isApprovedForAll(account, operator);
    }

    function mintTo(
        uint256 tokenId,
        uint256 star,
        uint256 fork,
        uint16 royalty,
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

        _mintAndTakePayment(tokenId, star, fork, royalty, _msgSender());
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
        uint16 royalty,
        address to
    ) internal {
        if (balanceOf(to, tokenId) > 0) {
            revert AlreadyMinted();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.minCreatorRoyalty > royalty) {
            revert InadequateRoyalty();
        }

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
        uint256 creatorRoyalty = _percentageOf(calculatedMintPrice, royalty);

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
        _paidCreatorRoyalty[tokenId][to] = royalty;

        // send money to creator

        _mintTo(tokenId, to);
        emit TokenMinted(tokenId, to, star, fork, calculatedMintPrice, royalty);
    }

    function getPaidCreatorRoyalty(
        uint256 tokenId,
        address holder
    ) public view returns (uint16) {
        return _paidCreatorRoyalty[tokenId][holder];
    }

    function _mintTo(uint256 tokenId, address to) internal {
        _projects[tokenId].contributors++;
        _mint(to, tokenId, 1, "");
    }

    function burn(uint256 tokenId) external {
        address caller = _msgSender();

        if (balanceOf(caller, tokenId) == 0) {
            revert RequireTokenOwner();
        }

        ProjectInfo storage project = _projects[tokenId];
        uint16 paidCreatorRoyalty = _paidCreatorRoyalty[tokenId][caller];

        uint256 returnAmount = ((project.treasuryAmount *
            (1000 - paidCreatorRoyalty)) / (1000 - project.minCreatorRoyalty)) /
            project.contributors;

        project.contributors--;
        project.treasuryAmount -= returnAmount;

        delete _paidCreatorRoyalty[tokenId][caller];

        _requirePaymentFromContract(project.paymentToken, caller, returnAmount);

        _burn(caller, tokenId, 1);
    }

    function _percentageOf(
        uint256 value,
        uint16 percentage
    ) internal pure returns (uint256) {
        if (percentage > 1000) revert InvalidPercentage();
        return (value * percentage) / 1000;
    }

    function underflow() public returns (uint256) {
        return type(uint256).max + 1;
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

    // Owner Functions
    function updateMintRoyalty(uint16 newMintRoyalty) external onlyOwner {
        mintRoyalty = newMintRoyalty;
        emit MintRoyaltyUpdated(newMintRoyalty);
    }

    function updateBurnRoyalty(uint16 newBurnRoyalty) external onlyOwner {
        burnRoyalty = newBurnRoyalty;
        emit BurnRoyaltyUpdated(newBurnRoyalty);
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
        require(amount <= _earning[tokenAddress], "Amount exceed earning");
        _earning[tokenAddress] -= amount;
        _requirePaymentFromContract(tokenAddress, accountTo, amount);
    }

    // Overrides
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        sender = super._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return super._msgData();
    }

    function transferOwnership(
        address newOwner
    )
        public
        virtual
        override(Ownable2StepUpgradeable, OwnableUpgradeable)
        onlyOwner
    {
        super.transferOwnership(newOwner);
    }

    function _transferOwnership(
        address newOwner
    ) internal virtual override(Ownable2StepUpgradeable, OwnableUpgradeable) {
        super._transferOwnership(newOwner);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
