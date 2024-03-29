// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;
import "./interfaces/osnft_meta.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
// @audit this import is not needed as there's no function in this contract that needs the msg.sender context
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract OSNFTMeta is
    IOSNFTMeta,
    Initializable,
    ContextUpgradeable,
    Ownable2StepUpgradeable
{
    mapping(address => uint256) internal _paymentTokensAllowed;
    mapping(address => uint256) internal _verifiers;
    address internal defaultMarketplace_;
    address internal defaultLoanProvider_;

    function initialize() public initializer {
        __Ownable2Step_init();
    }

    function addPayableTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 index = 0; index < tokens.length; index++) {
            _paymentTokensAllowed[tokens[index]] = 1;
        }
    }

    function removePayableToken(address token) external onlyOwner {
        delete _paymentTokensAllowed[token];
    }

    function isPayableToken(address token) public view returns (bool) {
        return _paymentTokensAllowed[token] == 1;
    }

    function isVerifier(address account) external view returns (bool) {
        return _verifiers[account] == 1;
    }

    function addVerifier(address account) external onlyOwner {
        _verifiers[account] = 1;
        emit VerifierAdded(account);
    }

    function removeVerifier(address account) external onlyOwner {
        delete _verifiers[account];
        emit VerifierRemoved(account);
    }

    function isApprovedForAll(address operator) public view returns (bool) {
        return
            operator == defaultMarketplace_ || operator == defaultLoanProvider_;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
