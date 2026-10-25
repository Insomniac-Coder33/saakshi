// Merkle trees over SHA-256, shared by the sealer (server) and the Verify page (browser).
// Each pair is hashed in sorted order, so a proof is only the list of sibling hashes, with no
// left/right flags. An odd node at the end of a level moves up unchanged.

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Of(bytes: BufferSource): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
}

/** A piece's leaf: SHA-256(salt || fingerprint). The database computes the same in piece_leaf(). */
export async function leafOf(saltHex: string, sha256Hex: string): Promise<string> {
  const salt = hexToBytes(saltHex);
  const hash = hexToBytes(sha256Hex);
  const joined = new Uint8Array(salt.length + hash.length);
  joined.set(salt);
  joined.set(hash, salt.length);
  return sha256Of(joined);
}

async function parent(a: string, b: string): Promise<string> {
  const [x, y] = a < b ? [a, b] : [b, a];
  return sha256Of(hexToBytes(x + y));
}

export interface Tree {
  root: string;
  proofs: string[][]; // proofs[i] proves leaves[i]
}

export async function buildTree(leaves: string[]): Promise<Tree> {
  if (!leaves.length) throw new Error("no leaves");
  const levels: string[][] = [leaves];
  while (levels.at(-1)!.length > 1) {
    const level = levels.at(-1)!;
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? await parent(level[i], level[i + 1]) : level[i]);
    levels.push(next);
  }
  const proofs = leaves.map((_, index) => {
    const proof: string[] = [];
    let i = index;
    for (const level of levels.slice(0, -1)) {
      const sibling = i ^ 1;
      if (sibling < level.length) proof.push(level[sibling]);
      i >>= 1;
    }
    return proof;
  });
  return { root: levels.at(-1)![0], proofs };
}

export async function rootFromProof(leaf: string, proof: string[]): Promise<string> {
  let node = leaf;
  for (const sibling of proof) node = await parent(node, sibling);
  return node;
}
