# NEXT SESSION — frontend redesign, Phases 4–6

Written 2026-09-03, at the end of the Phases 2–3 session. **Yes, there is more of the plan
left**: Phases 4, 5 and 6. This file is the working brief for them.

Read in this order:
1. `HANDOFF.md` §0 — the six facts. They are still current; fact 6 (`write_model` is not a
   pipeline step) was added this session.
2. `../docs/sessions/2026-09-03-frontend-redesign-phase-2-3.md` — what shipped and why.
3. This file.

**Everything below was re-verified against the live database and the working tree on
2026-09-03.** The previous handoff had two claims that did not survive contact — the
post-mortem's data was six days stale, and the "per-season attack/defence" it asked for does
not exist in any table — so every number here carries how it was checked. Check them again
anyway if a session goes by; that is the lesson, not a formality.

---

## 0. One correction to carry in before you start

**§1.5's RLS item is wrong as written, and acting on it would be a security regression.**

The handoff says `prop_parlays`, `scrape_log` and `sessions` have `rowsecurity` on with zero
policies — "the exact pattern that made every parlay view render empty in August" — and need a
migration. The first half is true:

```
 tbl          | rls | policies
 prop_parlays | t   |        0
 scrape_log   | t   |        0
 sessions     | t   |        0
```

The conclusion is not. In August that pattern was a bug because the **client** read `parlays`
and `parlay_legs` and got `[]`. Nothing client-side reads these three:

```bash
grep -rn "from('prop_parlays')\|from('scrape_log')\|from('sessions')" composables/ components/ pages/
# → no matches. All reads are server-side (service role, which bypasses RLS).
```

`sessions` is read only by `server/utils/auth.ts` and the five `server/api/auth/*` routes. RLS
with no policy is therefore **deny-all to the browser**, which for a table of session tokens is
the correct posture, not a defect. Adding a permissive policy would expose live sessions to any
authenticated client.

**Do this instead:** leave all three alone and add a comment to each in a migration saying the
denial is deliberate, so the next audit does not re-raise it. If a props view is ever built that
needs `prop_parlays` in the browser, write the policy then, scoped to that need.

---

## 1. Phase 4 — dashboard

The page is `pages/index.vue` (~105L) + `components/dashboard/`. Four items, in the order I would
do them.

### 4.1 Kill the two Unicode glyphs *(15 min, do it first)*

```
pages/index.vue:21                       <span class="refresh-icon">↻</span>
pages/index.vue:27                       <span class="run-icon">▶</span>
components/dashboard/PipelineRunModal.vue:38  <span class="refresh-icon">▶</span>
```

Frontend CD #6 was rescinded this cycle (`HANDOFF.md` §3): `<UIcon>` for affordances, inline
`<svg>` only for data marks, **no Unicode glyph icons ever**. `.btn-ghost` / `.btn-brand` already
exist in `assets/css/panels.css`. These three are the last of them — the previous session found
`run-btn` was the only saturated fill in the app, which is why the dashboard read as imported
from another product.

### 4.2 `PipelineRunModal` → `UModal`

`components/dashboard/PipelineRunModal.vue` is a hand-rolled overlay: no focus trap, no Esc, no
scroll lock. `UModal` is already used in `components/league/MatchEditorModal.vue`,
`components/league/TwinVsClose.vue` and `pages/my-real-bets.vue` — copy one of those, do not
invent a pattern.

### 4.3 Replace the poll with Realtime *(the one that needs a migration)*

`PipelineRunModal.vue:182` runs a `setInterval` against `phase_runs` while the modal is open.
Verified today:

```sql
SELECT pubname, puballtables FROM pg_publication;            -- supabase_realtime | f
SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime';  -- 0 rows
```

