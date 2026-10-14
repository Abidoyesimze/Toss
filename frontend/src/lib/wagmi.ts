import { createConfig, http, type CreateConnectorFn } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { chain, rpcUrl } from "./chain";

export const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

const connectors: CreateConnectorFn[] = [injected()];
// WalletConnect touches indexedDB on init, so only create it in the browser (never during SSR/build).
if (wcProjectId && typeof window !== "undefined") {
  connectors.push(
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
      metadata: {
        name: "Toss",
        description: "Send USDC with a link",
        url: window.location.origin,
        icons: [],
      },
    }),
  );
}

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors,
  transports: { [chain.id]: http(rpcUrl) },
  ssr: true,
});

/** True when a browser-extension (or in-app browser) wallet is present. */
export const hasInjectedWallet = () => typeof window !== "undefined" && "ethereum" in window;
