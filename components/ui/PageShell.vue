<template>
  <div class="shell">
    <header v-if="title || $slots.actions || $slots.header" class="shell-head">
      <div v-if="$slots.header"><slot name="header" /></div>
      <template v-else>
        <div class="shell-titles">
          <slot name="eyebrow" />
          <h1 class="shell-title">{{ title }}</h1>
          <p v-if="subtitle" class="shell-sub">{{ subtitle }}</p>
          <slot name="subtitle" />
        </div>
        <div v-if="$slots.actions" class="shell-actions">
          <slot name="actions" />
        </div>
      </template>
    </header>

    <slot />

    <footer v-if="$slots.footnote" class="shell-foot">
      <slot name="footnote" />
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * The standard page frame.
 *
 * Every page rolled its own container, which is how the player page ended up at
 * `max-w-3xl` — a 768px column on a 1600px monitor — while the dashboard ran to
 * 1600px. This is a desktop operator console; a single centred strip with two
 * empty thirds is a waste of the surface it is read on.
 *
 * `--page-max` (1760px) is wide enough for a 12-column grid at a readable
 * column width. Pages lay out inside it with `.grid-12` and `.col-N` below, or
 * with plain Tailwind grid classes — this only owns the frame.
 */
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  /** Narrower frame for a genuinely single-subject page (login, account). */
  narrow?: boolean
}>(), {
  title: '',
  subtitle: '',
  narrow: false,
})
</script>

<style scoped>
.shell {
  max-width: var(--page-max);
  margin-inline: auto;
  padding: 0.75rem;
  padding-bottom: 5rem;
  min-height: 100vh;
}

@media (min-width: 640px) {
  .shell { padding: 1.25rem 1.5rem; padding-bottom: 3rem; }
}

.shell-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.shell-titles { min-width: 0; }

.shell-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink-strong);
  line-height: 1.15;
  letter-spacing: -0.01em;
}
@media (min-width: 640px) {
  .shell-title { font-size: 1.6rem; }
}

.shell-sub {
  margin-top: 0.15rem;
  font-size: 0.76rem;
  color: var(--ink-mute);
}

.shell-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.shell-foot {
  margin-top: 1.25rem;
  font-size: 0.63rem;
  line-height: 1.6;
  color: var(--ink-faint);
  max-width: 62ch;
}
</style>

<style>
/*
 * Global (unscoped on purpose) — the 12-column grid children use. A scoped
 * rule cannot reach a slotted child, and every page needs the same columns.
 */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (min-width: 1024px) {
  .grid-12 { gap: 1rem; }
}
/* Below lg every column is full width — a 3-column rail is unreadable on a
   phone, and this app still ships an APK shell. */
.col-3, .col-4, .col-5, .col-6, .col-7, .col-8, .col-9, .col-12 {
  grid-column: span 12;
}
@media (min-width: 1024px) {
  .col-3 { grid-column: span 3; }
  .col-4 { grid-column: span 4; }
  .col-5 { grid-column: span 5; }
  .col-6 { grid-column: span 6; }
  .col-7 { grid-column: span 7; }
  .col-8 { grid-column: span 8; }
  .col-9 { grid-column: span 9; }
}
</style>
