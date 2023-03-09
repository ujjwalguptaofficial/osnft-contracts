// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract OSNFT is
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable
{
    // structs
    struct ProjectInfo {
        uint256 basePrice;
        address creator;
        address paymentERC20Token;
        // price of one popularity factor
        uint256 popularityFactorPrice;
        // last mint price

        uint256 lastMintPrice;
        uint8 royality;
        uint256 tokenCount;
        uint256 treasuryTotalAmount;
    }

    struct SignatureMeta {
        bytes signature;
        uint256 validUntil;
    }

    struct ProjectTokenizeInput {
        string projectUrl;
        uint256 basePrice;
        uint256 popularityFactorPrice;
        address paymentERC20Token;
        uint8 royality;
    }

    // errors
    error AlreadyMinted();
    error PaymentFailed();
    error RoyalityLimitExceeded();
    error RequireTokenOwner();
    error RequireMinter();
    error ProjectExist();
    error SignatureExpired();
    error InvalidSignature();
    error PaymentTokenNotAllowed();

    // variables

    mapping(uint256 => ProjectInfo) internal _projects;
    mapping(address => uint256) internal _earning;
    mapping(address => bool) internal _minters;
    mapping(uint256 => mapping(address => uint256)) internal _usersInvestments;
    mapping(address => bool) internal _paymentTokensAllowed;

    uint8 mintRoyality;
    uint8 burnRoyality;
    bytes32 internal _TYPE_HASH_ProjectTokenizeData;
    bytes32 internal _TYPE_HASH_NFTMintData;

    // events
    event MinterAdded(address account);
    event MinterRemoved(address account);
    event ProjectTokenize(
        uint256 indexed tokenId,
        uint256 basePrice,
        uint256 popularityFactorPrice,
        address paymentToken,
        uint8 royality,
        string projectUrl
    );
    event TokenMint(uint256 star, uint256 fork, uint256 mintPrice);

    function initialize(string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        mintRoyality = 1;
        burnRoyality = 2;
        __EIP712_init("OSNFT", "1");
        _TYPE_HASH_ProjectTokenizeData = keccak256(
            "ProjectTokenizeData(string projectUrl,uint256 basePrice,uint256 popularityFactorPrice,address paymentToken,uint8 royality,uint256 validUntil)"
        );
        _TYPE_HASH_NFTMintData = keccak256(
            "NFTMintData(uint256 tokenId,uint256 star,uint256 fork,uint256 validUntil)"
        );
    }

    function getProject(
        uint256 tokenId
    ) external view returns (ProjectInfo memory) {
        return _projects[tokenId];
    }

    function addPayableTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 index = 0; index < tokens.length; index++) {
            _paymentTokensAllowed[tokens[index]] = true;
        }
    }

    function removePayableToken(address token) external onlyOwner {
        delete _paymentTokensAllowed[token];
    }

    function isPayableToken(address token) public view returns (bool) {
        return _paymentTokensAllowed[token];
    }

    function tokenizeProject(
        ProjectTokenizeInput calldata input,
        SignatureMeta calldata signatureData
    ) external onlyMinter {
        if (!_paymentTokensAllowed[input.paymentERC20Token]) {
            revert PaymentTokenNotAllowed();
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_ProjectTokenizeData,
                    keccak256(bytes(input.projectUrl)),
                    input.basePrice,
                    input.popularityFactorPrice,
                    input.paymentERC20Token,
                    input.royality,
                    signatureData.validUntil
                )
            )
        );

        address to = _requireValidSignature(digest, signatureData);

        uint256 tokenId = uint256(
            keccak256(abi.encodePacked(input.projectUrl))
        );

        if (input.royality > 10) {
            revert RoyalityLimitExceeded();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.creator != address(0)) {
            revert ProjectExist();
        }

        project.creator = to;
        project.basePrice = input.basePrice;
        project.paymentERC20Token = input.paymentERC20Token;
        project.popularityFactorPrice = input.popularityFactorPrice;
        project.royality = input.royality;

        // mint first nft to creator free of cost
        _mintTo(tokenId, 1, 1, project.creator);

        emit ProjectTokenize(
            tokenId,
            input.basePrice,
            input.popularityFactorPrice,
            input.paymentERC20Token,
            input.royality,
            input.projectUrl
        );
    }

    function mintTo(
        uint256 tokenId,
        uint256 star,
        uint256 fork,
        SignatureMeta calldata signatureData
    ) external onlyMinter {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_NFTMintData,
                    tokenId,
                    star,
                    fork,
                    signatureData.validUntil
                )
            )
        );

        address to = _requireValidSignature(digest, signatureData);

        _mintTo(tokenId, star, fork, to);
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

    function _mintTo(
        uint256 tokenId,
        uint256 star,
        uint256 fork,
        address to
    ) internal {
        if (balanceOf(to, tokenId) > 0) {
            revert AlreadyMinted();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.creator != to) {
            uint256 calculatedMintPrice = mintPrice(tokenId, star, fork);

            // take full payment to the contract
            _requirePayment(
                project.paymentERC20Token,
                to,
                address(this),
                calculatedMintPrice
            );

            // send royality to creator

            uint256 creatorRoyality = _percentageOf(
                calculatedMintPrice,
                project.royality
            );

            _requirePayment(
                project.paymentERC20Token,
                to,
                address(this),
                creatorRoyality
            );

            // store money in treasury

            uint256 contractRoyality = _percentageOf(
                calculatedMintPrice,
                mintRoyality
            );

            _earning[project.paymentERC20Token] = contractRoyality;

            uint256 treasuryAmount = calculatedMintPrice -
                contractRoyality -
                creatorRoyality;

            project.treasuryTotalAmount += treasuryAmount;
            project.lastMintPrice = calculatedMintPrice;
            _usersInvestments[tokenId][to] = calculatedMintPrice;
            emit TokenMint(star, fork, calculatedMintPrice);
        }
        project.tokenCount++;

        _mint(to, tokenId, 1, "");
    }

    function burn(uint256 tokenId) external {
        address caller = _msgSender();

        if (balanceOf(caller, tokenId) == 0) {
            revert RequireTokenOwner();
        }
        ProjectInfo storage project = _projects[tokenId];

        uint256 returnAmount = project.treasuryTotalAmount / project.tokenCount;

        project.tokenCount--;
        project.treasuryTotalAmount -= returnAmount;

        uint256 profit = returnAmount - _usersInvestments[tokenId][caller];

        uint256 burnRoyalityAmount = profit > 0
            ? _percentageOf(returnAmount, burnRoyality)
            : 0;
        if (burnRoyalityAmount > 0) {
            _earning[project.paymentERC20Token] += burnRoyalityAmount;
        }

        _requirePayment(
            project.paymentERC20Token,
            address(this),
            caller,
            returnAmount - burnRoyalityAmount
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

    function getContractEarning(
        address paymentToken
    ) external view onlyOwner returns (uint256) {
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

    function isMinter(address account) external view returns (bool) {
        return _isMinter(account);
    }

    function addMinter(address account) external onlyOwner {
        _minters[account] = true;
        emit MinterAdded(account);
    }

    function removeMinter(address account) external onlyOwner {
        delete _minters[account];
        emit MinterRemoved(account);
    }

    function _isMinter(address account) internal view returns (bool) {
        return _minters[account];
    }

    function _requireValidSignature(
        bytes32 digest,
        SignatureMeta calldata signatureData
    ) internal view returns (address) {
        if (block.timestamp > signatureData.validUntil) {
            revert SignatureExpired();
        }

        return ECDSA.recover(digest, signatureData.signature);
    }

    modifier onlyMinter() {
        if (!_isMinter(_msgSender())) {
            revert RequireMinter();
        }
        _;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}