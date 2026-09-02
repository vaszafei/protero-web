<template>
  <div class="panel panel-accent id-card">
    <div class="id-top">
      <div class="id-crest">
        <img
          v-if="crest"
          :src="crest"
          :alt="player.team_name || ''"
          class="id-crest-img"
          @error="crestFailed = true"
        />
        <span v-else class="id-crest-fallback">{{ initials }}</span>
      </div>
      <div class="id-who">
        <h1 class="id-name">{{ player.name || player.short_name || '—' }}</h1>
        <div class="id-meta">
          <NuxtLink v-if="player.team_id" :to="`/team/${player.team_id}`" class="id-team">
            {{ player.team_name || 'Unknown club' }}
          </NuxtLink>
          <span v-else class="id-team id-team-dim">No current club</span>
          <span v-if="positionLabel" class="pill pill-blue">{{ positionLabel }}</span>
          <span class="pill pill-dim">{{ sport === 'basketball' ? 'Basketball' : 'Football' }}</span>
        </div>
      </div>
    </div>

    <!-- The fitted latent. Football has one ability; basketball has three
         rates, so the headline differs by sport. -->
    <div v-if="headline" class="id-headline">
      <div class="id-h-label">{{ headline.label }}</div>
      <div class="id-h-value">
        {{ headline.value }}
        <span v-if="headline.sd" class="id-h-sd">± {{ headline.sd }}</span>
      </div>
      <p class="id-h-note">{{ headline.note }}</p>
    </div>

    <dl class="id-facts">
      <div v-for="f in facts" :key="f.k" class="id-fact">
        <dt>{{ f.k }}</dt>
        <dd>{{ f.v }}</dd>
      </div>
    </dl>

    <!-- Career clubs, most appearances first. `teams_played` is the twin's own
         count across every club the entity has played for, which is the whole
         point of a twin: it survives the transfer. -->
    <div v-if="clubs.length" class="id-clubs">
      <div class="id-sec">Career clubs</div>
      <div v-for="c in clubs" :key="c.id" class="id-club">
        <NuxtLink :to="`/team/${c.id}`" class="id-club-name">{{ c.name }}</NuxtLink>
        <span class="id-club-bar">
          <span class="id-club-fill grow-x" :style="{ width: `${c.share}%` }" />
        </span>
        <span class="id-club-n">{{ c.apps }}</span>
      </div>
    </div>

    <div v-if="leagues.length" class="id-clubs">
      <div class="id-sec">Divisions</div>
      <div class="id-leagues">
        <span v-for="l in leagues" :key="l.key" class="pill pill-dim">
          {{ l.key.replace(/_/g, ' ') }} <span class="id-lg-n">{{ l.n }}</span>
        </span>
      </div>
    </div>

    <p v-if="player.state_as_of" class="id-foot">
      Twin state fitted {{ player.state_as_of }} — a nightly rebuild, not a live number.
      Nothing here is a price.
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * The identity rail: who this player is, per the entity layer.
 *
 * Everything here is twin state (`twin_player` / `twin_basketball_player`) plus
 * the club names it points at. It carries a standing warning because twins are
 * NOT a pricing input anywhere in this project (owner decision 2026-08-21) —
 * they are context and a warning surface.
 */
import { computed, ref } from 'vue'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const props = defineProps<{
  player: any
  sport: 'football' | 'basketball'
  totals?: any
  teamNames?: Record<string, string>
}>()

const crestFailed = ref(false)

const crest = computed(() => {
  if (crestFailed.value) return null
  return getTeamLogoUrl(props.player?.team_key) || null
})

const initials = computed(() => teamAbbreviation(props.player?.team_name) || '—')

const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward',
  G: 'Guard', F: 'Forward', C: 'Center',
}
const positionLabel = computed(() => {
  const p = props.player?.position
  if (!p || p === 'Unknown') return null
  return POSITION_LABELS[p] || p
})

const n1 = (v: any, dp = 2) => (v == null ? null : Number(v).toFixed(dp))

const headline = computed(() => {
  const p = props.player
  if (!p) return null
  if (props.sport === 'football') {
    if (p.ability == null) return null
    return {
      label: 'Fitted ability',
      value: n1(p.ability, 2),
      sd: n1(p.ability_sd, 2),
      note: `Shrunk toward the position cohort. Backed by ${
        p.effective_games != null ? Number(p.effective_games).toFixed(0) : '—'
      } time-weighted rated appearances.`,
    }
  }
  if (p.points_rate == null) return null
  return {
    label: 'Fitted points / 36',
    value: n1(p.points_rate, 1),
    sd: n1(p.points_sd, 1),
    note: `Shrunk toward the position cohort. Backed by ${
      p.effective_games != null ? Number(p.effective_games).toFixed(0) : '—'
    } time-weighted games.`,
  }
})

