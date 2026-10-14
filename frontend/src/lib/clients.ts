import { createPublicClient, http } from "viem";
import { chain, rpcUrl } from "./chain";

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
