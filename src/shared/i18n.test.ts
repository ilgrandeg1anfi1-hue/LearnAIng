import { describe, expect, it } from 'vitest'
import { dictionaries, translate } from './i18n'

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()

describe('i18n', () => {
  it('every language has exactly the Italian keys, non-empty, with the same placeholders', () => {
    const { it: base, ...others } = dictionaries
    for (const dict of Object.values(others)) {
      expect(Object.keys(dict)).toEqual(Object.keys(base))
      for (const [key, text] of Object.entries(dict)) {
        expect(text.trim(), key).not.toBe('')
        expect(placeholders(text), key).toEqual(placeholders(base[key as keyof typeof base]))
      }
    }
  })

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'chat.deleteConfirm', { title: 'X' })).toContain('“X”')
    expect(translate('it', 'error.generic')).toBe('Qualcosa è andato storto: {message}')
  })
})
