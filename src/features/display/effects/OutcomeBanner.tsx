import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import type { Outcome } from '@/domain'

/** Above the whole scene and its HUD (the action banner is 1600). */
const Z = 1700

/** The classic JRPG victory window: it springs open, the words catch the light once. */
function VictoryBanner({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z }}>
      <motion.div
        aria-hidden="true"
        className="absolute h-[420px] w-[1300px] rounded-full bg-[radial-gradient(closest-side,rgba(238,241,255,0.35),transparent)]"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.div
        className="jrpg-window relative h-auto! overflow-hidden px-24! py-8!"
        initial={{ opacity: 0, scaleX: 0.3, scaleY: 0.6 }}
        animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <span className="font-display block max-w-[1500px] text-center text-8xl leading-tight font-bold tracking-[0.12em] text-balance [text-shadow:0_3px_0_rgba(0,0,0,0.6),0_0_28px_rgba(238,241,255,0.55)]">
          {text}
        </span>
        <span aria-hidden="true" className="outcome-shine pointer-events-none absolute inset-0" />
      </motion.div>
    </div>
  )
}

/** The fight is lost: the scene drains of colour and the words settle slowly. */
function DefeatBanner({ text }: { text: string }) {
  return (
    <div className="absolute inset-0" style={{ zIndex: Z }}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/45 backdrop-brightness-75 backdrop-grayscale"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="font-display max-w-[1600px] text-center text-8xl leading-tight font-semibold tracking-[0.2em] text-balance text-slate-200 [text-shadow:0_4px_18px_rgba(0,0,0,0.9)]"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 0.6, ease: 'easeOut' }}
        >
          {text}
        </motion.span>
      </div>
    </div>
  )
}

// Texts are at most 40 characters: past one line they wrap into two balanced ones.

/** Escape and custom endings: just the words, on a soft dark band so they read on any scene. */
function PlainBanner({ text }: { text: string }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center bg-[linear-gradient(90deg,transparent,rgba(2,6,23,0.6)_25%,rgba(2,6,23,0.6)_75%,transparent)] py-8"
      style={{ zIndex: Z }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <span className="font-display max-w-[1600px] px-10 text-center text-7xl leading-tight font-semibold tracking-[0.1em] text-balance text-white [text-shadow:0_3px_0_rgba(0,0,0,0.7)]">
        {text}
      </span>
    </motion.div>
  )
}

/**
 * How the battle ended, over the frozen scene: victory and defeat have their own look, an
 * escape or a custom ending are plain words. Stays up until the GM ends the scene (or resumes).
 */
export function OutcomeBanner({ outcome }: { outcome: Outcome | null }) {
  const { t } = useTranslation()
  // No text of their own: the kind's default ("Vittoria!"). Custom endings always have one.
  const text =
    !outcome || outcome.text || outcome.kind === 'custom'
      ? (outcome?.text ?? '')
      : t(`outcome.default.${outcome.kind}`)

  return (
    <AnimatePresence>
      {outcome && (
        <motion.div
          key={`${outcome.kind}:${text}`}
          data-testid="outcome-banner"
          data-kind={outcome.kind}
          role="status"
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: Z }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {outcome.kind === 'victory' ? (
            <VictoryBanner text={text} />
          ) : outcome.kind === 'defeat' ? (
            <DefeatBanner text={text} />
          ) : (
            <PlainBanner text={text} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
