import type { Hex, Address, AirdropEntry, AirdropTree, MerkleProof } from '../types/index.js'
import { MerkleTree } from './tree.js'
import { keccak256, hexToBytes, bytesToHex, concatBytes } from '../utils/keccak.js'

export function createAirdropTree(entries: AirdropEntry[], options?: { standard?: boolean }): AirdropTree {
  if (entries.length === 0) throw new Error('Cannot create airdrop tree with no entries')
  const standard = options?.standard ?? false

  const indexed = entries.map((entry, i) => ({
    entry,
    leaf: encodeAirdropLeaf(entry.address, entry.amount, standard),
    originalIndex: i,
  }))

  if (standard) {
    indexed.sort((a, b) => a.leaf.toLowerCase() < b.leaf.toLowerCase() ? -1 : a.leaf.toLowerCase() > b.leaf.toLowerCase() ? 1 : 0)
  }

  const leaves = indexed.map(x => x.leaf)
  const tree = new MerkleTree(leaves)

  const proofs = new Map<string, MerkleProof>()
  for (let i = 0; i < indexed.length; i++) {
    const item = indexed[i]!
    const proof = tree.getProofByIndex(i)
    if (proof) {
      proofs.set(item.entry.address.toLowerCase(), proof)
    }
  }

  return {
    root: tree.getRoot(),
    entries,
    proofs,
  }
}

export function getAirdropProof(tree: AirdropTree, address: Address): MerkleProof | null {
  return tree.proofs.get(address.toLowerCase()) ?? null
}

export function verifyAirdropProof(
  address: Address,
  amount: bigint,
  proof: Hex[],
  root: Hex,
  standard = false,
): boolean {
  const leaf = encodeAirdropLeaf(address, amount, standard)
  return MerkleTree.verify(leaf, proof, root)
}

export function encodeAirdropLeaf(address: Address, amount: bigint, standard = false): Hex {
  if (standard) {
    return encodeStandardLeaf(address, amount)
  }
  const addrClean = address.startsWith('0x') ? address.slice(2) : address
  const addrBytes = hexToBytes(addrClean.toLowerCase().padStart(40, '0'))
  const amountHex = amount.toString(16).padStart(64, '0')
  const amountBytes = hexToBytes(amountHex)

  const packed = concatBytes(addrBytes, amountBytes)
  const hash = keccak256(packed)
  return ('0x' + bytesToHex(hash)) as Hex
}

function encodeStandardLeaf(address: Address, amount: bigint): Hex {
  const addrClean = address.startsWith('0x') ? address.slice(2) : address
  const addrPadded = addrClean.toLowerCase().padStart(64, '0')
  const amountHex = amount.toString(16).padStart(64, '0')
  const encoded = hexToBytes(addrPadded + amountHex)
  const innerHash = keccak256(encoded)
  const doubleHash = keccak256(innerHash)
  return ('0x' + bytesToHex(doubleHash)) as Hex
}

export function generateAirdropJSON(tree: AirdropTree): string {
  const data: Record<string, { amount: string; proof: string[] }> = {}

  for (const entry of tree.entries) {
    const proof = tree.proofs.get(entry.address.toLowerCase())
    if (proof) {
      data[entry.address.toLowerCase()] = {
        amount: entry.amount.toString(),
        proof: proof.proof,
      }
    }
  }

  return JSON.stringify({
    root: tree.root,
    totalEntries: tree.entries.length,
    claims: data,
  }, null, 2)
}
