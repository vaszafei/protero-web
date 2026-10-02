import { describe, expect, it } from 'vitest'
import { errorText } from '../utils/error-text'

describe('errorText', () => {
  it('reads our endpoints\' ofetch errors', () => {
    expect(errorText({ data: { message: 'Not authenticated' } })).toBe('Not authenticated')
    expect(errorText({ statusMessage: 'Forbidden' })).toBe('Forbidden')
  })
  it('reads a PostgREST error object and a plain Error', () => {
    expect(errorText({ message: 'permission denied for table bets', code: '42501' })).toBe('permission denied for table bets')
    expect(errorText(new Error('boom'))).toBe('boom')
  })
  it('never returns an empty string', () => {
    for (const e of [null, undefined, {}, { message: '  ' }, 'str']) expect(errorText(e)).toBe('Request failed')
    expect(errorText(null, 'custom')).toBe('custom')
  })
})
