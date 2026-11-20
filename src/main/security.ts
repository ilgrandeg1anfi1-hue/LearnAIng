// Pure checks used at the main-process trust boundary (no electron import so Vitest can run them).

/** True only if the IPC sender frame is our renderer page (same file path, or same dev-server origin). */
export function isTrustedSender(frameUrl: string | undefined, rendererUrl: string): boolean {
  if (!frameUrl) return false
  try {
    const f = new URL(frameUrl)
    const r = new URL(rendererUrl)
    if (f.protocol !== r.protocol) return false
    return f.protocol === 'file:' ? f.pathname === r.pathname : f.origin === r.origin
  } catch {
    return false
  }
}

/** Only http(s) links may be handed to the system browser. */
export function isExternalUrl(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}
