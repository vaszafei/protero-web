/**
 * Stoiximan screenshot parser.
 * Handles two formats from the same page:
 *  1. Alt-lines section (Πόντοι / top table): "PlayerName  13+ 1.33  14+ 1.47 …"
 *  2. O/U section (Πόντοι Ο/U / bottom table): "PlayerName  Line  Over  Under"
 *
 * Returns a merged structure matching the JSON format used by analyze_euroleague_props.py:
 * {
 *   players: { [name]: { team, points/rebounds/assists/pra: {line, over, under} } },
 *   alt_lines: { points/rebounds/assists/pra: { [name]: {team, lines: {N: odds}} } }
 * }
 */

interface PropLine {
  line: number
  over: number
  under: number
}
interface PlayerProps {
  team: string
  points?: PropLine
  rebounds?: PropLine
  assists?: PropLine
  pra?: PropLine
}
interface AltLineEntry {
  team: string
  lines: Record<string, number>  // "13": 1.33
}
export interface ParsedProps {
  players: Record<string, PlayerProps>
  alt_lines: Record<string, Record<string, AltLineEntry>>  // market → player → entry
}

// Greek team headers from Stoiximan
const TEAM_HEADERS_RE = /^(μονακό|χάπελ|χάοελ|τελ αβίβ|ολυμπιακός|παναθηναϊκός|φενερμπαχτσέ|ρεάλ μαδρίτης|μπαρτσελόνα|ζαλγκίρις|βίρτους|μπαγέρν|βαλένθια|μακάμπι|μπασκόνια|αναντολού|ζαλγκ|ρεάλ|μπαρ|παν|φεν|ασβελ|λυόν|ζβέζντα|παρί|ντουμπάι)/i

// Market section headers
const MARKET_HEADERS: Record<string, string> = {
  'πόντοι ο/u': 'points',
  'ριμπάουντ ο/u': 'rebounds',
  'ριμπάουντς ο/u': 'rebounds',
  'ασίστ ο/u': 'assists',
  'pra ο/u': 'pra',
  'πόντοι': 'points',
  'ριμπάουντ': 'rebounds',
  'ριμπάουντς': 'rebounds',
  'ασίστ': 'assists',
  'pra': 'pra',
  // English fallbacks
  'points o/u': 'points',
  'rebounds o/u': 'rebounds',
  'assists o/u': 'assists',
  'pra o/u': 'pra',
  'points': 'points',
  'rebounds': 'rebounds',
  'assists': 'assists',
}

function isOdds(s: string): boolean {
  const n = parseFloat(s)
  return !isNaN(n) && n >= 1.0 && n <= 99
}

function isLine(s: string): boolean {
  const n = parseFloat(s)
  return !isNaN(n) && n >= 0.5 && n <= 80
}

function isAltLineToken(s: string): boolean {
  // "13+" or "13"
  return /^\d+\+?$/.test(s.trim())
}

