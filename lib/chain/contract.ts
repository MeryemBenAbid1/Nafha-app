// Where the NafhaAnchor contract lives, and the parts of its interface the app uses.
// Booth without internet: NEXT_PUBLIC_CHAIN_ID=31337 and NEXT_PUBLIC_CHAIN_RPC_URL=http://127.0.0.1:8545
// (run `npm run node` and `npm run deploy:local` in nafha-chain). Online: 80002 (Polygon Amoy).

import { createPublicClient, defineChain, http } from "viem";
import { hardhat, polygonAmoy } from "viem/chains";

export const anchorAbi = [
  { type: "function", name: "roots", stateMutability: "view", inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "", type: "bytes32" }] },
  {
    type: "function", name: "deviceKey", stateMutability: "view", inputs: [{ name: "deviceId", type: "bytes32" }],
    outputs: [{ name: "qx", type: "bytes32" }, { name: "qy", type: "bytes32" }, { name: "active", type: "bool" }],
  },
  {
    type: "function", name: "anchorRoot", stateMutability: "nonpayable",
    inputs: [{ name: "batchId", type: "bytes32" }, { name: "root", type: "bytes32" }, { name: "leafCount", type: "uint32" }], outputs: [],
  },
  {
    type: "function", name: "registerDevice", stateMutability: "nonpayable",
    inputs: [{ name: "deviceId", type: "bytes32" }, { name: "qx", type: "bytes32" }, { name: "qy", type: "bytes32" }], outputs: [],
  },
] as const;

export const chainConfig = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 80002),
  rpc: process.env.NEXT_PUBLIC_CHAIN_RPC_URL || "",
  address: (process.env.NEXT_PUBLIC_ANCHOR_CONTRACT || "") as `0x${string}`,
};

export const chainReady = () => Boolean(chainConfig.address && chainConfig.address.length === 42);

export function getChain() {
  if (chainConfig.id === polygonAmoy.id) return polygonAmoy;
  if (chainConfig.id === hardhat.id) return hardhat;
  return defineChain({
    id: chainConfig.id, name: `chain ${chainConfig.id}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [chainConfig.rpc] } },
  });
}

export function explorerTx(tx: string) {
  return chainConfig.id === polygonAmoy.id ? `https://amoy.polygonscan.com/tx/${tx}` : null;
}

export function publicClient() {
  return createPublicClient({ chain: getChain(), transport: http(chainConfig.rpc || undefined) });
}
