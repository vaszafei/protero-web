import { getSupabase } from '~/server/utils/supabase'

/**
 * Shot locations for one basketball fixture, projected into a single
 * court-independent space so the renderer never has to know which league it is
 * drawing.
 *
 * The projection is the whole point of this endpoint. `basketball_shots` stores
 * coordinates exactly as the source gives them, and the two sources do not
 * agree on units, so a renderer that shared one transform would place every
 * EuroLeague shot off the court:
 *
 *   nba_tenth_ft    tenths of a foot, x ∈ [-250, 250], hoop at (0, 0)
 *   euroleague_cm   centimetres,      x ∈ [-740, 740], hoop at (0, 0)
 *
 * Both are hoop-origin and half-court, so the mapping is a scale, not a fit.
 * We emit `nx`/`ny` in [0,1] over a half-court box that is the same *physical*
 * size in both leagues (FIBA 15m × 14m vs NBA 50ft × 47ft are within a few
 * percent), which is what makes the two charts visually comparable.
 *
 * FREE THROWS ARE EXCLUDED, for two independent reasons:
 *   1. EuroLeague reports them at the sentinel location (-1,-1) — there is no
 *      location to plot. NBA's `FGA` context does not return them at all, so
 *      including them would also make the leagues count different events.
 *   2. Reconciled against the boxscore on 5 games, EuroLeague FT rows equal
 *      free throws MADE, never attempted (19 rows vs FTM 19 / FTA 28). A missed
 *      free throw is absent from the feed, so any percentage computed over them
 *      would read 100%. Field goals reconcile exactly (2P/3P rows == attempts),
 *      which is why those are safe to aggregate and free throws are not.
 *
 * This is display data. No money path reads `basketball_shots`, so CD #1's
 * holdout requirement does not apply — but the zone splits below are still
 * descriptive counts of what happened, never a projection of what will.
 */

/**
 * Half-court extents per coordinate system, in the source's own units.
 *
 * `x` is the sideline-to-sideline half-width and `y` the distance from the
 * baseline-ish hoop origin to the half-way line. These are the real court
 * dimensions, not the observed min/max of the data — clamping to observed
 * extremes would rescale the chart every time a game contained a half-court
 * heave, and the same shot would land in a different place on two fixtures.
 */
const COURT: Record<
  string,
  { halfWidth: number; baseline: number; length: number; arcR: number }
> = {
  /**
   * `baseline` is how far BEHIND the origin the baseline sits, and it is not a
   * guess: both feeds put the origin exactly on the hoop, which is why a shot
   * can carry a negative `loc_y` (from behind the backboard) at all. `arcR` was
   * measured rather than looked up — classifying every stored shot by its
   * distance from the origin and comparing with the feed's own 2P/3P label,
   * 660 misclassifies 0.12% of 53,569 EuroLeague shots (675 and 690, the
   * nominal FIBA numbers, misclassify 0.72% and 4.34%), and 220 misclassifies
   * 0% of the NBA sample. Those are the radii the DATA uses, so drawing the arc
   * anywhere else would put three-pointers inside the two-point line.
   */
  // NBA: 50ft wide → ±250 tenths; hoop 5.25ft in from the baseline; 47ft half.
  nba_tenth_ft: { halfWidth: 250, baseline: 52, length: 470, arcR: 220 },
  // FIBA: 15m wide → ±750cm; hoop 1.575m in from the baseline; 14m half.
  euroleague_cm: { halfWidth: 750, baseline: 158, length: 1400, arcR: 660 },
}

/** Shot distance in metres, so the two leagues can share one bucket ladder. */
const TO_METRES: Record<string, number> = {
  nba_tenth_ft: 0.03048, // a tenth of a foot
  euroleague_cm: 0.01,   // a centimetre
}

type ShotRow = {
  loc_x: number
  loc_y: number
  made: boolean
  shot_type: string
  coord_system: string
  player_name: string
  team_id: number | null
  team_name: string | null
  period: number | null
  clock_seconds: number | null
  action_type: string | null
}

