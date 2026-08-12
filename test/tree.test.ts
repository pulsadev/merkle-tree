import { describe, it, expect } from 'vitest'
import { MerkleTree, hashLeaf, hashLeafHex } from '../src/core/tree.js'
import { keccak256, bytesToHex, hexToBytes } from '../src/utils/keccak.js'
import type { Hex } from '../src/types/index.js'

function makeLeaf(data: string): Hex {
  return ('0x' + bytesToHex(keccak256(new TextEncoder().encode(data)))) as Hex
}

describe('MerkleTree', () => {
  const leaves = ['a', 'b', 'c', 'd'].map(makeLeaf)

  it('creates tree from leaves', () => {
    const tree = new MerkleTree(leaves)
    expect(tree.getRoot()).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.getLeafCount()).toBe(4)
  })

  it('root is deterministic', () => {
    const t1 = new MerkleTree(leaves)
    const t2 = new MerkleTree(leaves)
    expect(t1.getRoot()).toBe(t2.getRoot())
  })

  it('different leaves produce different roots', () => {
    const t1 = new MerkleTree(leaves)
    const t2 = new MerkleTree(['x', 'y', 'z', 'w'].map(makeLeaf))
    expect(t1.getRoot()).not.toBe(t2.getRoot())
  })

  it('throws on empty leaves', () => {
    expect(() => new MerkleTree([])).toThrow('Cannot create')
  })

  it('handles single leaf', () => {
    const tree = new MerkleTree([leaves[0]!])
    expect(tree.getRoot()).toBe(leaves[0]!)
    expect(tree.getLeafCount()).toBe(1)
  })

  it('handles odd number of leaves', () => {
    const tree = new MerkleTree(leaves.slice(0, 3))
    expect(tree.getRoot()).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.getLeafCount()).toBe(3)
  })

  it('handles 2 leaves', () => {
    const tree = new MerkleTree(leaves.slice(0, 2))
    expect(tree.getRoot()).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('handles large tree (100 leaves)', () => {
    const bigLeaves = Array.from({ length: 100 }, (_, i) => makeLeaf(`leaf-${i}`))
    const tree = new MerkleTree(bigLeaves)
    expect(tree.getRoot()).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.getLeafCount()).toBe(100)
  })

  it('getLeaves returns copy', () => {
    const tree = new MerkleTree(leaves)
    const returned = tree.getLeaves()
    expect(returned).toEqual(leaves)
    returned[0] = '0xdead' as Hex
    expect(tree.getLeaves()[0]).toBe(leaves[0])
  })

  it('getLayers has correct structure', () => {
    const tree = new MerkleTree(leaves)
    const layers = tree.getLayers()
    expect(layers[0]!.length).toBe(4)
    expect(layers[1]!.length).toBe(2)
    expect(layers[2]!.length).toBe(1)
    expect(layers[2]![0]).toBe(tree.getRoot())
  })
})

describe('MerkleTree proof', () => {
  const leaves = ['a', 'b', 'c', 'd'].map(makeLeaf)

  it('generates valid proof for each leaf', () => {
    const tree = new MerkleTree(leaves)
    for (const leaf of leaves) {
      const proof = tree.getProof(leaf)
      expect(proof).not.toBeNull()
      expect(proof!.leaf).toBe(leaf)
      expect(proof!.root).toBe(tree.getRoot())
      expect(tree.verify(leaf, proof!.proof)).toBe(true)
    }
  })

  it('getProof returns null for non-existent leaf', () => {
    const tree = new MerkleTree(leaves)
    expect(tree.getProof(makeLeaf('nonexistent'))).toBeNull()
  })

  it('getProofByIndex works', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProofByIndex(0)
    expect(proof).not.toBeNull()
    expect(proof!.index).toBe(0)
    expect(tree.verify(proof!.leaf, proof!.proof)).toBe(true)
  })

  it('getProofByIndex returns null for out of bounds', () => {
    const tree = new MerkleTree(leaves)
    expect(tree.getProofByIndex(-1)).toBeNull()
    expect(tree.getProofByIndex(100)).toBeNull()
  })

  it('proof length is log2(n)', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProof(leaves[0]!)
    expect(proof!.proof.length).toBe(2) // log2(4) = 2
  })

  it('static verify works', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProof(leaves[0]!)!
    expect(MerkleTree.verify(proof.leaf, proof.proof, proof.root)).toBe(true)
  })

  it('static verify rejects wrong root', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProof(leaves[0]!)!
    expect(MerkleTree.verify(proof.leaf, proof.proof, makeLeaf('wrong'))).toBe(false)
  })

  it('static verify rejects wrong leaf', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProof(leaves[0]!)!
    expect(MerkleTree.verify(makeLeaf('wrong'), proof.proof, proof.root)).toBe(false)
  })

  it('static verify rejects tampered proof', () => {
    const tree = new MerkleTree(leaves)
    const proof = tree.getProof(leaves[0]!)!
    const tampered = [...proof.proof]
    tampered[0] = makeLeaf('tampered')
    expect(MerkleTree.verify(proof.leaf, tampered, proof.root)).toBe(false)
  })

  it('proof works for odd leaf count', () => {
    const oddLeaves = ['a', 'b', 'c'].map(makeLeaf)
    const tree = new MerkleTree(oddLeaves)
    for (const leaf of oddLeaves) {
      const proof = tree.getProof(leaf)
      expect(proof).not.toBeNull()
      expect(tree.verify(leaf, proof!.proof)).toBe(true)
    }
  })

  it('proof works for single leaf', () => {
    const tree = new MerkleTree([leaves[0]!])
    const proof = tree.getProof(leaves[0]!)
    expect(proof).not.toBeNull()
    expect(proof!.proof.length).toBe(0)
    expect(tree.verify(leaves[0]!, proof!.proof)).toBe(true)
  })

  it('proof works for 100 leaves', () => {
    const bigLeaves = Array.from({ length: 100 }, (_, i) => makeLeaf(`leaf-${i}`))
    const tree = new MerkleTree(bigLeaves)
    for (let i = 0; i < bigLeaves.length; i++) {
      const proof = tree.getProofByIndex(i)
      expect(proof).not.toBeNull()
      expect(tree.verify(bigLeaves[i]!, proof!.proof)).toBe(true)
    }
  })
})

describe('hashLeaf / hashLeafHex', () => {
  it('hashLeaf produces 32 bytes', () => {
    const result = hashLeaf(new TextEncoder().encode('test'))
    expect(result).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('hashLeafHex works with hex input', () => {
    const result = hashLeafHex('deadbeef')
    expect(result).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('hashLeafHex handles 0x prefix', () => {
    const r1 = hashLeafHex('0xdeadbeef')
    const r2 = hashLeafHex('deadbeef')
    expect(r1).toBe(r2)
  })
})
