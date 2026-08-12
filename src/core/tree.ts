import type { Hex, MerkleTreeData, MerkleProof } from '../types/index.js'
import { keccak256, hexToBytes, bytesToHex, concatBytes } from '../utils/keccak.js'

export class MerkleTree {
  private leaves: Hex[]
  private layers: Hex[][]

  constructor(leaves: Hex[]) {
    if (leaves.length === 0) throw new Error('Cannot create MerkleTree with no leaves')
    this.leaves = [...leaves]
    this.layers = this.buildLayers()
  }

  getRoot(): Hex {
    const topLayer = this.layers[this.layers.length - 1]!
    return topLayer[0]!
  }

  getLeaves(): Hex[] {
    return [...this.leaves]
  }

  getLeafCount(): number {
    return this.leaves.length
  }

  getLayers(): Hex[][] {
    return this.layers.map(l => [...l])
  }

  getProof(leaf: Hex): MerkleProof | null {
    const index = this.leaves.findIndex(l => l.toLowerCase() === leaf.toLowerCase())
    if (index === -1) return null
    return this.getProofByIndex(index)
  }

  getProofByIndex(index: number): MerkleProof | null {
    if (index < 0 || index >= this.leaves.length) return null

    const proof: Hex[] = []
    let idx = index

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i]!
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1

      if (siblingIdx >= 0 && siblingIdx < layer.length) {
        proof.push(layer[siblingIdx]!)
      } else if (idx % 2 === 0 && siblingIdx >= layer.length) {
        proof.push(layer[idx]!)
      }

      idx = Math.floor(idx / 2)
    }

    return {
      leaf: this.leaves[index]!,
      proof,
      root: this.getRoot(),
      index,
    }
  }

  verify(leaf: Hex, proof: Hex[]): boolean {
    return MerkleTree.verify(leaf, proof, this.getRoot())
  }

  static verify(leaf: Hex, proof: Hex[], root: Hex): boolean {
    let hash = leaf.toLowerCase()

    for (const sibling of proof) {
      const siblingLower = sibling.toLowerCase()
      hash = hash < siblingLower
        ? hashPair(hash, siblingLower)
        : hashPair(siblingLower, hash)
    }

    return hash === root.toLowerCase()
  }

  static verifyMultiProof(leaves: Hex[], proof: Hex[], proofFlags: boolean[], root: Hex): boolean {
    const hashes = [...leaves.map(l => l.toLowerCase())]
    let proofIdx = 0

    for (const flag of proofFlags) {
      const a = hashes.shift()
      if (!a) return false

      let b: string | undefined
      if (flag) {
        b = hashes.shift()
      } else {
        b = proof[proofIdx]?.toLowerCase()
        proofIdx++
      }

      if (!b) return false

      const sorted = a < b ? hashPair(a, b) : hashPair(b, a)
      hashes.push(sorted)
    }

    return hashes.length === 1 && hashes[0] === root.toLowerCase()
  }

  getData(): MerkleTreeData {
    return {
      root: this.getRoot(),
      leaves: this.getLeaves(),
      layers: this.getLayers(),
      leafCount: this.leaves.length,
    }
  }

  private buildLayers(): Hex[][] {
    const layers: Hex[][] = [[...this.leaves]]

    while (layers[layers.length - 1]!.length > 1) {
      const currentLayer = layers[layers.length - 1]!
      const nextLayer: Hex[] = []

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]!
        const right = currentLayer[i + 1] ?? left

        const a = left.toLowerCase()
        const b = right.toLowerCase()
        nextLayer.push(a < b ? hashPairHex(a, b) : hashPairHex(b, a))
      }

      layers.push(nextLayer)
    }

    return layers
  }
}

function hashPair(a: string, b: string): string {
  const aClean = a.startsWith('0x') ? a.slice(2) : a
  const bClean = b.startsWith('0x') ? b.slice(2) : b
  const combined = concatBytes(hexToBytes(aClean), hexToBytes(bClean))
  return '0x' + bytesToHex(keccak256(combined))
}

function hashPairHex(a: string, b: string): Hex {
  return hashPair(a, b) as Hex
}

export function hashLeaf(data: Uint8Array): Hex {
  return ('0x' + bytesToHex(keccak256(data))) as Hex
}

export function hashLeafHex(hex: string): Hex {
  return ('0x' + bytesToHex(keccak256(hexToBytes(hex)))) as Hex
}
