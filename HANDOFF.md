# HANDOFF — frontend redesign, resuming after Phase 3

Written 2026-09-02, updated 2026-09-03. Read this before touching the frontend.

**2026-09-03 session:** Phase 2 finished (post-mortem + pre-match rails) and Phase 3
shipped (team trajectory). See `../docs/sessions/2026-09-03-frontend-redesign-phase-2-3.md`.
Four things below changed as a result — §0 fact 5 is resolved and a sixth added, §1.1 and
§1.2 are done, and §2 has four new entries.

- **The plan:** `/home/zafnitlab/.claude/plans/drifting-strolling-pancake.md`
- **What shipped and why:** `../docs/sessions/2026-09-02-frontend-redesign-phase-0-2.md`
- Frontend commits go to `protero-web`; the migration went to the `protero` repo.

---

## 0. Read these six facts first

They are not inferable from the code and each one already cost a debugging pass.

1. **`assets/css/tokens.css` is the palette.** It loads before `panels.css` in `nuxt.config.ts`.
   `tailwind.config.cjs` mirrors it. `utils/viz.ts` is the source for anything computed in JS.
   Before changing any categorical hex, run:
   ```
   node scripts/validate_palette.js "#4d8fff,#f8514f" --balanced
   ```
   `--balanced` is the check that matters and is new — the pair shipping before today passed every
   other check with ΔL 0.081, which is exactly why the Home-vs-Away bar read as an alert.

2. **The brand rule.** Red = away side / loss / failure / money lost. Blue = home and
   neutral-positive. Green = money-positive only, never a series colour. `MatchStatistics` and
   `StatBar` had home=red / away=blue, the exact inverse; both were swept. If you add a mark, pick
   its colour from this rule, not from what looks good in isolation.

3. **Auto-import naming.** `components/ui/Tooltip.vue` registers as `<UiTooltip>`, not `<Tooltip>`.
   Pages in this repo use **explicit imports** (`import UiTooltip from '~/components/ui/Tooltip.vue'`)
   and new code should keep doing that — it sidesteps the trap entirely.

4. **Screenshot harness gotcha.** `layouts/default.vue` scrolls inside `<main class="overflow-auto">`,
   so `document.body.scrollHeight` is often `0` and **`page.screenshot({ fullPage: true })` returns
   a blank image**. Use a tall viewport (1600×1500) and a normal viewport screenshot.
   Login: `POST /api/auth/login` with `admin@protero.com` / `admin123`, then set the returned
   `session_id` cookie on `localhost`.

5. ~~`composables/useApi.ts` is left MODIFIED and uncommitted.~~ **RESOLVED 2026-09-03.**
   Reverted, and the post-mortem rebuilt as `server/api/game/[id]/post-mortem.get.ts` +
   `components/game/PostMortem.vue`. It had to move server-side for two reasons the draft
   could not have known: `line_scores` is admin-RLS'd, and the probability source is routed
   per (league, market) by `masks.py`, so a client assuming Dixon-Coles mislabels every
   GBM-priced cell.

6. **`ml.line_scores.write_model` is NOT a pipeline step.** Football step 5.85 runs
   `ingest_close` / `write_book` / `write_close` / `grade` / `verify_source` — the MODEL side
   of the spine is a manual command. So `dc` rows stop at **2026-08-28** and `gbm` at
   **2026-06-20** while the price sources are current to yesterday, and **22 of the 64 settled
   V6 wagers have no model row at all**. Any UI that compares our number to the market's must
   handle its absence as the common case for recent fixtures, not the exception. This is an
   ML-side cadence gap, not a frontend one — worth raising with the owner.

---

## 1. Next, in order

### ~~1.1 Finish Phase 2 — the game page~~ — DONE 2026-09-03

**(a) Post-mortem — shipped.** Three panels, ordered by trustworthiness: the wager (money),
then line movement, then Brier. The middle one is the important design decision: it uses
`p_close − p_open` on the selection, both Shin-de-vigged — the project's own CLV definition
from `research/tipster/clv.py` — and **not** `taken price ÷ close`, which measures book choice
as much as timing. It is also the panel with real coverage, since `close_avg`/`open_avg` are
current while `dc` is six days stale (fact 6 above).

