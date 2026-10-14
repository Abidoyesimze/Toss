/** Light haptic tick where supported (Android Chrome). iOS Safari ignores it. */
export function tick(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // unsupported
  }
}
