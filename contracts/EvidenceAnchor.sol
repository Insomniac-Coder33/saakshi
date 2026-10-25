// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title EvidenceAnchor
/// @notice Saakshi seals evidence by anchoring one Merkle root per batch of salted fingerprints.
/// Each leaf is SHA-256(salt || SHA-256 of one encrypted piece's plaintext), so a root reveals nothing
/// about the content or whose it is; it only proves those fingerprints existed by this block.
/// Roots live in the event log rather than storage, which keeps a seal at about 24k gas.
contract EvidenceAnchor {
    /// The Saakshi relayer: the only account that can anchor, so a woman never needs a wallet.
    address public immutable relayer;

    event Anchored(bytes32 indexed root, uint32 leaves);

    error NotRelayer();

    constructor() {
        relayer = msg.sender;
    }

    function anchor(bytes32 root, uint32 leaves) external {
        if (msg.sender != relayer) revert NotRelayer();
        emit Anchored(root, leaves);
    }
}
