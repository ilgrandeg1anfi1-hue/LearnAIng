import { contextBridge, ipcRenderer } from 'electron'
import type { Settings } from '../main/security'
import type { Chat, Message } from '../main/store'

// Only specific functions, never ipcRenderer itself. Arguments are validated again in main.
const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  listChats: (): Promise<Chat[]> => ipcRenderer.invoke('chats:list'),
  createChat: (title: string): Promise<Chat> => ipcRenderer.invoke('chats:create', title),
  renameChat: (id: number, title: string): Promise<void> => ipcRenderer.invoke('chats:rename', id, title),
  deleteChat: (id: number): Promise<void> => ipcRenderer.invoke('chats:delete', id),
  listMessages: (chatId: number): Promise<Message[]> => ipcRenderer.invoke('messages:list', chatId),
  /** Saves the user message and the provider reply; resolves to both. */
  sendMessage: (chatId: number, content: string): Promise<[Message, Message]> =>
    ipcRenderer.invoke('messages:send', chatId, content),
  getSettings: (): Promise<Required<Settings>> => ipcRenderer.invoke('settings:get'),
  setSetting: <K extends keyof Settings>(key: K, value: Required<Settings>[K]): Promise<void> =>
    ipcRenderer.invoke('settings:set', key, value)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
export type { Chat, Message, Settings }
