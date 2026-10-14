import type { NextConfig } from "next";

const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.mainnet.arc.io";
const dev = process.env.NODE_ENV !== "production";
// WalletConnect (only when a project ID is configured): relay, RPC, wallet list and icons.
const wc = process.env.NEXT_PUBLIC_WC_PROJECT_ID
  ? {
      connect:
        " https://*.walletconnect.com https://*.walletconnect.org wss://relay.walletconnect.com wss://relay.walletconnect.org https://*.web3modal.org https://*.web3modal.com https://*.reown.com",
      img: " https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com https://*.reown.com",
      frame: " https://verify.walletconnect.com https://verify.walletconnect.org",
      font: " https://fonts.reown.com",
    }
  : { connect: "", img: "", frame: "", font: "" };

// Links carry a private key in the URL fragment: no third-party scripts, no referrers, no framing.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${wc.img}`,
  `font-src 'self'${wc.font}`,
  `connect-src 'self' ${new URL(rpc).origin}${wc.connect}${dev ? " ws:" : ""}`,
  `frame-src ${wc.frame ? wc.frame.trim() : "'none'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
