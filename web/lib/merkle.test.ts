import { describe, expect, it } from "vitest";
import { buildTree, leafOf, rootFromProof, sha256Of } from "./merkle";

const hashes = async (n: number) =>
  Promise.all(Array.from({ length: n }, (_, i) => sha256Of(new TextEncoder().encode(`piece ${i}`))));

describe("merkle", () => {
  it("proves every leaf, for odd and even tree sizes", async () => {
    for (const n of [1, 2, 3, 5, 8, 13]) {
      const leaves = await hashes(n);
      const tree = await buildTree(leaves);
      for (const [i, leaf] of leaves.entries()) expect(await rootFromProof(leaf, tree.proofs[i])).toBe(tree.root);
    }
  });

  it("rejects a changed leaf", async () => {
    const leaves = await hashes(6);
    const tree = await buildTree(leaves);
    const forged = await sha256Of(new TextEncoder().encode("piece 2, edited"));
    expect(await rootFromProof(forged, tree.proofs[2])).not.toBe(tree.root);
  });

  it("computes the salted leaf the way the database does", async () => {
    // select encode(digest(decode('00…0f','hex') || decode(sha256('abc'),'hex'), 'sha256'), 'hex')
    const salt = "000102030405060708090a0b0c0d0e0f";
    const abc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(await leafOf(salt, abc)).toBe(await sha256Of(new Uint8Array([...Array(16).keys(), ...Buffer.from(abc, "hex")])));
  });
});
