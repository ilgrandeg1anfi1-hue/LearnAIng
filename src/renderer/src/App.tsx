import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Chat, Message, Settings } from '../../preload'
import { translate, type Key } from '../../shared/i18n'
import { renderMarkdown } from './markdown'

type Prefs = Required<Settings>
const themes = ['system', 'light', 'dark'] as const
// Language names stay in their own language whatever the UI language is.
const languages = { it: 'Italiano', en: 'English' } as const

/** Sidebar title for a new chat: first line of the first message, cut on code points. */
const titleOf = (text: string) => [...text.split('\n')[0].trim()].slice(0, 80).join('')
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const [version, setVersion] = useState('')
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null)
  const [error, setError] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)

  const fail = (e: unknown) => setError(errorText(e))

  useEffect(() => {
    const onError = (e: unknown) => setError(errorText(e))
    window.api.getVersion().then(setVersion, onError)
    window.api.getSettings().then(setPrefs, onError)
    window.api.listChats().then(setChats, onError)
  }, [])

  useEffect(() => {
    if (prefs) document.documentElement.lang = prefs.language
  }, [prefs])

  // Block body: in recent Chromium scrollIntoView returns a Promise, which React would call as cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  if (!prefs) return null
  const t = (key: Key, vars?: Record<string, string>) => translate(prefs.language, key, vars)

  async function openChat(id: number | null) {
    setEditing(null)
    setCurrentId(id)
    try {
      setMessages(id === null ? [] : await window.api.listMessages(id))
    } catch (e) {
      fail(e)
    }
    composer.current?.focus()
  }

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      let id = currentId
      if (id === null) {
        id = (await window.api.createChat(titleOf(text))).id
        setCurrentId(id)
      }
      const pair = await window.api.sendMessage(id, text)
      setMessages((m) => [...m, ...pair])
      setDraft('') // cleared only once saved: a failed send keeps the text
      setChats(await window.api.listChats())
    } catch (e) {
      fail(e)
    } finally {
      setSending(false)
    }
  }

  async function saveRename() {
    if (!editing) return
    setEditing(null)
    const title = editing.title.trim()
    if (!title) return
    try {
      await window.api.renameChat(editing.id, title)
      setChats(await window.api.listChats())
    } catch (e) {
      fail(e)
    }
  }

  async function remove(chat: Chat) {
    if (!window.confirm(t('chat.deleteConfirm', { title: chat.title }))) return
    try {
      await window.api.deleteChat(chat.id)
      if (chat.id === currentId) await openChat(null)
      setChats(await window.api.listChats())
    } catch (e) {
      fail(e)
    }
  }

  async function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    try {
      await window.api.setSetting(key, value)
      setPrefs(await window.api.getSettings())
    } catch (e) {
      fail(e)
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  function onRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void saveRename()
    if (e.key === 'Escape') setEditing(null)
  }

  return (
    <>
      <aside className="sidebar">
        <p className="wordmark">LearnAIng</p>
        <button className="new-chat" onClick={() => openChat(null)} disabled={sending}>
          <PlusIcon />
          {t('chat.new')}
        </button>

        <nav className="history" aria-label={t('chat.history')}>
          {chats.length === 0 && <p className="muted">{t('chat.none')}</p>}
          <ul>
            {chats.map((c) => (
              <li key={c.id} className={c.id === currentId ? 'active' : undefined}>
                {editing?.id === c.id ? (
                  <input
                    aria-label={t('chat.titleLabel')}
                    value={editing.title}
                    maxLength={200}
                    autoFocus
                    onChange={(e) => setEditing({ id: c.id, title: e.target.value })}
                    onKeyDown={onRenameKey}
                    onBlur={saveRename}
                  />
                ) : (
                  <>
                    <button
                      className="open"
                      aria-current={c.id === currentId ? 'page' : undefined}
                      onClick={() => openChat(c.id)}
                      disabled={sending}
                    >
                      <span>{c.title}</span>
                    </button>
                    <button
                      className="icon"
                      aria-label={t('chat.rename')}
                      title={t('chat.rename')}
                      onClick={() => setEditing({ id: c.id, title: c.title })}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className="icon"
                      aria-label={t('chat.delete')}
                      title={t('chat.delete')}
                      onClick={() => remove(c)}
                      disabled={sending}
                    >
                      <TrashIcon />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="prefs">
          <label>
            {t('settings.theme')}
            <select value={prefs.theme} onChange={(e) => updatePref('theme', e.target.value as Prefs['theme'])}>
              {themes.map((v) => (
                <option key={v} value={v}>
                  {t(`theme.${v}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('settings.language')}
            <select value={prefs.language} onChange={(e) => updatePref('language', e.target.value as Prefs['language'])}>
              {Object.entries(languages).map(([v, name]) => (
                <option key={v} value={v}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <p className="version">{version && `v${version}`}</p>
        </div>
      </aside>

      <main className="conversation">
        {error && (
          <div className="error" role="alert">
            <p>{t('error.generic', { message: error })}</p>
            <button onClick={() => setError('')}>{t('error.dismiss')}</button>
          </div>
        )}

        <section className="thread" aria-label={t('chat.messages')}>
          <div className="column">
            {messages.length === 0 ? (
              <div className="welcome">
                <h1>{t('welcome.title')}</h1>
                <p>{t('welcome.subtitle')}</p>
              </div>
            ) : (
              messages.map((m) =>
                m.role === 'user' ? (
                  <article key={m.id} className="message user">
                    <h2>{t('role.user')}</h2>
                    <p>
                      <span className="marked">{m.content}</span>
                    </p>
                  </article>
                ) : (
                  <article key={m.id} className="message assistant">
                    <h2>{t('role.assistant')}</h2>
                    <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  </article>
                )
              )
            )}
            <div ref={end} />
          </div>
        </section>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <div className="field">
            <textarea
              ref={composer}
              aria-label={t('composer.label')}
              placeholder={t('composer.placeholder')}
              value={draft}
              rows={1}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKey}
            />
            <button type="submit" disabled={sending || !draft.trim()}>
              {t('composer.send')}
            </button>
          </div>
          <p className="hint">{t('composer.hint')}</p>
        </form>
      </main>
    </>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.5 2.5l3 3L6 13H3v-3z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" />
    </svg>
  )
}
