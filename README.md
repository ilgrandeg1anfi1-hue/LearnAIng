# LearnAIng

Verified deep research and interactive learning, with your data kept local.

LearnAIng is a Windows desktop app (Electron + TypeScript) that researches a topic across web sources and your documents, checks every citation against the source text, and turns the result into interactive lessons.

- **Local data:** one SQLite file on your PC (next to the exe in the portable version, `%APPDATA%` when installed). No account, no telemetry.
- **Any AI provider:** OpenAI-compatible and Anthropic APIs with your own API key, stored encrypted with Windows DPAPI.
- **Security first:** sandboxed renderer, strict CSP, validated IPC, Electron fuses, secret scanning in CI. See [docs/SECURITY.md](docs/SECURITY.md).

> **Status:** early development. The current build contains the app shell only; research, chat and lessons arrive in the next phases ([docs/PROGRESS.md](docs/PROGRESS.md)).

## Download
A Microsoft Store version (signed by Microsoft, no SmartScreen warning) is in preparation.

Builds are on the [Releases](https://github.com/ilgrandeg1anfi1-hue/LearnAIng/releases) page: `-setup.exe` (installer) and `-portable.exe`. They are **not code-signed**, so Windows SmartScreen shows "Unknown publisher" (choose *More info → Run anyway*); Smart App Control may block them.

## Build from source
Requires Node.js 24 and Windows.

```
npm ci
npm run dev        # development
npm test           # unit tests
npm run test:e2e   # end-to-end tests
npm run dist       # installer + portable exe in dist/
```

## Documents
- [Privacy policy](PRIVACY.md)
- [Architecture](docs/ARCHITECTURE.md) (Italian)

## License
[MIT](LICENSE)
