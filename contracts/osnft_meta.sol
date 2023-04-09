// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "./interfaces/osnft_meta.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract OSNFTMeta is
    IOSNFTMeta,
    Initializable,
    ContextUpgradeable,
    OwnableUpgradeable
{
    mapping(address => bool) internal _paymentTokensAllowed;
    mapping(address => bool) internal _verifiers;
    address internal defaultMarketplace_;

    function initialize() public initializer {
        __Ownable_init();
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

    function isVerifier(address account) external view returns (bool) {
        return _verifiers[account];
    }

    function addVerifier(address account) external onlyOwner {
        _verifiers[account] = true;
        emit VerifierAdded(account);
    }

    function removeVerifier(address account) external onlyOwner {
        delete _verifiers[account];
        emit VerifierRemoved(account);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
