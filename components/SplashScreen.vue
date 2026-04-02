<template>
  <Transition name="splash-fade">
    <div v-if="visible" class="splash-screen">
      <!-- Soft dark background with subtle radial glow -->
      <div class="splash-bg" />

      <!-- Centered content -->
      <div class="splash-content">
        <!-- Pulsing ring behind logo -->
        <div class="splash-ring-wrap">
          <div class="splash-ring" />
          <div class="splash-ring splash-ring-2" />
        </div>

        <!-- Logo with scale+fade reveal -->
        <img
          src="/proteroLogo.png"
          alt="ΠροΤερο"
          class="splash-logo"
          :class="{ 'logo-reveal': logoRevealed }"
        />

        <!-- App name text reveal -->
        <p
          class="splash-name"
          :class="{ 'name-reveal': nameRevealed }"
        >
          ΠροΤερο
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const visible = ref(true)
const logoRevealed = ref(false)
const nameRevealed = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    logoRevealed.value = true
  })

  setTimeout(() => {
    nameRevealed.value = true
  }, 400)

  setTimeout(() => {
    visible.value = false
  }, 2000)
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dark base with subtle dual-tone radial glow */
.splash-bg {
  position: absolute;
  inset: 0;
  background: #14161b;
  overflow: hidden;
}

.splash-bg::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -30%;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 40, 40, 0.08) 0%, transparent 70%);
  animation: glowPulse 3s ease-in-out infinite;
}

.splash-bg::after {
  content: '';
  position: absolute;
  bottom: -40%;
  left: -30%;
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(8, 72, 168, 0.08) 0%, transparent 70%);
  animation: glowPulse 3s ease-in-out infinite 1.5s;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.splash-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Pulsing rings */
.splash-ring-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, calc(-50% - 16px));
  pointer-events: none;
}

.splash-ring {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  animation: ringExpand 2s ease-out infinite;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.6);
}

.splash-ring-2 {
  animation-delay: 0.7s;
}

@keyframes ringExpand {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

/* Logo */
.splash-logo {
  width: 5.5rem;
  height: 5.5rem;
  object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(248, 40, 40, 0.15)) drop-shadow(0 0 30px rgba(8, 72, 168, 0.15));
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 640px) {
  .splash-logo {
    width: 7rem;
    height: 7rem;
  }
}

.splash-logo.logo-reveal {
  opacity: 1;
  transform: scale(1);
}

/* App name */
.splash-name {
  margin-top: 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.splash-name.name-reveal {
  opacity: 1;
  transform: translateY(0);
}

/* Fade out */
.splash-fade-leave-active {
  transition: opacity 0.5s ease-out;
}

.splash-fade-leave-to {
  opacity: 0;
}
</style>
