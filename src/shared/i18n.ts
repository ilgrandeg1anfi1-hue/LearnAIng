// Shared by main and renderer: JSON dictionaries + one lookup function, no library.
import it from './locales/it.json'
import en from './locales/en.json'

// Typed against `it`: a key missing from `en` is a compile error.
export const dictionaries: Record<'it' | 'en', typeof it> = { it, en }
export type Lang = keyof typeof dictionaries
export type Key = keyof typeof it

/** Text for `key` in `lang`, with `{name}` placeholders filled from `vars`. */
export function translate(lang: Lang, key: Key, vars: Record<string, string> = {}): string {
  return dictionaries[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match)
}