**(b) Pre-match rails — shipped**, for BOTH sports. `server/api/game/[id]/preview.get.ts` +
`components/game/TeamFormRail.vue`. Last-6 form with per-match tooltips, plus the twin's
attack/defence ±1 SD against the competition's own fitted range. Extended to basketball because
1,200 scheduled NBA fixtures carried the same blank rail; `twin_team` is football-only, so those
rails show form alone.

### ~~1.2 Phase 3 — team / twin page~~ — DONE 2026-09-03

Shipped as `components/team/TeamTrajectory.vue`.

**The description above was wrong and is kept only to explain the correction: there is no
per-season attack/defence anywhere.** `twin_team_season` and `twin_team_history` carry
goals/points per game and tier; the fitted ratings exist as ONE current value per club on
`twin_team`. What shipped is goals-for/against per game against the division, which makes the
tier confound visible — Ipswich 2.00/game in the Championship, 0.95 in the Premier League,
1.74 back in the Championship — and is captioned so the raw rates are never read as the
league-invariant ratings. `twin_league_transitions` is wired via a new
`useTwins().fetchTeamTransitions(teamId)`.

### 1.3 Phase 4 — dashboard

- Replace the `▶` / `↻` glyphs with `<UIcon>` + `.btn-ghost` / `.btn-brand` (the classes exist).
- Move `PipelineRunModal` into `UModal` — it is a hand-rolled overlay with no focus trap, no Esc,
  no scroll lock.
- **Swap the 2s poll for Supabase Realtime on `phase_runs`.** `supabase_realtime` currently
  publishes **zero tables**; this needs one migration adding it.
