import { describe, expect, it } from 'vitest'
// shortcut: deep import of electron-builder's own config loader (not public API), update if a release moves it
import { getConfig, validateConfiguration } from 'app-builder-lib/out/util/config/config'
import { DebugLogger } from 'builder-util'

const load = async (file: string) => {
  const config = await getConfig(process.cwd(), file, null)
  await validateConfiguration(config, new DebugLogger(false))
  return config
}

describe('signed build configs', async () => {
  const base = await load('electron-builder.yml')

  it.each(['signing/ov.yml', 'signing/azure.yml'])('%s keeps base security and forces signing', async (file) => {
    const config = await load(file)
    expect(config.electronFuses).toEqual(base.electronFuses)
    expect(config.files).toEqual(base.files)
    expect(config.win?.target).toEqual(base.win?.target)
    expect(config.forceCodeSigning).toBe(true)
    // electron-builder refuses signtool and Azure together
    expect(Boolean(config.win?.signtoolOptions) !== Boolean(config.win?.azureSignOptions)).toBe(true)
  })

  it('signing/store.yml keeps base security and an XML-safe executable name', async () => {
    const config = await load('signing/store.yml')
    expect(config.electronFuses).toEqual(base.electronFuses)
    expect(config.files).toEqual(base.files)
    // electron-builder writes the executable name (default: productName) unescaped into the AppX manifest
    expect(config.executableName ?? config.productName).toMatch(/^[A-Za-z0-9 ._-]+$/)
  })
})
