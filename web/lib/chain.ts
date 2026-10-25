// Where seals live: EvidenceAnchor.sol on Polygon Amoy (contracts/deployment.json has the full record).
// The Verify page reads the chain straight from these public endpoints, never through our server.

export const CHAIN_ID = 80002;
export const CHAIN_NAME = "Polygon Amoy";
export const ANCHOR_ADDRESS = "0x39eA5AB65824af57297cE863CB54B1A84E3C4719";
export const ANCHOR_ABI = ["function anchor(bytes32 root, uint32 leaves)", "event Anchored(bytes32 indexed root, uint32 leaves)"];
/** keccak256("Anchored(bytes32,uint32)") */
export const ANCHORED_TOPIC = "0x5598f81654a551570e944f92d10bea632541f1202d606a899598d9bbc4eb22ad";
export const PUBLIC_RPCS = ["https://polygon-amoy-bor-rpc.publicnode.com", "https://polygon-amoy.drpc.org", "https://rpc-amoy.polygon.technology"];
export const EXPLORER = "https://amoy.polygonscan.com";

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let last: unknown;
  for (const url of PUBLIC_RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const body = await res.json();
      if (body.error) throw new Error(body.error.message);
      return body.result as T;
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export interface OnChainSeal {
  blockNumber: number;
  timestamp: Date;
}

/**
 * Checks on-chain that `txHash` succeeded, was sent to EvidenceAnchor, and emitted Anchored(root).
 * Returns null if any of that fails.
 */
export async function findAnchor(txHash: string, rootHex: string): Promise<OnChainSeal | null> {
  const receipt = await rpc<{
    status: string;
    to: string;
    blockNumber: string;
    logs: { address: string; topics: string[] }[];
  } | null>("eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1" || receipt.to?.toLowerCase() !== ANCHOR_ADDRESS.toLowerCase()) return null;
  const root = `0x${rootHex.replace(/^0x/, "")}`.toLowerCase();
  const emitted = receipt.logs.some(
    (log) =>
      log.address.toLowerCase() === ANCHOR_ADDRESS.toLowerCase() &&
      log.topics[0]?.toLowerCase() === ANCHORED_TOPIC &&
      log.topics[1]?.toLowerCase() === root,
  );
  if (!emitted) return null;
  const block = await rpc<{ timestamp: string }>("eth_getBlockByNumber", [receipt.blockNumber, false]);
  return { blockNumber: parseInt(receipt.blockNumber, 16), timestamp: new Date(parseInt(block.timestamp, 16) * 1000) };
}
