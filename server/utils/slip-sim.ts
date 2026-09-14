import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const VENV_PY = `${REPO}/.venv/bin/python3`
const ML_DIR = `${REPO}/protero-ml`

const TIMEOUT_MS = 10_000

export interface SlipSimJoint {
  legs: [string, string]
  joint_p: number | null
}

export interface SlipSimResult {
  n: number
  coupling: string
  marginals: Record<string, number | null>
  joints: SlipSimJoint[]
}

/**
 * Calls `ml.slips.slip_sim --game <id> --json` (Track C correlations block) —
 * a synchronous Monte-Carlo joint sim, ~0.3-2s per fixture, no caching (per
 * the 2026-09-14 scoping decision: cheap enough to compute live, and a cached
 * table would blur the C2 line between descriptive context and a price).
 */
export async function fetchGameCorrelations(gameId: number): Promise<SlipSimResult | null> {
  try {
    const { stdout } = await execFileAsync(
      VENV_PY,
      ['-m', 'ml.slips.slip_sim', '--game', String(gameId), '--json'],
      { cwd: ML_DIR, timeout: TIMEOUT_MS },
    )
    const parsed = JSON.parse(stdout)
    if (parsed?.error) return null
    return parsed as SlipSimResult
  } catch {
    return null
  }
}