/** Strip Greek characters and OCR artifacts from a player name */
function cleanPlayerName(raw: string): string {
  return raw
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF]+/g, '')  // Greek Unicode ranges
    .replace(/[{}<>|]/g, '')                           // OCR bracket artifacts
    .replace(/[^\w\s.\-']/g, '')                       // Keep word chars, spaces, dots, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .replace(/^[\s.\-]+|[\s.\-]+$/g, '')
    .trim()
}

/**
 * Parse alt-lines table section.
 * Input lines look like:
 *   "Mike James   13+ 1.33  14+ 1.47  15+ 1.62 ..."
 */
function parseAltLinesSection(lines: string[], market: string, currentTeam: string): Record<string, AltLineEntry> {
  const result: Record<string, AltLineEntry> = {}

  for (const rawLine of lines) {
    const parts = rawLine.trim().split(/\s+/)
    if (parts.length < 4) continue

    // Find where numbers start (first "N+" or number-only token)
    let numStart = -1
    for (let i = 0; i < parts.length; i++) {
      if (isAltLineToken(parts[i])) {
        numStart = i
        break
      }
    }
    if (numStart < 1) continue

    const playerName = cleanPlayerName(parts.slice(0, numStart).join(' '))
    if (!playerName || playerName.length < 3) continue
    // Skip if it looks like a header
    if (/^(line|over|under|λιγ|λίγ)/i.test(playerName)) continue

    const altLines: Record<string, number> = {}
    for (let i = numStart; i < parts.length - 1; i++) {
      const tok = parts[i].replace('+', '')
      const oddsStr = parts[i + 1]
      if (isAltLineToken(parts[i]) && isOdds(oddsStr)) {
        altLines[tok] = parseFloat(oddsStr)
        i++ // skip the odds token we already consumed
      }
    }

    if (Object.keys(altLines).length > 0) {
      result[playerName] = { team: currentTeam, lines: altLines }
    }
  }

  return result
}

/**
 * Parse O/U table section.
 * Input lines look like:
 *   "Mike James   15.5   1.83   1.90   Elie Okobo   14.5   1.87   1.88"
 * OR single player per line:
 *   "Mike James   15.5   1.83   1.90"
 */
function parseOUSection(lines: string[], market: string, currentTeam: string): Record<string, { team: string; line: number; over: number; under: number }> {
  const result: Record<string, { team: string; line: number; over: number; under: number }> = {}

  for (const rawLine of lines) {
    const parts = rawLine.trim().split(/\s+/)
    if (parts.length < 4) continue

    // Try to find all "name + line + over + under" groups in this line
    // Pattern: one or more name words, then decimal, then 2 odds values
    let i = 0
    while (i < parts.length) {
      // Collect name words until we hit a decimal number (the line)
      const nameTokens: string[] = []
      while (i < parts.length && !isLine(parts[i])) {
        if (/^[a-zA-ZΑ-Ωα-ωάέήίόύώΐϊΌΆΈΉΊΎΏ.\-']+$/.test(parts[i]) && parts[i].length > 1) {
          nameTokens.push(parts[i])
        }
        i++
      }
      if (nameTokens.length === 0 || i >= parts.length) { i++; continue }

      const lineVal = parseFloat(parts[i]); i++
      if (i >= parts.length || !isOdds(parts[i])) continue
      const overVal = parseFloat(parts[i]); i++
      if (i >= parts.length || !isOdds(parts[i])) continue
      const underVal = parseFloat(parts[i]); i++

      const playerName = cleanPlayerName(nameTokens.join(' '))
      if (playerName.length < 3) continue
      if (/^(line|over|under|λιγ|λίγ|column)/i.test(playerName)) continue

      result[playerName] = { team: currentTeam, line: lineVal, over: overVal, under: underVal }
    }
  }

  return result
}

export function useStoiximanParser() {
  /**
   * Main entry point. Takes raw OCR text, returns parsed props structure.
   */
  function parse(rawText: string): ParsedProps {
    const result: ParsedProps = { players: {}, alt_lines: {} }
    const textLines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

    let currentMarket = 'points'
    let isOUSection = false
    let currentTeam = ''
    let sectionBuffer: string[] = []

    function flushSection() {
      if (!sectionBuffer.length) return
      if (isOUSection) {
        const parsed = parseOUSection(sectionBuffer, currentMarket, currentTeam)
        for (const [name, data] of Object.entries(parsed)) {
          if (!result.players[name]) result.players[name] = { team: data.team }
          ;(result.players[name] as any)[currentMarket] = { line: data.line, over: data.over, under: data.under }
        }
      } else {
        const parsed = parseAltLinesSection(sectionBuffer, currentMarket, currentTeam)
        if (!result.alt_lines[currentMarket]) result.alt_lines[currentMarket] = {}
        for (const [name, data] of Object.entries(parsed)) {
          result.alt_lines[currentMarket][name] = data
        }
      }
      sectionBuffer = []
    }

    for (const line of textLines) {
      const lower = line.toLowerCase().trim()

      // Detect market section headers
      let matchedMarket: string | null = null
      for (const [pattern, market] of Object.entries(MARKET_HEADERS)) {
        if (lower === pattern || lower.startsWith(pattern + ' ') || lower.endsWith(' ' + pattern)) {
          matchedMarket = market
          break
        }
      }
      if (matchedMarket) {
        flushSection()
        currentMarket = matchedMarket
        isOUSection = lower.includes('ο/u') || lower.includes('o/u')
        continue
      }

      // Detect team header lines (single word, no numbers)
      if (TEAM_HEADERS_RE.test(lower) && !/\d/.test(line)) {
        flushSection()
        currentTeam = line.trim()
        continue
      }

      // Skip column header rows
      if (/^(line|over|under|λιγ|λίγ|μονάδα|column)\s/i.test(lower)) continue

      // Skip "ΛΙΓΟΤΕΡΑ" / dividers
      if (/^λιγ|^---+|^===+/i.test(lower)) continue

      sectionBuffer.push(line)
    }
    flushSection()

    return result
  }

  return { parse }
}
