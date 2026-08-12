import { describe, it, expect } from 'vitest'
import {
  createAirdropTree,
  getAirdropProof,
  verifyAirdropProof,
  encodeAirdropLeaf,
  generateAirdropJSON,
} from '../src/core/airdrop.js'
import type { Address, AirdropEntry } from '../src/types/index.js'

const ENTRIES: AirdropEntry[] = [
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address, amount: 1000000000000000000n },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, amount: 500000000000000000n },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, amount: 2000000000000000000n },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address, amount: 750000000000000000n },
]

describe('encodeAirdropLeaf', () => {
  it('produces deterministic hash', () => {
    const h1 = encodeAirdropLeaf(ENTRIES[0]!.address, ENTRIES[0]!.amount)
    const h2 = encodeAirdropLeaf(ENTRIES[0]!.address, ENTRIES[0]!.amount)
    expect(h1).toBe(h2)
  })

  it('different inputs produce different hashes', () => {
    const h1 = encodeAirdropLeaf(ENTRIES[0]!.address, ENTRIES[0]!.amount)
    const h2 = encodeAirdropLeaf(ENTRIES[1]!.address, ENTRIES[1]!.amount)
    expect(h1).not.toBe(h2)
  })

  it('produces 32-byte hex', () => {
    const hash = encodeAirdropLeaf(ENTRIES[0]!.address, ENTRIES[0]!.amount)
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/)
  })
})

describe('createAirdropTree', () => {
  it('creates tree with valid root', () => {
    const tree = createAirdropTree(ENTRIES)
    expect(tree.root).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.entries).toHaveLength(4)
    expect(tree.proofs.size).toBe(4)
  })

  it('root is deterministic', () => {
    const t1 = createAirdropTree(ENTRIES)
    const t2 = createAirdropTree(ENTRIES)
    expect(t1.root).toBe(t2.root)
  })

  it('throws on empty entries', () => {
    expect(() => createAirdropTree([])).toThrow('Cannot create')
  })

  it('handles single entry', () => {
    const tree = createAirdropTree([ENTRIES[0]!])
    expect(tree.root).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.proofs.size).toBe(1)
  })
})

describe('getAirdropProof', () => {
  it('returns proof for valid address', () => {
    const tree = createAirdropTree(ENTRIES)
    const proof = getAirdropProof(tree, ENTRIES[0]!.address)
    expect(proof).not.toBeNull()
    expect(proof!.proof.length).toBeGreaterThan(0)
  })

  it('case insensitive address lookup', () => {
    const tree = createAirdropTree(ENTRIES)
    const lower = ENTRIES[0]!.address.toLowerCase() as Address
    const proof = getAirdropProof(tree, lower)
    expect(proof).not.toBeNull()
  })

  it('returns null for missing address', () => {
    const tree = createAirdropTree(ENTRIES)
    const proof = getAirdropProof(tree, '0x0000000000000000000000000000000000000001' as Address)
    expect(proof).toBeNull()
  })
})

describe('verifyAirdropProof', () => {
  it('verifies valid proof', () => {
    const tree = createAirdropTree(ENTRIES)
    for (const entry of ENTRIES) {
      const proof = getAirdropProof(tree, entry.address)!
      const valid = verifyAirdropProof(entry.address, entry.amount, proof.proof, tree.root)
      expect(valid).toBe(true)
    }
  })

  it('rejects wrong amount', () => {
    const tree = createAirdropTree(ENTRIES)
    const proof = getAirdropProof(tree, ENTRIES[0]!.address)!
    const valid = verifyAirdropProof(ENTRIES[0]!.address, 999n, proof.proof, tree.root)
    expect(valid).toBe(false)
  })

  it('rejects wrong address', () => {
    const tree = createAirdropTree(ENTRIES)
    const proof = getAirdropProof(tree, ENTRIES[0]!.address)!
    const valid = verifyAirdropProof(
      '0x0000000000000000000000000000000000000001' as Address,
      ENTRIES[0]!.amount,
      proof.proof,
      tree.root,
    )
    expect(valid).toBe(false)
  })

  it('rejects wrong root', () => {
    const tree = createAirdropTree(ENTRIES)
    const proof = getAirdropProof(tree, ENTRIES[0]!.address)!
    const valid = verifyAirdropProof(
      ENTRIES[0]!.address,
      ENTRIES[0]!.amount,
      proof.proof,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )
    expect(valid).toBe(false)
  })
})

describe('generateAirdropJSON', () => {
  it('generates valid JSON', () => {
    const tree = createAirdropTree(ENTRIES)
    const json = generateAirdropJSON(tree)
    const parsed = JSON.parse(json)
    expect(parsed.root).toBe(tree.root)
    expect(parsed.totalEntries).toBe(4)
    expect(Object.keys(parsed.claims)).toHaveLength(4)
  })

  it('JSON contains proofs', () => {
    const tree = createAirdropTree(ENTRIES)
    const json = generateAirdropJSON(tree)
    const parsed = JSON.parse(json)
    const firstClaim = Object.values(parsed.claims)[0] as { amount: string; proof: string[] }
    expect(firstClaim.amount).toBeDefined()
    expect(firstClaim.proof).toBeInstanceOf(Array)
    expect(firstClaim.proof.length).toBeGreaterThan(0)
  })
})

describe('large airdrop (1000 entries)', () => {
  it('creates and verifies all proofs', () => {
    const entries: AirdropEntry[] = Array.from({ length: 1000 }, (_, i) => ({
      address: ('0x' + (i + 1).toString(16).padStart(40, '0')) as Address,
      amount: BigInt(i + 1) * 1000000000000000000n,
    }))

    const tree = createAirdropTree(entries)
    expect(tree.root).toMatch(/^0x[0-9a-f]{64}$/)
    expect(tree.proofs.size).toBe(1000)

    // Verify random samples
    for (const idx of [0, 1, 499, 998, 999]) {
      const entry = entries[idx]!
      const proof = getAirdropProof(tree, entry.address)!
      expect(verifyAirdropProof(entry.address, entry.amount, proof.proof, tree.root)).toBe(true)
    }
  })
})
