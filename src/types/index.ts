export type Hex = `0x${string}`
export type Address = `0x${string}`

export interface MerkleTreeData {
  root: Hex
  leaves: Hex[]
  layers: Hex[][]
  leafCount: number
}

export interface MerkleProof {
  leaf: Hex
  proof: Hex[]
  root: Hex
  index: number
}

export interface AirdropEntry {
  address: Address
  amount: bigint
}

export interface AirdropTree {
  root: Hex
  entries: AirdropEntry[]
  proofs: Map<string, MerkleProof>
}
