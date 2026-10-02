import { describe, expect, it } from 'vitest'
import { basisLabel, mixedNote, summariseBases, type BasisRow } from '../utils/market-basis'

const row = (group: string, marketSource: string | null): BasisRow => ({ group, marketSource })

describe('summariseBases', () => {
  it('reports a single basis when every priced row shares it', () => {
    const s = summariseBases([row('1X2', 'book'), row('1X2', 'book'), row('Total goals', 'book')])
    expect(s.bases).toEqual(['book'])
    expect(s.groups.book).toEqual(['1X2', 'Total goals'])
  })

  it('lists a mixed board in preference order, whatever order the rows arrive in', () => {
    const s = summariseBases([row('Total goals', 'book'), row('1X2', 'close_avg'), row('Double chance', 'open_avg')])
    expect(s.bases).toEqual(['close_avg', 'open_avg', 'book'])
  })

  it('does not let the first row decide: a book-first board with a close row later is mixed', () => {
    const s = summariseBases([row('1X2', 'book'), row('Total goals', 'close_avg')])
    expect(s.bases).toEqual(['close_avg', 'book'])
  })

  it('names each basis\'s groups once, in order of first appearance', () => {
    const s = summariseBases([
      row('1X2', 'close_avg'), row('1X2', 'close_avg'), row('Total goals', 'book'),
      row('Both teams to score', 'book'), row('Total goals', 'book'),
    ])
    expect(s.groups.close_avg).toEqual(['1X2'])
    expect(s.groups.book).toEqual(['Total goals', 'Both teams to score'])
  })

  it('ignores rows with no source and unknown sources', () => {
    expect(summariseBases([row('1X2', null), row('1X2', 'mystery')]).bases).toEqual([])
    expect(summariseBases([]).bases).toEqual([])
  })
})

describe('basisLabel', () => {
  it('names a single basis', () => {
    expect(basisLabel(['close_avg'])).toBe('Closing price')
    expect(basisLabel(['book'])).toBe('Our scraped price')
  })

  it('writes a mixed board as Mixed · close / book', () => {
    expect(basisLabel(['close_avg', 'book'])).toBe('Mixed · close / book')
    expect(basisLabel(['close_avg', 'open_avg', 'book'])).toBe('Mixed · close / open / book')
  })

  it('says No price when nothing is priced', () => {
    expect(basisLabel([])).toBe('No price')
  })
})

describe('mixedNote', () => {
  it('names which group came from which basis', () => {
    const note = mixedNote(summariseBases([row('1X2', 'close_avg'), row('Total goals', 'book')]))
    expect(note).toContain('Closing price: 1X2')
    expect(note).toContain('Our scraped price: Total goals')
  })
})
