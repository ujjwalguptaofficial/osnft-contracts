// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract OSNFT is
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
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

    error AlreadyMinted();
    error PaymentFailed();
    error RoyalityLimitExceeded();
    error RequireTokenOwner();

    mapping(uint256 => ProjectInfo) internal _projects;
    mapping(address => uint256) internal _earning;

    function initialize(string memory uri_) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
    }

    function createProject(
        string memory projectUrl,
        uint256 basePrice,
        uint256 popularityFactorPrice,
        address paymentERC20Token,
        uint8 royality
    ) external {
        uint256 tokenId = uint256(keccak256(abi.encodePacked(projectUrl)));
        if (royality > 10) {
            revert RoyalityLimitExceeded();
        }
        address caller = _msgSender();

        ProjectInfo storage project = _projects[tokenId];
        project.creator = caller;
        project.basePrice = basePrice;
        project.paymentERC20Token = paymentERC20Token;
        project.popularityFactorPrice = popularityFactorPrice;
        project.lastMintPrice = 0;
        project.royality = royality;
        project.tokenCount = 0;
        project.treasuryTotalAmount = 0;

        // mint first nft to creator
        _mintTo(tokenId, caller, 1, 1);
    }

    function mint(uint256 tokenId, uint256 star, uint256 fork) external {
        _mintTo(tokenId, _msgSender(), star, fork);
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

            uint256 contractRoyality = _percentageOf(mintPrice, 1);

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

        _requirePayment(
            project.paymentERC20Token,
            address(this),
            caller,
            profit > 0 ? _percentageOf(returnAmount, 100 - 2) : returnAmount
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

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
