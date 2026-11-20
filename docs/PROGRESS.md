# Progresso

Piano completo: `C:\Users\ilgra\.claude\plans\pasted-content-id-31c7-voglio-progettar-sparkling-mist.md` (sintesi in `docs/ARCHITECTURE.md`).

## Fase corrente
**Nome app: LearnAIng** (rinominata il 2026-11-20 da "AI Research & Learning": appId `app.learnaing.desktop`, export `.learnaing`).

**Fase 0 — Fondamenta: completata** (tag `v0.0.0-fase0`, 2026-11-20), con un criterio non verificabile su questo PC: l'avvio dell'exe è bloccato da Smart App Control (vedi Problemi aperti). Prossima: **Fase 1 — Storage, chat UI, i18n**.

## Completato (Fase 0)
- Repo git (`main`), hook gitleaks in `.githooks/pre-commit` (attivato da `npm install` via `prepare`).
- Scaffold Electron 45.4.1 + electron-vite 6 + React 19 + TS 6, baseline di sicurezza completa (vedi `docs/SECURITY.md`).
- IPC: helper `handle()` in `src/main/index.ts` (mittente + validazione); unico canale `app:version`.
- ESLint (+ `tsc --noEmit`), Vitest (3 test su `src/main/security.ts`), Playwright E2E (finestra, IPC, niente `require`/`process`, CSP, navigazione e `window.open` bloccati).
- CI GitHub Actions su windows-latest: lint, test, `npm audit --audit-level=high`.
- electron-builder: `dist/ai-research-learning-0.0.0-setup.exe` e `dist/ai-research-learning-0.0.0-portable.exe`.
- ADR 001–005; `node:sqlite` con FTS5 confermato (ADR 005).

## Prossimi passi (Fase 1)
- Schema SQLite con migrazioni versionate (`node:sqlite`), cartella dati portable/installata.
- Chat persistenti: lista, rinomina, elimina, continua; provider finto "echo".
- UI minimal chiaro/scuro, i18n IT/EN (dizionari JSON + `t()`).
- Test: migrazioni e repository (unit), crea chat → riavvio → chat presente (E2E).

