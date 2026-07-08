/**
 * Stoiximan slip OCR + parser.
 *
 * Runs tesseract.js (Greek + English) on a slip screenshot, then extracts
 * structured fields into a BetDraft that pre-fills the my-real-bets form.
 *
 * Heuristic-based — Stoiximan's slip layout is consistent enough that regex
 * extraction works for the headline fields. Per-leg extraction is best-effort:
 * we split on sport-icon-prefixed lines and pair odds/match/result.
 *
 * The user is expected to review the parsed result and correct anything
 * before saving.
 */

export interface OcrLeg {
  sport: 'football' | 'basketball' | 'tennis' | 'other'
  league: string
  match: string
  match_date: string
  market: string
  selection: string
  odds: number
  result: 'pending' | 'won' | 'lost' | 'void'
  score: string
}

export interface OcrBetDraft {
  bookmaker: string
  bookmaker_external_id: string
  bet_type: 'single' | 'parlay' | 'system' | 'bet_builder'
  placed_at: string         // datetime-local format YYYY-MM-DDTHH:mm
  stake: number
  total_odds: number
  status: 'pending' | 'won' | 'lost' | 'void'
  notes: string
  legs: OcrLeg[]
  raw_text: string          // for debugging
}

// ─── Greek vocabulary ─────────────────────────────────────────────────────

const STATUS_MAP: Record<string, OcrBetDraft['status']> = {
  'χαμένο': 'lost',
  'κερδισμένο': 'won',
  'εκκρεμεί': 'pending',
  'ακυρωμένο': 'void',
  'άκυρο': 'void',
  // English fallbacks
  'lost': 'lost', 'won': 'won', 'pending': 'pending', 'void': 'void',
}

const RESULT_MAP: Record<string, OcrLeg['result']> = {
  // Tesseract often confuses ✓ / ✕ Unicode glyphs — we rely more on context
  '✓': 'won', '✔': 'won', 'won': 'won', '☑': 'won',
  '✗': 'lost', '✘': 'lost', '✕': 'lost', 'lost': 'lost', '☒': 'lost',
}

// Bet type — matches "Μονό", "Δυάδα", "Τριάδα", "5-άδες", "Bet Builder"
function parseBetType(text: string, legCount: number): OcrBetDraft['bet_type'] {
  const lc = text.toLowerCase()
  if (/bet\s*builder/i.test(text)) return 'bet_builder'
  if (/μονό/.test(lc) || legCount === 1) return 'single'
  if (/σύστημα|system/.test(lc)) return 'system'
  return 'parlay' // δυάδα / τριάδα / 5-άδες / etc.
}

function parseStatus(text: string): OcrBetDraft['status'] {
  const lc = text.toLowerCase()
  for (const [key, val] of Object.entries(STATUS_MAP)) {
    if (lc.includes(key)) return val
  }
  return 'pending'
}

// Sport detection by keywords typical for each sport's market labels
function inferSport(legText: string): OcrLeg['sport'] {
  const lc = legText.toLowerCase()
  if (/πόντοι|ριμπάουντ|ασίστ|νικητής.*αγών|nba|euroleague|basketball/i.test(lc)) return 'basketball'
  if (/γκολ|τελικό αποτέλεσμα|over\s*\d|under\s*\d|btts/i.test(lc)) return 'football'
  if (/σετ|tie\s*break|tennis/i.test(lc)) return 'tennis'
  return 'other'
}

function parseDate(text: string): string {
  // Stoiximan format: 02/05/2026 - 18:52
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})/)
  if (m) {
    const [, dd, mm, yyyy, hh, mi] = m
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }
  // Fallback: today's datetime
  const now = new Date()
  return now.toISOString().slice(0, 16)
}

// Parse "Σκορ: 3-0" or "Σκορ: 99-91" or "Σκορ: 100-109"
function extractScore(text: string): string {
  const m = text.match(/(?:σκορ|score)\s*:?\s*(\d{1,3})\s*[-–]\s*(\d{1,3})/i)
  return m ? `${m[1]}-${m[2]}` : ''
}

// Parse the slip ID (numeric, 8-12 digits)
function extractSlipId(text: string): string {
  const m = text.match(/ID\s*:?\s*(\d{6,15})/i)
  return m ? m[1] : ''
}

