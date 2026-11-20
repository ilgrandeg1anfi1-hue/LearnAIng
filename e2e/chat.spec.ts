import { _electron as electron, expect, test, type Page } from '@playwright/test'
import it from '../src/shared/locales/it.json'
import en from '../src/shared/locales/en.json'

// Any uncaught renderer error fails the test (React unmounts the whole UI on one).
const pageErrors: Error[] = []
test.afterEach(() => expect(pageErrors.splice(0)).toEqual([]))

// Data dir inside the test's output folder (Playwright clears it on every run).
// --lang fixes the default UI language whatever the OS locale.
async function launch(dataDir: string) {
  const app = await electron.launch({ args: ['.', '--lang=it-IT'], env: { ...process.env, LEARNAING_DATA_DIR: dataDir } })
  const win = await app.firstWindow()
  win.on('pageerror', (e) => pageErrors.push(e))
  return { app, win }
}

const history = (win: Page) => win.getByRole('navigation', { name: it['chat.history'] })

test('a chat survives a restart and can be continued, renamed and deleted', async () => {
  const dir = test.info().outputPath('data')
  let { app, win } = await launch(dir)

  await expect(history(win).getByText(it['chat.none'])).toBeVisible()
  const box = win.getByRole('textbox', { name: it['composer.label'] })
  await box.fill('Che cos’è la fotosintesi?\nSeconda riga')
  await box.press('Enter')

  const thread = win.getByRole('region', { name: it['chat.messages'] })
  await expect(thread.getByRole('article')).toHaveCount(2)
  await expect(thread.locator('.prose strong')).toHaveText('echo')
  await expect(box).toHaveValue('')
  // Title = first line of the first message.
  await expect(history(win).getByRole('button', { name: 'Che cos’è la fotosintesi?' })).toBeVisible()
  await app.close()

  ;({ app, win } = await launch(dir))
  const chat = history(win).getByRole('button', { name: 'Che cos’è la fotosintesi?' })
  await expect(chat).toBeVisible()
  await chat.click()
  await expect(win.getByRole('article')).toHaveCount(2)
  await expect(win.getByText('Seconda riga').first()).toBeVisible()

  // Continue the same chat.
  await win.getByRole('textbox', { name: it['composer.label'] }).fill('E la respirazione?')
  await win.getByRole('button', { name: it['composer.send'] }).click()
  await expect(win.getByRole('article')).toHaveCount(4)
  // Continuing does not create a second chat.
  await expect(history(win).getByRole('listitem')).toHaveCount(1)

  // Rename.
  await history(win).getByRole('button', { name: it['chat.rename'] }).click()
  const title = history(win).getByRole('textbox', { name: it['chat.titleLabel'] })
  await title.fill('Biologia')
  await title.press('Enter')
  await expect(history(win).getByRole('button', { name: 'Biologia' })).toBeVisible()

  // Language and theme persist as settings.
  await win.getByLabel(it['settings.language']).selectOption('en')
  await expect(win.getByRole('button', { name: en['chat.new'] })).toBeVisible()
  await win.getByLabel(en['settings.theme']).selectOption('dark')
  // Checked in main: Playwright emulates a light prefers-color-scheme in the page.
  const themeSource = () => app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)
  await expect.poll(themeSource).toBe('dark')
  await app.close()

  ;({ app, win } = await launch(dir))
  await expect(win.getByRole('button', { name: en['chat.new'] })).toBeVisible()
  await expect(win.locator('html')).toHaveAttribute('lang', 'en')
  expect(await themeSource()).toBe('dark')
  await expect(win.getByRole('navigation', { name: en['chat.history'] }).getByText('Biologia')).toBeVisible()

  // Delete asks for confirmation.
  win.once('dialog', (d) => d.accept())
  await win.getByRole('button', { name: en['chat.delete'] }).click()
  await expect(win.getByText(en['chat.none'])).toBeVisible()
  await app.close()

  ;({ app, win } = await launch(dir))
  await expect(win.getByText(en['chat.none'])).toBeVisible()
  await app.close()
})

test('model output is rendered as sanitized markdown', async () => {
  const { app, win } = await launch(test.info().outputPath('data'))
  const box = win.getByRole('textbox', { name: it['composer.label'] })
  await box.fill('**forte** [link](https://example.com) <img src=x onerror="window.__xss=1"> <script>window.__xss=1</script>')
  await box.press('Enter')

  const prose = win.locator('.prose').last()
  await expect(prose.locator('strong').last()).toHaveText('forte')
  await expect(prose.locator('a')).toHaveAttribute('target', '_blank')
  await expect(prose.locator('a')).toHaveAttribute('rel', 'noopener noreferrer')
  expect(await prose.locator('script, [onerror]').count()).toBe(0)
  expect(await win.evaluate(() => (window as unknown as Record<string, unknown>).__xss)).toBeUndefined()
  await app.close()
})
