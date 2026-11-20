import { describe, expect, it } from 'vitest'
import { isExternalUrl, isId, isSetting, isText, isTrustedSender } from './security'

const prod = 'file:///C:/app/resources/app.asar/out/renderer/index.html'

describe('isTrustedSender', () => {
  it('accepts the renderer page, ignoring hash/query', () => {
    expect(isTrustedSender(prod + '#/chat', prod)).toBe(true)
    expect(isTrustedSender('http://localhost:5173/x', 'http://localhost:5173/')).toBe(true)
  })
  it('rejects other files, origins, protocols and garbage', () => {
    expect(isTrustedSender('file:///C:/evil/index.html', prod)).toBe(false)
    expect(isTrustedSender('http://localhost:5174/', 'http://localhost:5173/')).toBe(false)
    expect(isTrustedSender('https://example.com/', prod)).toBe(false)
    expect(isTrustedSender('learnaing-app://lesson/1', prod)).toBe(false)
    expect(isTrustedSender(undefined, prod)).toBe(false)
    expect(isTrustedSender('not a url', prod)).toBe(false)
  })
})

describe('IPC argument validators', () => {
  it('isId accepts only positive safe integers', () => {
    expect(isId(1)).toBe(true)
    for (const v of [0, -1, 1.5, NaN, Infinity, 2 ** 53, '1', null, undefined]) expect(isId(v)).toBe(false)
  })
  it('isText rejects blanks, non-strings and oversize input', () => {
    expect(isText('ciao', 4)).toBe(true)
    for (const v of ['', '  \n', 'ciao!', 5, null, ['x']]) expect(isText(v, 4)).toBe(false)
  })
  it('isSetting accepts only known keys with allowed values', () => {
    expect(isSetting('theme', 'dark')).toBe(true)
    expect(isSetting('language', 'en')).toBe(true)
    expect(isSetting('theme', 'blue')).toBe(false)
    expect(isSetting('apiKey', 'x')).toBe(false)
    for (const key of ['__proto__', 'constructor', 'toString', 1]) expect(isSetting(key, 'it')).toBe(false)
  })
})

describe('isExternalUrl', () => {
  it('allows only http(s)', () => {
    expect(isExternalUrl('https://example.com')).toBe(true)
    expect(isExternalUrl('http://example.com')).toBe(true)
    for (const u of ['file:///C:/x', 'javascript:alert(1)', 'ms-settings:', 'about:blank', '']) {
      expect(isExternalUrl(u)).toBe(false)
    }
  })
})
