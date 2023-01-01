// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../interfaces/relayer.sol";
import "../interfaces/marketplace.sol";

contract OSDRelayerBase is EIP712, IOsNFTRelayer {
    using ECDSA for bytes32;

    IOSNFTMarketPlaceUpgradeable internal _marketplace;

    constructor(address marketplace_) EIP712("OSNFT_RELAYER", "1") {
        _marketplace = IOSNFTMarketPlaceUpgradeable(marketplace_);
    }

    function _requireDeadlineNotExpired(
        SignatureMeta calldata signatureData
    ) internal view {
        require(block.timestamp < signatureData.deadline, "Signature expired");
    }
}
