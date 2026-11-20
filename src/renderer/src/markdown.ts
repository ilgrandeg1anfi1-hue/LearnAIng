import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Links leave the app only via window.open → main's handler (http(s) only, after confirmation).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Markdown from untrusted sources (model output, pages, user) → sanitized HTML. */
export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false }))
}
