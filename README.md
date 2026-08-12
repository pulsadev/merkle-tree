# @pulsadev/merkle-tree

Merkle tree and proof generation for airdrops, whitelists, and on-chain verification. OpenZeppelin compatible, zero dependencies.

Build merkle trees, generate proofs, verify claims. Ready for Solidity `MerkleProof.verify()`.

## Features

- **Standard Merkle Tree** — sorted pair hashing, OpenZeppelin compatible
- **Proof generation** — get proof for any leaf by value or index
- **Proof verification** — verify proofs in JS (matches Solidity verification)
- **Multi-proof** — verify multiple leaves at once
- **Airdrop helper** — address + amount → tree, proofs, and JSON export
- **Airdrop verification** — verify claim with address, amount, proof, root
- **Large scale** — tested with 1000+ entries
- **JSON export** — generate ready-to-use claim data for frontends
- **Zero dependencies** — ~8 KB bundled, ESM + CJS, pure TypeScript

## Install

```bash
npm install @pulsadev/merkle-tree
```

## Quick Start

### Build a merkle tree

```typescript
import { MerkleTree, hashLeaf } from '@pulsadev/merkle-tree'

const leaves = ['alice', 'bob', 'charlie', 'dave'].map(
  name => hashLeaf(new TextEncoder().encode(name))
)

const tree = new MerkleTree(leaves)
console.log('Root:', tree.getRoot())

const proof = tree.getProof(leaves[0])
console.log('Proof:', proof.proof)
console.log('Valid:', tree.verify(leaves[0], proof.proof))
```

### Airdrop tree

```typescript
import { createAirdropTree, getAirdropProof, verifyAirdropProof, generateAirdropJSON } from '@pulsadev/merkle-tree'

const tree = createAirdropTree([
  { address: '0xAlice...', amount: 1000000000000000000n },
  { address: '0xBob...', amount: 500000000000000000n },
  { address: '0xCharlie...', amount: 2000000000000000000n },
])

console.log('Root:', tree.root) // Set this in your contract

// Get proof for a claimer
const proof = getAirdropProof(tree, '0xAlice...')
console.log('Proof:', proof.proof) // Send to contract

// Verify (same logic as Solidity MerkleProof.verify)
const valid = verifyAirdropProof('0xAlice...', 1000000000000000000n, proof.proof, tree.root)

// Export JSON for frontend
const json = generateAirdropJSON(tree)
```

### Verify in Solidity

```solidity
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

function claim(uint256 amount, bytes32[] calldata proof) external {
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
    require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
    // ... transfer tokens
}
```

## API

### MerkleTree

| Method | Description |
|--------|-------------|
| `new MerkleTree(leaves, options?)` | Create tree from hex leaves |
| `getRoot()` | Get merkle root |
| `getProof(leaf)` | Get proof by leaf value |
| `getProofByIndex(index)` | Get proof by leaf index |
| `verify(leaf, proof)` | Verify a proof against this tree |
| `getLeaves()` | Get all leaves |
| `getLayers()` | Get all tree layers |
| `getLeafCount()` | Get number of leaves |
| `getData()` | Get full tree data |

### Static methods

| Method | Description |
|--------|-------------|
| `MerkleTree.verify(leaf, proof, root)` | Verify proof without tree instance |
| `MerkleTree.verifyMultiProof(leaves, proof, flags, root)` | Verify multiple leaves |

### Airdrop helpers

| Function | Description |
|----------|-------------|
| `createAirdropTree(entries)` | Create tree from address + amount pairs |
| `getAirdropProof(tree, address)` | Get proof for an address |
| `verifyAirdropProof(address, amount, proof, root)` | Verify a claim |
| `encodeAirdropLeaf(address, amount)` | Encode leaf as `keccak256(abi.encodePacked(address, amount))` |
| `generateAirdropJSON(tree)` | Export tree + proofs as JSON |

### Utilities

| Function | Description |
|----------|-------------|
| `hashLeaf(data)` | Hash arbitrary bytes to leaf |
| `hashLeafHex(hex)` | Hash hex string to leaf |

## License

MIT © [Yuto Nakamura](https://github.com/yutonakamura-dev)