const facts = computed(() => {
  const p = props.player || {}
  const t = props.totals || {}
  const out: { k: string; v: string }[] = []
  const add = (k: string, v: any) => { if (v != null && v !== '') out.push({ k, v: String(v) }) }

  if (props.sport === 'football') {
    add('Career apps', p.appearances)
    add('Starts', p.starts)
    add('Rated', p.rated_games)
    if (t.minutes != null) add('Season mins', Math.round(Number(t.minutes)))
  } else {
    add('Career games', p.games)
    if (p.minutes != null) add('Recent mins', Number(p.minutes).toFixed(1))
    if (t.games != null) add('Season games', t.games)
    if (t.minutes != null) add('Season mins', Math.round(Number(t.minutes)))
  }
  if (p.first_seen && p.last_seen) {
    add('Span', `${String(p.first_seen).slice(0, 4)}–${String(p.last_seen).slice(0, 4)}`)
  }
  return out
})

const clubs = computed(() => {
  const tp = props.player?.teams_played || {}
  const entries = Object.entries(tp).map(([id, apps]) => ({ id, apps: Number(apps) }))
  if (!entries.length) return []
  const max = Math.max(...entries.map((e) => e.apps))
  return entries
    .sort((a, b) => b.apps - a.apps)
    .slice(0, 6)
    .map((e) => ({
      ...e,
      name: props.teamNames?.[e.id] || `Club #${e.id}`,
      share: max ? (e.apps / max) * 100 : 0,
    }))
})

const leagues = computed(() => {
  const lp = props.player?.leagues_played || {}
  return Object.entries(lp)
    .map(([key, n]) => ({ key, n: Number(n) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
})
</script>

<style scoped>
.id-card { padding: 0.9rem; }

.id-top { display: flex; gap: 0.7rem; align-items: center; }

.id-crest {
  width: 46px; height: 46px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--r);
  background: var(--neutral-tint);
  border: 1px solid var(--edge);
}
.id-crest-img { width: 34px; height: 34px; object-fit: contain; }
.id-crest-fallback {
  font-size: 0.72rem; font-weight: 800; color: var(--ink-mute);
}

.id-who { min-width: 0; }
.id-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.15;
  letter-spacing: -0.01em;
}
.id-meta {
  display: flex; align-items: center; gap: 0.35rem;
  margin-top: 0.25rem; flex-wrap: wrap;
}
.id-team {
  font-size: 0.7rem; color: var(--brand-blue);
  transition: color var(--dur-fast) ease;
}
.id-team:hover { color: var(--brand-blue-hi); }
.id-team-dim { color: var(--ink-faint); }

.id-headline {
  margin-top: 0.8rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--r);
  background: var(--brand-blue-tint);
  border: 1px solid var(--brand-blue-edge);
}
.id-h-label {
  font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--ink-mute); font-weight: 700;
}
.id-h-value {
  font-size: 1.5rem; font-weight: 700; color: var(--ink-strong);
  font-variant-numeric: tabular-nums; line-height: 1.15;
}
.id-h-sd {
  font-size: 0.72rem; font-weight: 600; color: var(--ink-mute); margin-left: 0.2rem;
}
.id-h-note {
  margin-top: 0.2rem; font-size: 0.58rem; line-height: 1.5; color: var(--ink-faint);
}

.id-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.8rem;
}
.id-fact {
  padding: 0.4rem 0.45rem;
  border-radius: var(--r-sm);
  background: var(--neutral-tint);
}
.id-fact dt {
  font-size: 0.53rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--ink-faint); font-weight: 600;
}
.id-fact dd {
  font-size: 0.85rem; font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums; margin-top: 0.05rem;
}

.id-sec {
  font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--ink-faint); font-weight: 700; margin-bottom: 0.35rem;
}
.id-clubs { margin-top: 0.85rem; }

.id-club {
  display: grid;
  grid-template-columns: 1fr 3rem 1.6rem;
  align-items: center;
  gap: 0.4rem;
  padding: 0.16rem 0;
}
.id-club-name {
  font-size: 0.66rem; color: var(--ink-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color var(--dur-fast) ease;
}
.id-club-name:hover { color: var(--brand-blue-hi); }
.id-club-bar {
  height: 4px; border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.05); overflow: hidden;
}
.id-club-fill {
  display: block; height: 100%; border-radius: var(--r-pill);
  background: var(--brand-blue);
}
.id-club-n {
  font-size: 0.6rem; color: var(--ink-mute);
  font-variant-numeric: tabular-nums; text-align: right;
}

.id-leagues { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.id-lg-n { opacity: 0.6; margin-left: 0.15rem; }

.id-foot {
  margin-top: 0.85rem;
  font-size: 0.56rem; line-height: 1.5; color: var(--ink-faint);
}
</style>
