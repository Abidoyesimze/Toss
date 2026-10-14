// Tells always-mounted UI (the top bar) that the Toss wallet or its balance may have changed.
const EVENT = "toss:wallet-changed";

export function emitWalletChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onWalletChanged(handler: () => void) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
