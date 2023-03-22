// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "./interfaces/nft.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract OSNFTRelayer is EIP712 {
    using ECDSA for bytes32;

    error SignatureExpired();
    error SignatureNotMatchRequest();
    error RequestFailed();
    // "Forwarded call did not succeed"

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 validUntil;
        bytes data;
    }

    //variables

    bytes32 private constant _TYPEHASH =
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 validUntil,bytes data)"
        );

    constructor() EIP712("OSNFT_RELAYER", "1") {}

    function verifySignature_(
        ForwardRequest calldata req,
        bytes calldata signature
    ) internal view {
        if (block.timestamp > req.validUntil) {
            revert SignatureExpired();
        }
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.validUntil,
                    keccak256(req.data)
                )
            )
        ).recover(signature);
        if (signer != req.from) {
            revert SignatureNotMatchRequest();
        }
    }

    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) external {
        verifySignature_(req, signature);

        (bool success, bytes memory returndata) = req.to.call{
            gas: req.gas,
            value: req.value
        }(abi.encodePacked(req.data, req.from));

        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.limo/blog/ethereum-gas-dangers/
        if (gasleft() <= req.gas / 63) {
            // We explicitly trigger invalid opcode to consume all gas and bubble-up the effects, since
            // neither revert or assert consume all gas since Solidity 0.8.0
            // https://docs.soliditylang.org/en/v0.8.0/control-structures.html#panic-via-assert-and-error-via-require
            /// @solidity memory-safe-assembly
            assembly {
                invalid()
            }
        }

        // return (success, returndata);
        _verifyCallResult(success, returndata);
    }

    function _verifyCallResult(
        bool success,
        bytes memory returndata
    ) private pure {
        if (!success) {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert RequestFailed();
            }
        }
    }
}
