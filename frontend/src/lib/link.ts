import { isHex, type Hex } from "viem";

// The one-time private key lives only in the URL fragment, which browsers never send to servers.
// `v` versions the format so a password-encrypted key (`e=`) can be added later.
export function buildClaimLink(origin: string, privateKey: Hex) {
  return `${origin}/c#k=${privateKey}&v=1`;
}

export function parseClaimFragment(hash: string): Hex | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const k = params.get("k");
  if (!k || !isHex(k) || k.length !== 66) return null;
  return k;
}