**`supabase_realtime` publishes zero tables**, so no Realtime anywhere in the app works today.
The migration is one line:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.phase_runs;
```

`supabase-local/supabase/migrations/<timestamp>_realtime_phase_runs.sql`, applied by hand via
psql like every other migration here (`supabase_migrations.schema_migrations` is empty — root
CD #18 / frontend CD #7). Keep the poll as the fallback path rather than deleting it: a
subscription that silently fails to connect must not leave the modal frozen.

### 4.4 The two dead data sets

- **`wallet_scorecards` — 1,452 rows across 24 wallets, rendered nowhere.** Verified:
  `grep -rl wallet_scorecards components/ pages/ server/ composables/` → no matches. It carries
  Sharpe / Sortino / Calmar / max-DD / CLV. Add a risk row to the fleet table.
  **Read `utils/wallet-stats.ts` first** — it owns the cohort split AND the multiplicity
  correction, and a scorecard number rendered outside it will disagree with `/wallet`.
  Mirrored tipsters (W33–W47) are a separate cohort and must not pool into fleet totals.
- **The dead right column under FLEET** wants a `line_scores` calibration strip — our Brier vs
  the close's, per league, 90d. **Before building it, re-read `HANDOFF.md` fact 6:** the model
  side of the spine stops at 2026-08-28 (`dc`) and 2026-06-20 (`gbm`) while the prices are
  current, so a 90-day window ending today is mostly price-only rows. Either run
  `python3 -m ml.line_scores.write_model --apply` first, or window the strip on what exists and
  label the range. Do not render an empty strip and call it "no data".

---

## 2. Phase 5 — league / calendar / wallet

- **League standings form chips need tooltips.** `components/league/LeagueStandingsTable.vue:131`
  renders `team.form` as bare spans — no `UiTooltip`, verified. The owner asked for this
  explicitly. `components/game/TeamFormRail.vue` (new this session) is the pattern to copy: it
  wraps each `.chip-wdl` in `UiTooltip` with opponent, score, competition and date.
- **The managers panel is a wall of tiny text** (`LeagueOverview.vue`).
- **Calendar truncation.** `components/dashboard/GamesCalendar.vue:94` does
  `day.leagueCounts.slice(0, 4)` and `:112` truncates the name, producing `Champi… 8`. Also
  collapse the empty bottom rows.
- **Wallet is the strongest page in the app.** Add the scorecard risk row (4.4) and leave the
  rest alone.

---

## 3. Phase 6 — sweep

- **`server/utils/pipeline.ts` hardcodes the machine.** Verified:
  ```
  :22  const REPO    = '/home/zafnitlab/Desktop/Projects/protero'
  :24  const NVM_BIN = '/home/zafnitlab/.nvm/versions/node/v22.22.0/bin'
  ```
  Move both to `runtimeConfig`. The node path pins a patch version and will break on the next
  `nvm install`.
- **Four components over 500 lines**, verified today: `LeagueOverview.vue` 810,
  `AnalysisView.vue` 741, `PlayerSeasonModal.vue` 734, `admin/MatchCard.vue` 671. The splitting
  rule and two worked examples are in `CLAUDE.md` § Component splitting rule.
- **RLS:** see §0. Do not add policies; document the denial.
- **`CLAUDE.md` is stale in two places.** `utils/design-tokens.ts` **is deleted** (verified —
  `utils/` holds bet-label, cache, constants, dateTime, formatters, motion, season, teamLogo,
  viz, wallet-meta, wallet-stats) but is still named at `CLAUDE.md:79` and `:279`. The Design
  System section must point at `assets/css/tokens.css` + `utils/viz.ts` +
  `scripts/validate_palette.js`. And **CD #6 still carries the rescinded "no icons" text** —
  replace it with the rule in `HANDOFF.md` §3.

---

## 4. Adjacent, and NOT part of this plan

The owner raised **activating the wallets that have no picker** — W27 *The Banker* and W30 *The
Sniper* are live roster rows with `is_active` set and nothing writing to them (root CD #35), the
way W26 *Football Value* is fed by `predict_v6` → `post_v6_to_supabase` at football step 6.

That is an **ML/strategy** task, not a frontend one, and it is gated by things this plan does not
touch:

- **CD #3** — a new (league, market) cell needs holdout ROI *and* a market ceiling > +0.02, and
  `docs/plans/do-not-do.md` §1 forbids *adding* cells on the ceiling alone.
- **CD #1** — holdout before any claim; `k` for multiplicity comes from
  `common.sim_register`, not from what you chose to keep.
- The standing finding that our probability sources are **redundant to the price**
  (b=+0.000, t=0.00 against the open, n=34,010) — a new picker that prices off DC or the GBM is
  starting from a measured null.

If the owner wants that next, it is its own session with `protero-ml/CLAUDE.md` open, and it
should begin by reading `docs/plans/README.md` (the register) to see what a new wallet would even
be allowed to bet. **Do not open it as a side quest inside a frontend phase.**

---

## 5. Working notes

- `npm run build` **wipes `.nuxt/dist` under a running `npm run dev`**; the dev server restarts
  and pages 404 their own assets for ~30s. It looks exactly like the TS-cast module-graph failure
  in `CLAUDE.md` and is not it. Restart dev after a build.
- Screenshot harness: `HANDOFF.md` §0 fact 4 (tall viewport, no `fullPage`, `session_id` cookie
  comes from the login response's `set-cookie` header — the JSON body has `access_token`, which
  is not it).
- Before touching a categorical hex: `node scripts/validate_palette.js "<a>,<b>" --balanced`.
- `protero-ml/ml/twins/twins_football.json` has been modified and uncommitted since before the
  2026-09-02 session. It is pipeline state from step 5.8, not anyone's edit. Leave it or ask.
