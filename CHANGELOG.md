# Changelog

## [0.1.0] - 2026-08-12

### Added

- MerkleTree class with sorted pair hashing (OpenZeppelin compatible)
- Proof generation by value or index
- Proof verification (JS-side, matches Solidity MerkleProof.verify)
- Multi-proof verification
- Airdrop tree builder from address + amount entries
- Airdrop proof generation and verification
- Leaf encoding as keccak256(abi.encodePacked(address, uint256))
- JSON export for frontend integration
- Handles odd leaf counts and single-leaf trees
- Tested with 1000+ entry trees
- ESM + CJS dual format with full TypeScript declarations
- 42 tests passing
- Zero runtime dependencies (~8 KB bundled)
