// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

interface IOSNFT {
    // structs
    struct ProjectInfo {
        uint256 basePrice;
        address creator;
        address paymentERC20Token;
        // price of one popularity factor
        uint256 popularityFactorPrice;
        // last mint price
        uint256 lastMintPrice;
        uint8 creatorRoyalty;
        uint256 tokenCount;
        uint256 treasuryAmount;
    }

    struct SignatureMeta {
        bytes signature;
        uint256 validUntil;
        address by;
    }

    struct ProjectTokenizeInput {
        string projectUrl;
        uint256 basePrice;
        uint256 popularityFactorPrice;
        address paymentERC20Token;
        uint8 creatorRoyalty;
    }

    // errors
    error AlreadyMinted();
    error PaymentFailed();
    error RoyaltyLimitExceeded();
    error RequireTokenOwner();
    error RequireVerifier();
    error RequireRelayer();
    error ProjectExist();
    error SignatureExpired();
    error InvalidSignature();
    error PaymentTokenNotAllowed();
    error ZeroPaymentToken();

    // events
    event ProjectTokenize(
        uint256 indexed tokenId,
        address creator,
        uint256 basePrice,
        uint256 popularityFactorPrice,
        address paymentToken,
        uint8 creatorRoyalty,
        string projectUrl
    );
    event TokenMint(
        uint256 tokenId,
        address to,
        uint256 star,
        uint256 fork,
        uint256 mintPrice
    );

    function tokenizeProject(
        ProjectTokenizeInput calldata input,
        SignatureMeta calldata verifierSignatureData
    ) external;

    function tokenizeProjectTo(
        ProjectTokenizeInput calldata input,
        SignatureMeta calldata verifierSignatureData,
        address creator
    ) external;
}
