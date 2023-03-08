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
        mapping(address => uint256) userAmounts;
    }

    struct SignatureMeta {
        bytes signature;
        address to;
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

    // variables

    mapping(uint256 => ProjectInfo) internal _projects;
    mapping(address => uint256) internal _earning;
    mapping(address => bool) internal _minters;
    uint8 mintRoyality;
    uint8 burnRoyality;
    bytes32 internal _TYPE_HASH_ProjectTokenizeData;

    // events
    event ApproverAdded(address account);
    event ApproverRemoved(address account);
    event ProjectTokenize(
        uint256 indexed tokenId,
        uint256 basePrice,
        uint256 popularityFactorPrice,
        address paymentToken,
        uint8 royality,
        string projectUrl
    );

    function initialize(string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        mintRoyality = 1;
        burnRoyality = 2;
        __EIP712_init("OSNFT", "1");
        _TYPE_HASH_ProjectTokenizeData = keccak256(
            "ProjectTokenizeData(string projectUrl,uint256 basePrice,uint256 popularityFactorPrice,address paymentToken,uint8 royality)"
        );
    }

    function tokenizeProject(
        ProjectTokenizeInput calldata input,
        SignatureMeta calldata signatureData
    ) external onlyMinter {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPE_HASH_ProjectTokenizeData,
                    input.projectUrl,
                    input.basePrice,
                    input.paymentERC20Token,
                    input.popularityFactorPrice,
                    input.royality,
                    signatureData.validUntil
                )
            )
        );

        _requireValidSignature(digest, signatureData);

        uint256 tokenId = uint256(
            keccak256(abi.encodePacked(input.projectUrl))
        );

        if (input.royality > 10) {
            revert RoyalityLimitExceeded();
        }
        address caller = _msgSender();

        ProjectInfo storage project = _projects[tokenId];
        project.creator = signatureData.to;
        project.basePrice = input.basePrice;
        project.paymentERC20Token = input.paymentERC20Token;
        project.popularityFactorPrice = input.popularityFactorPrice;
        project.royality = input.royality;

        // mint first nft to creator
        _mintTo(tokenId, caller, 1, 1);

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
        address to,
        uint256 star,
        uint256 fork
    ) external onlyMinter {
        _mintTo(tokenId, to, star, fork);
    }

    function _mintTo(
        uint256 tokenId,
        address to,
        uint256 star,
        uint256 fork
    ) internal {
        if (balanceOf(to, tokenId) > 0) {
            revert AlreadyMinted();
        }

        ProjectInfo storage project = _projects[tokenId];

        if (project.creator != to) {
            uint256 popularityFactor = 5 * fork + 4 * star;
            uint256 mintPrice = project.basePrice +
                (project.popularityFactorPrice * popularityFactor);

            // take full payment to the contract
            _requirePayment(
                project.paymentERC20Token,
                to,
                address(this),
                mintPrice > project.lastMintPrice
                    ? mintPrice
                    : project.lastMintPrice
            );

            // send royality to creator

            uint256 creatorRoyality = _percentageOf(
                mintPrice,
                project.royality
            );

            _requirePayment(
                project.paymentERC20Token,
                address(this),
                project.creator,
                creatorRoyality
            );

            // store money in treasury

            uint256 contractRoyality = _percentageOf(mintPrice, mintRoyality);

            _earning[project.paymentERC20Token] = contractRoyality;

            uint256 treasuryAmount = mintPrice -
                contractRoyality -
                creatorRoyality;

            project.tokenCount++;
            project.treasuryTotalAmount += treasuryAmount;
        }

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

        uint256 profit = returnAmount - project.userAmounts[caller];

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
        emit ApproverAdded(account);
    }

    function removeMinter(address account) external onlyOwner {
        delete _minters[account];
        emit ApproverRemoved(account);
    }

    function _isMinter(address account) internal view returns (bool) {
        return _minters[account];
    }

    error SignatureExpired();
    error InvalidSignature();

    function _requireValidSignature(
        bytes32 digest,
        SignatureMeta calldata signatureData
    ) internal view {
        if (block.timestamp < signatureData.validUntil) {
            revert SignatureExpired();
        }

        if (
            ECDSA.recover(digest, signatureData.signature) == signatureData.to
        ) {
            revert InvalidSignature();
        }
    }

    // function _requireMinter() internal view {
    //     if (!_isMinter(_msgSender())) {
    //         revert RequireMinter();
    //     }
    // }

    modifier onlyMinter() {
        require(_isMinter(_msgSender()));
        _;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
