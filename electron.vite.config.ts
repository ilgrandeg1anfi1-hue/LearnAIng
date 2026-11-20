import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [
      react(),
      {
        // Dev only: React Refresh preamble and Vite CSS are inline. Production CSP stays strict.
        name: 'dev-csp',
        apply: 'serve',
        transformIndexHtml: (html) =>
          html
            .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
            .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
      }
    ]
  }
})