export default defineEventHandler(async (event) => {
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid game id' })
  }

  const supabase = getSupabase()

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('id, league_key, sport, status, home_team_id, away_team_id, home_goals, away_goals')
    .eq('id', gameId)
    .maybeSingle()

  if (gameErr) throw createError({ statusCode: 500, statusMessage: gameErr.message })
  if (!game) throw createError({ statusCode: 404, statusMessage: 'Game not found' })

  // Field goals only — see the free-throw note above.
  const { data, error } = await supabase
    .from('basketball_shots')
    .select(
      'loc_x, loc_y, made, shot_type, coord_system, player_name, team_id, team_name, period, clock_seconds, action_type',
    )
    .eq('game_id', gameId)
    .in('shot_type', ['2P', '3P'])
    .order('period', { ascending: true })
    .order('clock_seconds', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as ShotRow[]

  /**
   * Absence is reported, not implied. A basketball fixture with no rows is a
   * coverage gap (only EuroLeague 2025-2026 is backfilled, and two FlashScore-
   * sourced games carry no `external_id` so the fetcher cannot see them at
   * all); a football fixture simply has no such thing as a shot chart. Those
   * are different statements and the page should be able to tell them apart.
   */
  if (!rows.length) {
    return {
      game_id: gameId,
      league_key: game.league_key,
      available: false,
      reason:
        game.sport !== 'basketball'
          ? 'Shot locations are a basketball feed; this fixture is not basketball.'
          : 'No shot locations stored for this fixture. Only EuroLeague 2025-2026 has been backfilled.',
      shots: [],
      teams: [],
      totals: null,
    }
  }

  const system = rows[0].coord_system
  const court = COURT[system]
  const metres = TO_METRES[system]
  if (!court || !metres) {
    // Fail loud rather than plotting an unknown system against a guessed court.
    throw createError({
      statusCode: 500,
      statusMessage: `Unmapped coordinate system '${system}' — add it to COURT before rendering.`,
    })
  }

  const shots = rows.map((r) => {
    // nx: 0 = left sideline, 1 = right sideline. ny: 0 = baseline, 1 = half-way.
    const nx = (r.loc_x + court.halfWidth) / (2 * court.halfWidth)
    // Measured from the BASELINE so both leagues share one court: the feeds'
    // own origin is the hoop, which sits a different distance in on each.
    const ny = (r.loc_y + court.baseline) / court.length
    const distance_m = Math.hypot(r.loc_x, r.loc_y) * metres
    return {
      nx: Math.min(1, Math.max(0, nx)),
      ny: Math.min(1, Math.max(0, ny)),
      made: r.made,
      shot_type: r.shot_type,
      player_name: r.player_name,
      team_id: r.team_id,
      team_name: r.team_name,
      period: r.period,
      distance_m: Math.round(distance_m * 10) / 10,
      // The source's own label ("Layup", "Dunk", …) — kept for the tooltip only.
      action_type: r.action_type,
      side: r.team_id != null && r.team_id === game.home_team_id ? 'home' : 'away',
    }
  })

  /** Made / attempted / points, for any subset of the projected shots. */
  const tally = (subset: typeof shots) => {
    const att = subset.length
    const made = subset.filter((s) => s.made).length
    const pts = subset.reduce((n, s) => n + (s.made ? (s.shot_type === '3P' ? 3 : 2) : 0), 0)
    return { attempted: att, made, points: pts, pct: att ? Math.round((made / att) * 1000) / 10 : null }
  }

  const byType = (subset: typeof shots) => ({
    all: tally(subset),
    two: tally(subset.filter((s) => s.shot_type === '2P')),
    three: tally(subset.filter((s) => s.shot_type === '3P')),
  })

  // Team identity comes from the rows themselves; a team with no located shot
  // should not appear as an empty rail entry.
  const teams = (['home', 'away'] as const)
    .map((side) => {
      const subset = shots.filter((s) => s.side === side)
      if (!subset.length) return null
      return {
        side,
        team_id: subset[0].team_id,
        team_name: subset[0].team_name,
        ...byType(subset),
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  return {
    game_id: gameId,
    league_key: game.league_key,
    coord_system: system,
    /**
     * The court, in the SAME normalised space as the shots, so the markings and
     * the dots cannot drift apart — the first cut drew a nominal court here and
     * a measured one there, and three-pointers rendered inside the arc.
     */
    court: {
      // Hoop centre.
      hoop_x: 0.5,
      hoop_y: court.baseline / court.length,
      // Three-point arc radius, as a fraction of the court's half-width.
      arc_r_x: court.arcR / (2 * court.halfWidth),
      arc_r_y: court.arcR / court.length,
      // How far up the court the shots actually reach, so the view can crop to
      // the half that holds data instead of rendering an empty band.
      max_y: Math.max(...shots.map((s) => s.ny)),
    },
    available: true,
    reason: null,
    shots,
    teams,
    totals: byType(shots),
    /**
     * Field goals only. Stated in the payload so a consumer that sums `points`
     * does not mistake the difference from the final score for a defect — it is
     * exactly the free-throw remainder, which is how this table was verified.
     */
    excludes: 'free throws',
  }
})
