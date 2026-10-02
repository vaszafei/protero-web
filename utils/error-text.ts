/**
 * One line of text for a failed request, whatever threw it: an ofetch error
 * (`data.message` / `statusMessage` from our own endpoints), a PostgREST error
 * object (`message`), or a plain Error. Never returns an empty string — an error
 * panel with no text reads as a rendering bug, not a failure.
 */
export function errorText(e: unknown, fallback = 'Request failed'): string {
  const x = e as any
  const text = x?.data?.message || x?.data?.statusMessage || x?.statusMessage || x?.message
  return typeof text === 'string' && text.trim() ? text.trim() : fallback
}
