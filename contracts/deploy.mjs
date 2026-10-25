// Compiles EvidenceAnchor.sol with solc-js and deploys it to Polygon Amoy from the relayer wallet.
// Usage (from contracts/): node deploy.mjs [--dry-run]
// Reads RELAYER_PRIVATE_KEY and AMOY_RPC_URL from the repo's .env.local and writes deployment.json,
// which the web app imports for the address, ABI and deploy block.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { ContractFactory, JsonRpcProvider, Wallet, formatEther } from "ethers";

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(here, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);

const source = readFileSync(join(here, "EvidenceAnchor.sol"), "utf8");
const input = {
  language: "Solidity",
  sources: { "EvidenceAnchor.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "metadata"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  console.error(errors.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}
const compiled = output.contracts["EvidenceAnchor.sol"].EvidenceAnchor;
console.log(`compiled with solc ${solc.version()}, ${compiled.evm.bytecode.object.length / 2} bytes`);

const provider = new JsonRpcProvider(env.AMOY_RPC_URL, 80002, { staticNetwork: true });
const wallet = new Wallet(env.RELAYER_PRIVATE_KEY, provider);
const factory = new ContractFactory(compiled.abi, compiled.evm.bytecode.object, wallet);
const gas = await provider.estimateGas(await factory.getDeployTransaction());
const fee = await provider.getFeeData();
console.log(`relayer ${wallet.address}: ${formatEther(await provider.getBalance(wallet.address))} POL`);
console.log(`deploy needs ~${gas} gas, ~${formatEther(gas * fee.maxFeePerGas)} POL at most`);
if (process.argv.includes("--dry-run")) process.exit(0);

const contract = await factory.deploy();
const tx = contract.deploymentTransaction();
console.log(`sent ${tx.hash}`);
const receipt = await tx.wait();
const address = await contract.getAddress();
writeFileSync(
  join(here, "deployment.json"),
  JSON.stringify(
    {
      chainId: 80002,
      network: "Polygon Amoy",
      address,
      relayer: wallet.address,
      deployTx: tx.hash,
      deployBlock: receipt.blockNumber,
      compiler: solc.version(),
      abi: compiled.abi,
      metadata: compiled.metadata,
    },
    null,
    2,
  ) + "\n",
);
console.log(`EvidenceAnchor at ${address}, block ${receipt.blockNumber}, gas used ${receipt.gasUsed}`);
console.log(`https://amoy.polygonscan.com/address/${address}`);
