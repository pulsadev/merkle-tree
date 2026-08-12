const RC: bigint[] = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]
const ROTC = [1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44]
const PI = [10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1]
const M64 = (1n << 64n) - 1n

function rot64(x: bigint, n: number): bigint { const b = BigInt(n); return ((x << b) | (x >> (64n - b))) & M64 }

function keccakF(s: bigint[]): void {
  for (let r = 0; r < 24; r++) {
    const c: bigint[] = []; for (let x = 0; x < 5; x++) c[x] = s[x]!^s[x+5]!^s[x+10]!^s[x+15]!^s[x+20]!
    for (let x = 0; x < 5; x++) { const d = c[(x+4)%5]!^rot64(c[(x+1)%5]!, 1); for (let y = 0; y < 25; y += 5) s[y+x] = (s[y+x]!^d)&M64 }
    let cur = s[1]!; for (let i = 0; i < 24; i++) { const j = PI[i]!; const t = s[j]!; s[j] = rot64(cur, ROTC[i]!); cur = t }
    for (let y = 0; y < 25; y += 5) { const t0=s[y]!,t1=s[y+1]!,t2=s[y+2]!,t3=s[y+3]!,t4=s[y+4]!; s[y]=(t0^(~t1&t2))&M64;s[y+1]=(t1^(~t2&t3))&M64;s[y+2]=(t2^(~t3&t4))&M64;s[y+3]=(t3^(~t4&t0))&M64;s[y+4]=(t4^(~t0&t1))&M64 }
    s[0] = (s[0]!^RC[r]!)&M64
  }
}

export function keccak256(data: Uint8Array): Uint8Array {
  const rate = 136; const q = rate - (data.length % rate)
  const padded = new Uint8Array(data.length + q); padded.set(data)
  if (q === 1) { padded[data.length] = 0x81 } else { padded[data.length] = 0x01; padded[padded.length - 1] = 0x80 }
  const state = new Array<bigint>(25).fill(0n)
  for (let i = 0; i < padded.length; i += rate) {
    for (let j = 0; j < rate && j+7 < rate; j += 8) { const idx = j>>3; if (idx<25) { let lane = 0n; for (let b = 0; b < 8; b++) lane |= BigInt(padded[i+j+b]!)<<BigInt(b*8); state[idx] = state[idx]!^lane } }
    keccakF(state)
  }
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 8) { const idx = i>>3; const val = state[idx]!; for (let b = 0; b < 8 && i+b < 32; b++) out[i+b] = Number((val>>BigInt(b*8))&0xffn) }
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i*2, i*2+2), 16)
  return bytes
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length }
  return result
}
