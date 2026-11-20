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
| Segreti nel repo | errori umani | `.gitignore`, gitleaks pre-commit e in CI (il secret scanning GitHub non è disponibile sul repo privato gratuito) |
| Dipendenze vulnerabili | supply chain | dipendenze minime, `npm audit` in CI, Electron aggiornato a ogni fase, action CI fissate per SHA |
| Exe usato come runtime Node | malware che sfrutta un binario firmato | Electron fuses: RunAsNode / NODE_OPTIONS / `--inspect` disabilitati, integrità asar |

## Checklist (rieseguire a ogni fase)
- [ ] Fuses attivi sull'exe impacchettato (`npx @electron/fuses read --app "dist/win-unpacked/LearnAIng.exe"`): RunAsNode, NodeOptions, NodeCliInspect disabilitati; AsarIntegrity e OnlyLoadAppFromAsar abilitati.
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
- Firma: un certificato self-signed non soddisfa Smart App Control (serve una radice del programma Microsoft). Prima della distribuzione serve un certificato di una CA riconosciuta. Se il certificato self-signed di prova resta tra le radici attendibili dell'utente, la sua chiave privata (non esportabile) non va mai copiata né committata.
