# Sicurezza

## Modello di minaccia
| Minaccia | Origine | Difesa |
|---|---|---|
| Esecuzione di codice dal renderer | XSS da Markdown/contenuti esterni | sandbox + contextIsolation + no Node, CSP rigida, DOMPurify |
| Abuso dell'IPC | renderer compromesso, frame estranei | preload minimo, `handle()` verifica il frame principale della nostra pagina e valida gli argomenti |
| Navigazione verso pagine ostili | link nei contenuti | `will-navigate` bloccato, `window.open` negato, http(s) nel browser solo dopo conferma |
| Furto delle API key | renderer, log, export | chiavi solo nel main, `safeStorage` (DPAPI), mai in IPC/log/export |
| Prompt injection | pagine e documenti letti | contenuti delimitati come dati, nessun tool con effetti, URL whitelistati, verifica citazioni verbatim |
| Esfiltrazione / SSRF | URL inventati dal modello, redirect | fetch solo di URL da ricerca/utente, blocco IP privati/localhost anche dopo redirect, limiti di dimensione/timeout, niente cookie |
| Mini-app malevole | codice generato dal modello | iframe `sandbox="allow-scripts"` senza `allow-same-origin`, CSP `connect-src 'none'`, `postMessage` a schema fisso |
| Segreti nel repo | errori umani | `.gitignore`, gitleaks pre-commit, GitHub secret scanning/push protection |
| Dipendenze vulnerabili | supply chain | dipendenze minime, `npm audit` in CI, Electron aggiornato a ogni fase |

## Checklist (rieseguire a ogni fase)
- [ ] `webPreferences` invariati: `contextIsolation`, `sandbox`, `!nodeIntegration`, `webSecurity`.
- [ ] CSP di produzione senza `unsafe-inline`/`unsafe-eval`/origini remote (`grep unsafe out/renderer/index.html` → vuoto).
- [ ] Ogni nuovo canale IPC passa da `handle()` con validatore; il preload non espone `ipcRenderer`.
- [ ] E2E verde: niente `require`/`process` nel renderer, script inline bloccati, navigazione e `window.open` bloccati.
- [ ] Nessuna chiave in IPC, log o export (test dedicati dalla Fase 2).
- [ ] Contenuti esterni delimitati nei prompt; output modello validato.
- [ ] `npm audit --audit-level=high` pulito; Electron all'ultima versione stabile.
- [ ] gitleaks attivo (`git config core.hooksPath` → `.githooks`).
- [ ] `security-review` eseguita nelle fasi 0, 2, 4, 7, 8.

## Note
- In dev la CSP consente `unsafe-inline` per script e stili (preamble React Refresh e CSS di Vite): plugin `dev-csp` in `electron.vite.config.ts`, applicato solo al dev server.
- L'`eval` non è verificabile in E2E: `page.evaluate` di Playwright passa da CDP e ignora la CSP. Si verifica invece il blocco di uno script inline iniettato.
- Gli exe sono firmati solo con un certificato self-signed attendibile sul PC di sviluppo (vedi `docs/PROGRESS.md`). Altrove SmartScreen / Smart App Control li bloccano o avvisano: prima della distribuzione serve un certificato di una CA riconosciuta. Il certificato self-signed è una radice attendibile per l'utente: la sua chiave privata resta non esportabile e non va mai copiata né committata.
