<template>
  <section v-if="rows.length" class="panel overflow-hidden">
    <header class="panel-head">
      <span class="panel-title">Leaders</span>
      <span class="panel-link">head to head</span>
    </header>

    <div class="gl">
      <div v-for="r in rows" :key="r.side" class="gl-row">
        <span class="gl-dot" :style="{ background: r.color }" />
        <div class="gl-who">
          <NuxtLink v-if="r.playerId" :to="`/player/${r.playerId}`" class="gl-name gl-link">{{ r.name }}</NuxtLink>
          <span v-else class="gl-name">{{ r.name }}</span>
          <span class="gl-team">{{ r.team }}</span>
        </div>
        <div class="gl-stats">
          <span v-for="s in r.stats" :key="s.k" class="gl-stat">
            <b :style="{ color: s.lead ? r.color : undefined }">{{ s.v }}</b>
            <i>{{ s.k }}</i>
          </span>
        </div>
      </div>
    </div>

    <p class="gl-note">
      The feed's own nominated leader per side. A bold figure is the higher of the two.
    </p>
  </section>
</template>

<script setup lang="ts">
/**
 * The two game leaders, side by side.
 *
 * Previously one of these rendered inside each team rail, which meant the same
 * panel header twice and no comparison between them — the interesting thing
 * about two leaders is which one out-produced the other.
 */
import { computed } from 'vue'
import { VIZ_BRAND_HOME, VIZ_BRAND_AWAY } from '~/utils/viz'

const props = defineProps<{
  sportStats: any
  homeName: string
  awayName: string
}>()

const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * `game_leaders` names the player but carries no id, so match the name back to
 * the box score to make the row navigable. A miss just renders plain text.
 */
function findId(side: 'home' | 'away', name: string): string | null {
  const players = props.sportStats?.[side]?.players
  if (!Array.isArray(players) || !name) return null
  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')
  const target = norm(name)
  const hit = players.find((p: any) => {
    const n = norm(p.name || p.player_name)
    // The feed abbreviates ("Brunson J." vs "Jalen Brunson"), so accept a
    // surname-level containment in either direction.
    return n === target || (n.length > 4 && target.includes(n)) || (target.length > 4 && n.includes(target))
  })
  return hit?.player_id ? String(hit.player_id) : (hit?.id != null ? String(hit.id) : null)
}

const rows = computed(() => {
  const gl = props.sportStats?.game_leaders
  if (!gl) return []
  const sides: Array<{ side: 'home' | 'away'; team: string; color: string }> = [
    { side: 'home', team: props.homeName, color: VIZ_BRAND_HOME },
    { side: 'away', team: props.awayName, color: VIZ_BRAND_AWAY },
  ]

  const present = sides.filter((s) => gl[s.side]?.name)
  if (!present.length) return []

  const best = (k: string) => Math.max(...present.map((s) => num(gl[s.side]?.[k])))

  return present.map((s) => {
    const l = gl[s.side]
    return {
      ...s,
      name: l.name,
      playerId: findId(s.side, l.name),
      stats: [
        { k: 'pts', v: num(l.points), lead: present.length > 1 && num(l.points) === best('points') },
        { k: 'reb', v: num(l.rebounds), lead: present.length > 1 && num(l.rebounds) === best('rebounds') },
        { k: 'ast', v: num(l.assists), lead: present.length > 1 && num(l.assists) === best('assists') },
      ],
    }
  })
})
</script>

<style scoped>
.gl { padding: 0.5rem 0.7rem 0.2rem; }

.gl-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-top: 1px solid var(--edge-soft);
}
.gl-row:first-child { border-top: none; }

.gl-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}

.gl-who { min-width: 0; flex: 1; }
.gl-name {
  display: block;
  font-size: 0.72rem; font-weight: 700; color: var(--ink-strong);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gl-link { transition: color var(--dur-fast) ease; }
.gl-link:hover { color: var(--brand-blue-hi); }
.gl-team {
  display: block;
  font-size: 0.57rem; color: var(--ink-faint);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.gl-stats { display: flex; gap: 0.6rem; flex-shrink: 0; }
.gl-stat { text-align: right; }
.gl-stat b {
  display: block;
  font-size: 0.82rem; font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums; line-height: 1.1;
}
.gl-stat i {
  display: block;
  font-style: normal;
  font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--ink-faint);
}

.gl-note {
  padding: 0.4rem 0.7rem 0.6rem;
  font-size: 0.57rem; line-height: 1.5; color: var(--ink-faint);
}
</style>
