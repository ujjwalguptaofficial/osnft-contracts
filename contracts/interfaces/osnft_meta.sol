// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

interface IOSNFTMeta {
    // events
    event VerifierAdded(address account);
    event VerifierRemoved(address account);

    function getRelayer() external view returns (address);

    function setRelayer(address relayer) external;

    function isRelayer(address value) external view returns (bool);

    function addPayableTokens(address[] calldata tokens) external;

    function removePayableToken(address token) external;

    function isPayableToken(address token) external view returns (bool);

    function isVerifier(address account) external view returns (bool);

    function addVerifier(address account) external;

    function removeVerifier(address account) external;
}
