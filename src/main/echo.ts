import type { Message } from './store'

/** Fake provider to exercise the chat flow: streams back the last message. Real providers keep this shape. */
export async function* echo(messages: Pick<Message, 'role' | 'content'>[]): AsyncGenerator<string> {
  yield '**echo**\n\n'
  yield messages.at(-1)?.content ?? ''
}
