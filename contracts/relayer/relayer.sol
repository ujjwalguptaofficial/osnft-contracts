// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./relayer_base.sol";

contract OSDRelayer is OSDRelayerBase {
    constructor(address marketplace_) OSDRelayerBase(marketplace_) {}
}