- Fill the dead right column under FLEET with a `line_scores` calibration strip (our Brier vs the
  close's, per league, 90d).
- Add `wallet_scorecards` (Sharpe / Sortino / max-DD / CLV — 1,380 rows, invisible today) to the
  fleet table.

### 1.4 Phase 5 — league / wallet / calendar / gates

League: the managers panel is a wall of tiny text; add `UiTooltip` to every W/D/L form chip in
`LeagueStandingsTable` (the owner asked for this explicitly). Calendar: stop truncating league
names (`Champi… 8`), collapse the empty bottom rows. Wallet is the strongest page in the app —
add the scorecard risk row and leave the rest alone.

### 1.5 Phase 6 — sweep

- `server/utils/pipeline.ts` hardcodes `/home/zafnitlab/…` and node `v22.22.0` → `runtimeConfig`.
- Split the four components over 500 lines (`LeagueOverview` 810, `AnalysisView` 741,
  `PlayerSeasonModal` 734, `admin/MatchCard` 671).
- **RLS:** `prop_parlays`, `scrape_log` and `sessions` have `rowsecurity` on with **zero policies**
  — the exact pattern that made every parlay view render empty in August. Needs a migration.
- Update `CLAUDE.md`: CD #6 was rescinded by the owner this session (see §3), and the Design System
  section still points at the deleted `utils/design-tokens.ts`.

---

## 2. Things that will bite you

- **`lineups.position` is garbage** — 216,961 rows read `Unknown`, plus `G`/`C` markers that are not
  positions. It is why the game page prints "Unknown" under every player. Use
  `twin_player.position` (MID/DEF/FWD/GK, properly classified).
- **Football per-appearance stats exist only for season 2026-2027** (16,803 of 39,637 rows have
  `minutes_played`). Every earlier season is goals/assists/cards only. Anything per-90 must gate on
  a minutes floor and say so — `PlayerHexagon` refuses to draw below it rather than plotting a
  confident shape from 40 minutes of football.
- **There are no shot coordinates in the basketball corpus.** `basketball_player_games` and
  `sport_stats.players[]` hold make/attempt counts only. The court is a three-zone diagram and is
  captioned as such. Do not scatter dots to make it look like a shot chart.
- **`sport_stats.quarters` is on ~8% of completed basketball fixtures** (1,942 of 23,703).
  `QuarterFlow` renders only when present.
- **PostgREST truncates at 1,000 rows silently.** Anything that may exceed it either pages with
  `.range()` or moves into an RPC — which is why the cohort percentiles are computed in Postgres.
- **`server/utils/football-masks.ts` is a hand-kept mirror of `ml/v6/masks.py`.** It gates a
  *label*, never money, but a drifted mirror renders a wrong "not bet". Same convention as
  `WALLET_MODEL_MAP` ↔ `wallet-meta.ts`. Re-check it after any mask change.
- **The `wallet reconcile (money)` gate was already RED before this work** (visible on `/gates`).
  Not caused by the redesign; know it before you attribute anything to yourself.

- **`twin_team.defence` is HIGHER-IS-BETTER.** It is log-rate suppression, not goals conceded:
  Arsenal 1.309 → 27 conceded, Tottenham 0.658 → 57. Both ratings point the same way, so a bar
  drawn for either reads the same direction. Getting this backwards renders a relegation
  candidate as an elite defence, and nothing would error.

- **There are no basketball twins.** `twin_team` is 3,692 rows, all `sport='football'`. Any
  twin-derived surface degrades to nothing for basketball rather than erroring — which is the
  behaviour `TeamFormRail` already relies on.

- **`npm run build` wipes `.nuxt/dist` under a running `npm run dev`** and the dev server
  restarts mid-flight; pages 404 their own assets and render white for ~30s. It looks exactly
  like the "TS cast in a non-TS SFC" module-graph failure documented in `CLAUDE.md` and is not
  it. Restart dev after a build rather than debugging the page.

- **A season axis is not evenly spaced in time.** A club can leave the corpus for years
  (Ipswich has nothing 2018-19 → 2023-24, League One is not ingested). An ordinal x-axis draws
  that as consecutive; `TeamTrajectory` breaks the line across the gap. Anything plotting
  seasons needs the same treatment.

---

## 3. Decision changed this session

**Frontend CD #6 ("No icons in new components — text labels only") was rescinded by the owner.**
The replacement rule, which the new code follows:

> `<UIcon>` (heroicons) for UI affordances. Inline `<svg>` is permitted **only** for data marks —
> radar, court, sparkline, donut, pitch. No emoji, and no Unicode glyph icons (`▶`, `↻`) ever.

`CLAUDE.md` still carries the old CD #6 text and needs updating.

---

## 4. New surface, at a glance

| File | What it owns |
|---|---|
| `assets/css/tokens.css` | The palette. One definition. |
| `scripts/validate_palette.js` | The six palette checks. Exits non-zero; can gate a commit. |
| `components/ui/Tooltip.vue` | The one tooltip. Teleported (parents have `overflow`), keyboard-reachable. |
| `components/ui/Radar.vue` | n-axis radar; hexagon at n=6. Takes **percentiles**, never raw values. |
| `components/ui/ProbBar.vue` | One market: de-vigged price vs our number on one axis. `enabled` decides whether the gap may be called an edge. |
| `components/ui/{Sparkline,SkeletonPanel,PageShell}.vue` | Series mark; shape-matched loader; 12-col page frame at 1760px. |
| `components/player/*` | Identity rail, hexagon, three-zone court, match log, season trend. |
| `components/game/BasketballTeamRail.vue` | Court + four factors, derived from the box score. |
| `components/game/{QuarterFlow,GameLeaders,MarketBoard}.vue` | Running margin; head-to-head leaders; the pre-match cockpit. |
| `server/api/game/[id]/market.get.ts` | `line_scores` + `predictions` + mask → the board. |
| `server/utils/football-masks.ts` | Mirror of `masks.py`. Labels only. |
| `server/api/player/[id]/season.get.ts` | Three RPC calls; no JSONB scanning, no `?league=` guess. |

Migration (in the `protero` repo):
`supabase-local/supabase/migrations/20260902100000_player_profile_rpc.sql` — `player_resolve`,
`player_profile_football`, `player_profile_basketball`. Applied by hand via psql, which is how
every migration in this project is applied (`supabase_migrations.schema_migrations` is empty).