// Parse stake — looks for the first "X,XX €" or "X.XX €"
function extractStake(text: string): number {
  // Look for "Μονό 2,00 €" or "5-άδες 2,00 €" patterns
  const m = text.match(/(?:μονό|δυάδα|τριάδα|τετράδα|\d+-άδες|\d+άδες|stake|σύστημα)\s+(\d+[,.]?\d*)\s*€/i)
  if (m) return parseFloat(m[1].replace(',', '.'))
  // Fallback: first euro amount
  const m2 = text.match(/(\d+[,.]?\d*)\s*€/)
  if (m2) {
    const v = parseFloat(m2[1].replace(',', '.'))
    if (v >= 0.50 && v <= 10000) return v
  }
  return 0
}

// Parse total odds — appears AFTER the headline bet_type+stake line, often
// as a single decimal "16.00" or alongside Επιστροφή. Hardest field — we
// try multiple patterns.
function extractTotalOdds(text: string, legCount: number, legOdds: number[]): number {
  // Look for "Bet Builder ... 16.00" or any large decimal as the top-level
  const bb = text.match(/bet\s*builder[\s\S]{0,40}?(\d+[,.]\d{2})/i)
  if (bb) return parseFloat(bb[1].replace(',', '.'))

  // For multi-leg: prefer product of leg odds when available
  if (legCount > 1 && legOdds.length === legCount && legOdds.every(o => o >= 1.01)) {
    const product = legOdds.reduce((a, b) => a * b, 1)
    return Math.round(product * 100) / 100
  }
  if (legCount === 1 && legOdds.length === 1) return legOdds[0]
  return 1
}

// ─── Per-leg extraction ───────────────────────────────────────────────────

interface LegBlock {
  rawLines: string[]
  oddsCandidate?: number
  result?: OcrLeg['result']
  score?: string
}

function extractLegBlocks(text: string): LegBlock[] {
  // Heuristic: each leg block typically contains:
  //   line 1: <sport_icon> <selection> [<result_icon>] <odds_decimal>
  //   line 2: market label (Greek)
  //   line 3: <home> - <away>
  //   line 4: Σκορ: <score>
  //
  // Sport icons are unicode emojis tesseract often drops. We rely on:
  //   - Decimal odds at end of a line that LOOKS like a selection (1.xx-9.99 range)
  //   - "Σκορ:" markers
  //   - Greek market labels
  //
  // Approach: find every standalone decimal odds "X.XX" line by line,
  // collect that line + 2-3 surrounding lines as a leg block.

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  // Identify market line indices via Greek keywords
  const MARKET_KEYWORDS = [
    /τελικό\s*αποτέλεσμα/i,    // Final Result
    /γκολ\s*over/i,             // Goals Over/Under
    /νικητής/i,                 // Winner
    /πόντοι(?:\s+|$)/i,         // Points (NBA)
    /ριμπάουντ/i,               // Rebounds
    /ασίστ/i,                   // Assists
    /btts|both\s*teams/i,
    /διπλή\s*ευκαιρία/i,        // Double Chance
    /handicap/i,
  ]

  const blocks: LegBlock[] = []

  // Walk lines: when we find an odds-only or odds-at-end line, look back/forward
  const ODDS_RE = /(?:^|\s)(\d{1,2}[.,]\d{2})(?:\s|$)/

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Detect leg trigger: an odds value AND nearby market keyword OR Σκορ: line
    const oddsMatch = line.match(/(?:^|\s)(\d{1,2}[.,]\d{2})\s*$/) || line.match(/^(\d{1,2}[.,]\d{2})$/)
    const isMarket = MARKET_KEYWORDS.some(re => re.test(line))
    const hasScore = /σκορ\s*:/i.test(line)

    if (oddsMatch || isMarket || hasScore) {
      // Collect a window of 4 lines around this anchor
      const start = Math.max(0, i - 1)
      const end = Math.min(lines.length, i + 4)
      const window = lines.slice(start, end)

      // Skip duplicate windows
      const sig = window.slice(0, 3).join('|')
      const lastSig = blocks.length ? blocks[blocks.length - 1].rawLines.slice(0, 3).join('|') : ''
      if (sig !== lastSig) {
        const block: LegBlock = { rawLines: window }
        // Find odds in the window
        for (const w of window) {
          const om = w.match(/(?:^|\s)(\d{1,2}[.,]\d{2})\s*$/)
          if (om) {
            const v = parseFloat(om[1].replace(',', '.'))
            if (v >= 1.01 && v <= 99) { block.oddsCandidate = v; break }
          }
        }
        // Score
        for (const w of window) {
          const s = extractScore(w)
          if (s) { block.score = s; break }
        }
        // Result heuristic — only set if obvious unicode is present
        const blockText = window.join(' ').toLowerCase()
        if (blockText.includes('✓') || blockText.includes('✔')) block.result = 'won'
        else if (blockText.includes('✗') || blockText.includes('✕')) block.result = 'lost'

        blocks.push(block)
      }
      i = end
    } else {
      i++
    }
  }

  return blocks
}

