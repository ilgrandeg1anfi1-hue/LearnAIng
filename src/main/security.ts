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

/** Database row id: positive safe integer. */
export function isId(v: unknown): v is number {
  return Number.isSafeInteger(v) && (v as number) > 0
}

/** Non-blank string up to `max` UTF-16 units. */
export function isText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim() !== '' && v.length <= max
}

export const settingValues = { theme: ['system', 'light', 'dark'], language: ['it', 'en'] } as const
export type Settings = { -readonly [K in keyof typeof settingValues]?: (typeof settingValues)[K][number] }

/** Only known setting keys, each with one of its allowed values. */
export function isSetting(key: unknown, value: unknown): boolean {
  if (typeof key !== 'string' || !Object.hasOwn(settingValues, key)) return false
  return (settingValues[key as keyof typeof settingValues] as readonly unknown[]).includes(value)
}

/** Only http(s) links may be handed to the system browser. */
export function isExternalUrl(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}
