import { _electron as electron, expect, test } from '@playwright/test'
import pkg from '../package.json'

test('opens the window with an isolated, locked-down renderer', async () => {
  const dataDir = test.info().outputPath('data')
  const app = await electron.launch({ args: ['.'], env: { ...process.env, LEARNAING_DATA_DIR: dataDir } })
  const win = await app.firstWindow()

  await expect(win).toHaveTitle('LearnAIng')
  // Version arrives through preload -> validated IPC -> main.
  await expect(win.getByText(`v${pkg.version}`)).toBeVisible()

  // No Node in the renderer.
  const globals = await win.evaluate(() => {
    const g = globalThis as Record<string, unknown>
    return [typeof g.require, typeof g.process]
  })
  expect(globals).toEqual(['undefined', 'undefined'])

  // CSP blocks injected inline scripts (eval can't be tested: Playwright's evaluate bypasses CSP).
  const violation = await win.evaluate(
    () =>
      new Promise<string>((resolve) => {
        document.addEventListener('securitypolicyviolation', (e) => resolve(e.violatedDirective), { once: true })
        const s = document.createElement('script')
        s.textContent = 'window.__injected = true'
        document.body.appendChild(s)
        setTimeout(() => resolve((window as unknown as Record<string, unknown>).__injected ? 'ran' : 'none'), 1000)
      })
  )
  expect(violation).toBe('script-src-elem')

  // window.open is denied; navigation is blocked.
  expect(await win.evaluate(() => window.open('about:blank') === null)).toBe(true)
  const url = win.url()
  await win.evaluate(() => {
    location.href = 'https://example.com'
  })
  await win.waitForTimeout(500)
  expect(win.url()).toBe(url)

  await app.close()
})
