// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * MainStreetVerifier — on-chain EIP-712 verifier for MainStreet reputation scores.
 *
 * Off-chain compute, on-chain proof. Same trust model as Chainlink CCIP-Read:
 *   1. Caller fetches a signed attestation from
 *      https://avisradar-production.up.railway.app/api/agent/attestation/{address}
 *   2. Passes the signed payload fields + signature as tx calldata
 *   3. This contract verifies signer == MainStreet operator + score >= threshold + recency
 *
 * The EIP-712 type below MATCHES the live signer exactly (verified end-to-end: a real
 * attestation passed to `verifiedScore` returns the signed score). Field types are
 * bytes32 subject / uint8 score / uint64 timestamp / uint64 nonce, version "mainstreet-v1".
 * (An earlier draft of this file used address/uint256/v"0.1" — that did NOT match the
 * deployed contract or the signer; corrected here.)
 *
 * Usage example (buyer smart contract):
 *
 *   import { MainStreetVerifier } from "@raskhaaa/mainstreet-oracle/contracts/MainStreetVerifier.sol";
 *
 *   contract MyBuyer {
 *       MainStreetVerifier constant MS = MainStreetVerifier(0x7397adb9713934c36d22aa54b4dbbcd70263592b);
 *
 *       function payAgent(
 *           bytes32 subject, uint256 amount,
 *           uint8 score, uint64 timestamp, uint64 nonce, bytes calldata sig
 *       ) external {
 *           MS.requireMinScore(subject, 50, score, timestamp, nonce, sig);
 *           // ... your payment logic ...
 *       }
 *   }
 *
 * Deployed: 0x7397adb9713934c36d22aa54b4dbbcd70263592b on Base mainnet (chain 8453).
 * MainStreet operator (signer): 0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9
 * Domain: { name: "MainStreet", version: "1", chainId: 8453 } (no verifyingContract —
 *         attestations are portable, recovered against this fixed domain).
 * Off-chain equivalent: `@raskhaaa/mainstreet-oracle/verifier` (verifyAttestation / requireMinScore).
 *
 * MIT licensed.
 */
contract MainStreetVerifier {
    // EIP-712 domain separator (precomputed at deploy time)
    bytes32 public immutable DOMAIN_SEPARATOR;

    // MainStreet's signing operator wallet. Immutable post-deploy.
    address public immutable OPERATOR;

    // Max staleness for an attestation (in seconds). Default 24h.
    uint256 public immutable MAX_AGE;

    // EIP-712 Attestation type hash (matches the off-chain signer exactly).
    // keccak256("Attestation(string version,string subjectType,bytes32 subject,uint8 score,uint64 timestamp,address operator,uint64 nonce)")
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(string version,string subjectType,bytes32 subject,uint8 score,uint64 timestamp,address operator,uint64 nonce)"
    );

    // Hardcoded canonical fields (the off-chain signer uses these exact strings)
    bytes32 private constant VERSION_HASH = keccak256(bytes("mainstreet-v1"));
    bytes32 private constant SUBJECT_TYPE_HASH = keccak256(bytes("agent-onchain"));

    event AttestationVerified(bytes32 indexed subject, uint8 score, uint64 timestamp);

    constructor(address operator, uint256 maxAge) {
        require(operator != address(0), "MainStreet: operator zero");
        OPERATOR = operator;
        MAX_AGE = maxAge == 0 ? 86400 : maxAge;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId)"),
                keccak256(bytes("MainStreet")),
                keccak256(bytes("1")),
                block.chainid
            )
        );
    }

    /// Throws if the attestation is invalid OR score is below minScore.
    function requireMinScore(
        bytes32 subject,
        uint8 minScore,
        uint8 score,
        uint64 timestamp,
        uint64 nonce,
        bytes calldata signature
    ) external view returns (bool) {
        require(score >= minScore, "MainStreet: below threshold");
        require(block.timestamp - timestamp < MAX_AGE, "MainStreet: stale");
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                VERSION_HASH,
                SUBJECT_TYPE_HASH,
                subject,
                score,
                timestamp,
                OPERATOR,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = _recover(digest, signature);
        require(recovered == OPERATOR, "MainStreet: bad signer");
        return true;
    }

    /// Returns the verified score (reverts on invalid).
    function verifiedScore(
        bytes32 subject,
        uint8 score,
        uint64 timestamp,
        uint64 nonce,
        bytes calldata signature
    ) external view returns (uint8) {
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                VERSION_HASH,
                SUBJECT_TYPE_HASH,
                subject,
                score,
                timestamp,
                OPERATOR,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        require(_recover(digest, signature) == OPERATOR, "MainStreet: bad signer");
        require(block.timestamp - timestamp < MAX_AGE, "MainStreet: stale");
        return score;
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "MainStreet: sig len");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "MainStreet: sig v");
        return ecrecover(digest, v, r, s);
    }
}
