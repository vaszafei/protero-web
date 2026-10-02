import { execFileSync } from 'node:child_process'

const PSQL = ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-Atc']

function q(sql: string): string {
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
    completedWithLineup: one('completed football fixture with a lineup',
      `select g.id from games g where sport='football' and status='completed' and exists(select 1 from lineups l where l.game_id=g.id) order by date desc limit 1`),
    completedNoLineup: one('completed football fixture without a lineup',
      `select g.id from games g where sport='football' and status='completed' and league_key='premier_league' and not exists(select 1 from lineups l where l.game_id=g.id) order by date desc limit 1`),
    completedBasketball: one('completed basketball fixture',
      `select id from games where sport='basketball' and status='completed' and league_key='euroleague' order by date desc limit 1`),
    team: one('team', `select id from teams where league_key='premier_league' order by id limit 1`),
    wallets: [26, 29, 40, 54, 55],
    footballLeague: 'premier_league',
    basketballLeague: 'euroleague',
    slate: q(`select id from fantasy_slates order by id desc limit 1`) || null,
  }
}