function buildLeg(block: LegBlock, statusFallback: OcrBetDraft['status']): OcrLeg {
  const lines = block.rawLines
  const all = lines.join(' ')

  // Selection — typically the first non-market non-score line
  let selection = ''
  let market = ''
  let match = ''

  for (const line of lines) {
    if (/σκορ\s*:/i.test(line)) continue
    if (/^\s*\d{1,2}[.,]\d{2}\s*$/.test(line)) continue
    if (/τελικό\s*αποτέλεσμα|γκολ\s*over|νικητής|πόντοι|ριμπάουντ|ασίστ|btts|διπλή/i.test(line)) {
      if (!market) market = line.trim()
      continue
    }
    // Lines with " - " are the matchup
    if (/^[A-Za-zΆ-ώ\s]+ - [A-Za-zΆ-ώ\s]+$/.test(line.trim()) && !match) {
      match = line.trim()
      continue
    }
    // Otherwise treat as the selection (first one wins)
    if (!selection && line.length > 1 && line.length < 60) {
      // Strip leading sport-icon artefacts like "@" or stray chars
      selection = line.replace(/^[\W_]+/, '').trim()
    }
  }

  return {
    sport: inferSport(all),
    league: '',
    match: match,
    match_date: '',
    market: market,
    selection: selection,
    odds: block.oddsCandidate || 1,
    // Per-leg result: prefer detected, else inherit overall slip status when terminal
    result: block.result || (statusFallback === 'pending' ? 'pending' : statusFallback as any),
    score: block.score || '',
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────

export function useStoiximanOcr() {
  const status = ref<string>('')
  const running = ref(false)
  const lastRawText = ref<string>('')

  async function parseSlip(file: File | Blob): Promise<OcrBetDraft> {
    running.value = true
    status.value = 'Initializing OCR engine…'
    try {
      const Tesseract = (await import('tesseract.js')).default
      status.value = 'Recognizing slip…'
      const { data: { text } } = await Tesseract.recognize(file, 'eng+ell', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            status.value = `Recognizing… ${Math.round((m.progress || 0) * 100)}%`
          }
        }
      })
      lastRawText.value = text
      status.value = 'Parsing slip…'

      const slipId = extractSlipId(text)
      const stake = extractStake(text)
      const placedAt = parseDate(text)
      const slipStatus = parseStatus(text)
      const blocks = extractLegBlocks(text)
      const legs: OcrLeg[] = blocks.map(b => buildLeg(b, slipStatus))
      const legOdds = legs.map(l => l.odds).filter(o => o > 1)
      const totalOdds = extractTotalOdds(text, legs.length, legOdds)
      const betType = parseBetType(text, legs.length)

      // If parsing missed everything, return a stub with one empty leg
      if (legs.length === 0) {
        legs.push({
          sport: 'football', league: '', match: '', match_date: '',
          market: '', selection: '', odds: 1,
          result: slipStatus === 'pending' ? 'pending' : (slipStatus as any),
          score: '',
        })
      }

      const draft: OcrBetDraft = {
        bookmaker: 'Stoiximan',
        bookmaker_external_id: slipId,
        bet_type: betType,
        placed_at: placedAt,
        stake,
        total_odds: totalOdds,
        status: slipStatus,
        notes: '',
        legs,
        raw_text: text,
      }
      status.value = `Parsed ${legs.length} leg(s)`
      return draft
    } finally {
      running.value = false
    }
  }

  return { parseSlip, status, running, lastRawText }
}
