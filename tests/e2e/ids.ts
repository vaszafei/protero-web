import { execFileSync } from 'node:child_process'

const PSQL = ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-Atc']

export function q(sql: string): string {
  return execFileSync('psql', [...PSQL, sql], {
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'postgres' },
    encoding: 'utf8',
  }).trim()
}

function one(label: string, sql: string): string {
  const v = q(sql)
  if (!v) throw new Error(`e2e id discovery found no ${label} — the local DB is missing the fixture class the suite needs`)
  return v
}

/** Route ids come from the DB at setup, so the suite does not rot as fixtures age out. */
export function discover() {
  return {
    scheduledFootball: one('scheduled football fixture with odds',
      `select id from games where sport='football' and status='scheduled' and date>now() and odds_home is not null order by date limit 1`),
    scheduledFootballWithXi: one('scheduled football fixture whose clubs both have a prior XI this season',
      `select g.id from games g where g.sport='football' and g.status='scheduled' and g.date>now()
         and exists(select 1 from lineups l join games p on p.id=l.game_id where l.team_id=g.home_team_id and l.is_starting_xi and p.status='completed' and p.season=g.season and p.date<g.date)
         and exists(select 1 from lineups l join games p on p.id=l.game_id where l.team_id=g.away_team_id and l.is_starting_xi and p.status='completed' and p.season=g.season and p.date<g.date)
         and not exists(select 1 from lineups l where l.game_id=g.id)
       order by g.date limit 1`),
    completedKeeperIsCaptain: one('completed football fixture where one XI has a flagged keeper and the other only a captain (C)',
      `with x as (
         select l.game_id, l.team_id,
                count(*) filter (where l.position in ('G','GK','Goalkeeper')) gk, count(*) filter (where l.position='C') c
         from lineups l where l.is_starting_xi group by 1,2 having count(*)=11)
       select g.id from games g join x on x.game_id=g.id where g.sport='football' and g.status='completed'
       group by g.id having count(*)=2 and count(*) filter (where x.gk=1)=1 and count(*) filter (where x.gk=0 and x.c=1)=1
       order by max(g.date) desc limit 1`),
    completedWithLineup: one('completed football fixture with a lineup',
      `select g.id from games g where sport='football' and status='completed' and exists(select 1 from lineups l where l.game_id=g.id) order by date desc limit 1`),
    completedNoLineup: one('completed football fixture without a lineup',
      `select g.id from games g where sport='football' and status='completed' and league_key='premier_league' and not exists(select 1 from lineups l where l.game_id=g.id) order by date desc limit 1`),
    scheduledBasketball: one('scheduled basketball fixture',
      `select id from games where sport='basketball' and status='scheduled' and date>now() and league_key in ('euroleague','nba') order by date limit 1`),
    completedBasketball: one('completed basketball fixture',
      `select id from games where sport='basketball' and status='completed' and league_key='euroleague' order by date desc limit 1`),
    team: one('team', `select id from teams where league_key='premier_league' order by id limit 1`),
    wallets: [26, 29, 40, 54, 55],
    footballLeague: 'premier_league',
    basketballLeague: 'euroleague',
    slate: q(`select id from fantasy_slates order by id desc limit 1`) || null,
  }
}

/** A mirrored wallet (external tipster) to open the Mirrored tab on. */
export function mirrorWalletId(): number {
  return Number(one('mirror wallet', `select id from wallets where archetype='external_tipster' order by id limit 1`))
}

/** `get_wallet_performance(id).pnl` — the one sanctioned P&L figure. */
export function rpcPnl(walletId: number): number {
  return Number(one(`pnl for wallet ${walletId}`, `select pnl from get_wallet_performance(${walletId})`))
}

/** Up to `n` football rounds of a league that hold at least 5 fixtures, with a season. */
export function roundWithFixtures(leagueKey: string): { season: string, round: number } {
  const row = one('round with fixtures', `select season||'|'||round from games where league_key='${leagueKey}' and round is not null group by season, round having count(*) >= 8 order by season desc, round desc limit 1`)
  const [season, round] = row.split('|')
  return { season, round: Number(round) }
}

/**
 * The newest completed game of each basketball league whose box score has player rows that score
 * (a game whose rows are all empty has nothing to compare).
 */
export function completedBasketballPerLeague(): { league: string, id: string }[] {
  const rows = q(`
    select distinct on (league_key) league_key||'|'||id from games g
    where sport='basketball' and status='completed'
      and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(sport_stats->'home'->'players')='array' then sport_stats->'home'->'players' else '[]'::jsonb end) p
                  where coalesce((p->>'points')::numeric, (p->>'pts')::numeric, 0) > 0)
    order by league_key, date desc`)
  return rows.split('\n').filter(Boolean).map(r => { const [league, id] = r.split('|'); return { league, id } })
}