## Problemi aperti
- **Smart App Control blocca gli exe anche firmati self-signed.** Prova del 2026-11-20 con il certificato `CN=AIRL Dev Self-Signed` (SHA1 `549A01348EE3BCCD0BF399DC17E45DCB0043DB24`, chiave non esportabile in `Cert:\CurrentUser\My`, importato in `CurrentUser\Root` e `TrustedPublisher`): il log CodeIntegrity riporta `KnownRoot=2`, `VerificationError=18`. SAC accetta solo radici del programma Microsoft. Un primo exe firmato era partito per il verdetto di reputazione cloud di Defender, non per la firma; la build successiva (hash diverso) è stata bloccata. Quindi: la firma self-signed è inutile per SAC. Per avviare gli exe su questo PC serve una CA riconosciuta (es. Azure Trusted Signing, certificato OV) oppure testarli su un altro PC/VM. Il pacchetto `app.asar` è verificato con l'Electron firmato.
  Build firmata (solo su questo PC; la cache di electron-builder va disattivata, altrimenti riusa un exe firmato in precedenza ignorando i cambi ai fuse), in PowerShell:
  `npm run build; $env:ELECTRON_BUILDER_DISABLE_BUILD_CACHE='true'; npx electron-builder --win "-c.win.signtoolOptions.certificateSha1=549A01348EE3BCCD0BF399DC17E45DCB0043DB24"`
  Per togliere la fiducia al certificato: `certmgr.msc` → Autorità di certificazione radice attendibili e Autori attendibili → elimina "AIRL Dev Self-Signed".
  **Pulizia completata (2026-11-20):** certificato rimosso da `CurrentUser\Root` e `CurrentUser\TrustedPublisher` (verificato; assente anche dagli store `LocalMachine`). Resta in `CurrentUser\My` con la chiave di firma, non attendibile. Le firme degli exe in `dist/` risultano ora non verificabili (`UnknownError`), come previsto.
  **Verifica avvio exe: superata (2026-11-20)** in macchina virtuale: dopo l'avviso SmartScreen (autore sconosciuto → "Esegui comunque") l'app mostra titolo e `v0.0.0`, quindi preload e IPC funzionano nell'exe impacchettato. La persistenza delle chat è coperta solo dall'E2E (non c'è ancora UI chat). Build testata (SHA256): portable `CCBF4D2457E4BC26A6C778F32423FF4E5082A3D2357860000C96DEA689EC727F`, setup `C1EABF5DFC3B3B375EA2B9997370BEE43AA06256CB9EBC86B3B73E0D6813E801`.
- `npm audit`: 6 vulnerabilità moderate in `electron-builder` (minimatch via `@electron/universal`, solo build). Nessuna alta; la CI fallisce solo da `high` in su.
- Nessuna icona applicazione (usata quella di Electron).
- GitHub secret scanning e push protection: **attivi** dal 2026-11-20 (gratuiti con il repo pubblico), in aggiunta a gitleaks (hook locale e job `secrets` in CI).
- Advisory moderate di `minimatch` (via `app-builder-lib`, `@electron/universal`): non corrette di proposito. Solo build, glob dalla nostra config (ReDoS non sfruttabile); forzare il salto di major rischierebbe di rompere electron-builder. Ricontrollare a ogni aggiornamento di electron-builder.

## Firma del codice (2026-11-20)
**Causa di "Autore sconosciuto":** gli exe non hanno una firma Authenticode emessa da una CA riconosciuta (Microsoft Trusted Root Program). Metadati, fuse o configurazione Electron non c'entrano: senza certificato commerciale l'avviso resta. Anche con firma valida SmartScreen può avvisare finché il file non accumula reputazione (per hash; dal 2024 EV e OV sono trattati allo stesso modo).

**Confronto (verificato 2026-11-20, documentazione Microsoft e listini rivenditori):**
| | Azure Artifact Signing (ex Trusted Signing) | Certificato OV/IV |
|---|---|---|
| Costo | Basic ~9,99 $/mese (5.000 firme), Premium ~99,99 $/mese; fatturato per intero dalla creazione dell'account; serve abbonamento Azure a pagamento | ~100–250 €/anno a seconda della CA (Certum, SSL.com, Sectigo); prezzi da confermare sul sito della CA |
| Italia, persona fisica | **No**: Public Trust per individui solo USA e Canada | **Sì** (validazione individuale, documento d'identità) |
| Italia, organizzazione | Sì (UE); validazione 1–30 giorni lavorativi, sito e email su dominio dell'entità | Sì |
| Chiave | HSM Microsoft, certificati a breve durata gestiti dal servizio | HSM obbligatorio (token USB o cloud del fornitore, es. Certum SimplySign, SSL.com eSigner) |
| electron-builder | `win.azureSignOptions` (installa il modulo PowerShell `TrustedSigning` da PSGallery al build) | `win.signtoolOptions` (`certificateSubjectName`/`certificateSha1` dallo store Windows) |
| Firma in CI | Sì (credenziali Entra ID in variabili d'ambiente) | Di solito solo locale (login con OTP sul telefono) |

**Raccomandazione:** come persona fisica in Italia → certificato OV/IV con chiave RSA in cloud HSM (es. Certum o SSL.com). Azure solo se in futuro si opera come organizzazione (da verificare se una ditta individuale con P.IVA è accettata come "organizzazione": non confermato).

**Implementato (gratis):**
- `signing/ov.yml` e `signing/azure.yml`: estendono `electron-builder.yml` (fuse, file, target identici), `forceCodeSigning: true` (il build fallisce invece di produrre exe non firmati). Verificato: `npm run dist:ov` senza certificato si ferma con "Cannot find certificate" e non scrive exe.
- Script `npm run dist:ov`, `npm run dist:azure`, `npm run verify:signature` (`scripts/verify-signature.ps1`: fallisce se un exe in `dist/` non ha firma `Valid` con timestamp; oggi segnala correttamente gli exe self-signed come `UnknownError`).
- Test `src/main/signing-config.test.ts`: le config firmate passano la validazione di electron-builder e mantengono le protezioni della base.
- ADR 006.

**Strade gratuite (budget zero, 2026-11-20):**
1. **Microsoft Store (scelta consigliata, implementata).** Registrazione sviluppatore individuale gratuita (identità con documento e selfie). Il pacchetto MSIX viene firmato da Microsoft: niente "Autore sconosciuto", niente blocco Smart App Control, aggiornamenti automatici, repo resta privato. Limite: vale solo per chi installa dallo Store; exe setup/portable distribuiti fuori dallo Store restano non firmati.
   - `signing/store.yml` + `npm run dist:store` → `dist/learnaing-0.0.0-store.appx` (build verificata, fuse letti dall'exe: identici alla base).
   - Bug di electron-builder trovato: il nome dell'eseguibile non è escapato nel manifest AppX, la `&` del productName lo rendeva invalido (`0x80080204`). Risolto prima con `executableName`, poi reso superfluo dal nuovo nome senza `&` (il test impedisce di reintrodurre caratteri non sicuri).
   - Non testato: installazione locale dell'appx (richiede Modalità sviluppatore, non attivata) e Windows App Certification Kit (non installato). La certificazione dello Store lo verificherà.
   - Passaggi: account su https://partner.microsoft.com (tipo Individual) → riserva il nome dell'app → copia da "Identità app" `Package/Identity/Name`, `Publisher` e `PublisherDisplayName` in `signing/store.yml` → `npm run dist:store` → carica l'appx con privacy policy (obbligatoria: l'app contatta provider AI) e screenshot. Prima della pubblicazione: icona applicazione (oggi manca, lo Store usa quella di default).
2. **SignPath Foundation** (gratis per open source): richiede repo **pubblico** con licenza OSI, build in GitHub Actions, MFA per tutti; l'editore mostrato è "SignPath Foundation", l'approvazione non è garantita. **Scelta il 2026-11-20:** repo reso pubblico con licenza MIT. Prossimi passi: richiesta su https://signpath.org (form di candidatura), MFA attiva su GitHub, poi job di firma in GitHub Actions (setup/portable firmati in CI) e `verify:signature` sugli artifact.
3. **Senza firma:** l'avviso resta. Mitigazioni gratuite: per i propri PC copiare l'exe senza scaricarlo dal browser (niente Mark of the Web, niente SmartScreen; Smart App Control blocca comunque), oppure inviare l'exe a Microsoft (https://www.microsoft.com/wdsi/filesubmission) per la reputazione, da rifare a ogni versione.
- Nota: la prima prova di `dist:store` (target concatenati) ha rigenerato anche setup e portable in `dist/` **non firmati**: gli hash della build testata in VM, riportati sopra, non corrispondono più ai file presenti.

**Passaggi quando si acquista (OV/IV):**
1. Scegliere la CA, chiedere certificato **RSA** con firma in cloud o token; completare la validazione.
2. Installare lo strumento del fornitore (es. SimplySign Desktop) ed effettuare il login: il certificato compare in `Cert:\CurrentUser\My`.
3. In `signing/ov.yml` sostituire `REPLACE_WITH_CERTIFICATE_CN` con il CN del certificato.
4. `$env:ELECTRON_BUILDER_DISABLE_BUILD_CACHE='true'; npm run dist:ov; npm run verify:signature`.
5. Provare l'exe su un PC pulito: deve mostrare l'editore verificato; l'avviso SmartScreen può restare per le prime versioni.

**Passaggi per Azure (solo organizzazione):** account Azure a pagamento → risorsa Artifact Signing (es. West Europe) → validazione identità → profilo certificato Public Trust → app registration con ruolo "Artifact Signing Certificate Profile Signer" → compilare `signing/azure.yml` → `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` nell'ambiente → `npm run dist:azure; npm run verify:signature`. `dist:azure` non è stato eseguito (scaricherebbe il modulo da PSGallery senza account).

## Security review Fase 0 (2026-11-20)
Revisione manuale di tutto il codice (la skill `security-review` analizza solo diff verso `origin`, qui vuoto).
- **Corretto**: l'exe impacchettato accettava `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` e `--inspect` (runtime Node firmato riutilizzabile). Aggiunti gli Electron fuses in `electron-builder.yml`; verificato che `ELECTRON_RUN_AS_NODE` non esegue più codice.
- **Corretto**: action della CI fissate per SHA.
- **Rinviato (Fase 7)**: `grantFileProtocolExtraPrivileges` resta attivo perché il renderer è caricato da `file://`; disattivarlo quando si passa al protocollo custom.
- **Nota**: `will-navigate` copre solo il frame principale; oggi la CSP `frame-src 'none'` vieta gli iframe. Con le mini-app (Fase 7) gestire anche `will-frame-navigate`.
- Nessun problema in IPC (`handle()`), preload, permessi, apertura link esterni.

## Verifiche extra (2026-11-20)
- Modalità dev: app aperta con Playwright contro il dev server, versione via IPC visibile, CSS applicato, zero errori in console.

## Repository
- https://github.com/ilgrandeg1anfi1-hue/LearnAIng (**pubblico** dal 2026-11-20, licenza MIT), `main` + tag `v0.0.0-fase0`. Rinominato da `ai-research-learning` (GitHub reindirizza il vecchio URL).
- Prima della pubblicazione: gitleaks su tutta la cronologia e sui file (nessun segreto); email dei commit riscritta in `emailprogrammare@gmail.com` (cronologia e tag riscritti, push forzato). Email impostata nella config git locale del repo.
- Esecuzioni CI dei commit originali cancellate (rimandavano ai commit con la vecchia email). Anche così GitHub può conservare i vecchi commit raggiungibili per SHA esatto: per rimuoverli del tutto serve una richiesta al supporto GitHub.
- CI sul push forzato: `check` verde, `secrets` fallito perché la gitleaks-action scansiona `<primo commit>^..HEAD` e il primo commit del push era la radice (`3434a81^` non esiste). Nessun segreto: scansione completa locale pulita. Si risolve da sola ai push normali.
