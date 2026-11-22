import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCustomEffects } from '@/app/library/assetHooks'
import { library } from '@/app/library/library'
import { CustomEffectSchema, MAX_EFFECT_SCALE, MIN_EFFECT_SCALE, type CustomEffect } from '@/domain'
import { useAssetUrl } from '@/infra/assets/assetResolver'
import { Button } from '@/shared/ui/Button'
import { Slider, TextField } from '@/shared/ui/fields'

import { SaveIndicator } from '../library/SaveIndicator'
import { useAutosave } from '../library/useAutosave'
import { AssetPicker } from './AssetPicker'

/** Used when the browser could not read a video's length. */
const FALLBACK_DURATION_MS = 1000

const clampDuration = (ms: number | null | undefined) =>
  Math.min(Math.max(ms ?? FALLBACK_DURATION_MS, 100), 20_000)

/**
 * The effect's video, looping, with its timeline below: the bar runs with the video and the
 * marker shows when the hit lands, so the impact point can be set by eye.
 */
function ImpactPreview({ effect }: { effect: Pick<CustomEffect, 'videoAssetId' | 'impactAt'> }) {
  const url = useAssetUrl(effect.videoAssetId)
  const video = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const v = video.current
      if (v && bar.current && v.duration) {
        bar.current.style.width = `${(v.currentTime / v.duration) * 100}%`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-square w-48 items-center justify-center overflow-hidden rounded-lg bg-[repeating-conic-gradient(#1e293b_0_25%,#0f172a_0_50%)] bg-[length:24px_24px] ring-1 ring-slate-700">
        {url && (
          <video
            ref={video}
            src={url}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <div className="relative h-2 w-48 rounded-full bg-slate-800" aria-hidden="true">
        <div ref={bar} className="absolute inset-y-0 left-0 rounded-full bg-slate-500" />
        <div
          className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded bg-amber-300"
          style={{ left: `${effect.impactAt * 100}%` }}
        />
      </div>
    </div>
  )
}

function DeleteEffect({ effect }: { effect: CustomEffect }) {
  const { t } = useTranslation()
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <Button variant="ghost" onClick={() => setArmed(true)} className="hover:text-rose-300">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t('master.customEffect.delete')}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="danger" onClick={() => void library.deleteEffect(effect.id)}>
        {t('master.customEffect.deleteConfirm', { name: effect.name })}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        {t('assets.deleteCancel')}
      </Button>
      <p className="w-full text-xs text-slate-400">{t('master.customEffect.deleteHint')}</p>
    </div>
  )
}

/** One custom effect, saved as it is edited. */
function CustomEffectCard({ effect }: { effect: CustomEffect }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(effect)
  // Deleting the sound in the library clears it here too.
  const [seenSound, setSeenSound] = useState(effect.soundAssetId)
  if (effect.soundAssetId !== seenSound) {
    setSeenSound(effect.soundAssetId)
    setDraft((d) => ({ ...d, soundAssetId: effect.soundAssetId }))
  }
  const set = (changes: Partial<CustomEffect>) => setDraft((d) => ({ ...d, ...changes }))
  const parsed = CustomEffectSchema.safeParse({ ...draft, name: draft.name.trim(), updatedAt: 0 })
  const status = useAutosave(parsed.success ? parsed.data : null, library.saveEffect)
  const label = draft.name.trim() || t('master.customEffect.newName')

  const chooseVideo = async (videoAssetId: string | null) => {
    if (!videoAssetId) return
    const meta = await library.getAsset(videoAssetId)
    set({ videoAssetId, durationMs: clampDuration(meta?.durationMs) })
  }

  return (
    <li
      aria-label={t('master.customEffect.label', { name: label })}
      className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
    >
      <div className="flex flex-wrap gap-6">
        <ImpactPreview effect={draft} />
        <div className="flex min-w-64 flex-1 flex-col gap-4">
          <TextField
            label={t('master.customEffect.name')}
            value={draft.name}
            maxLength={40}
            onChange={(e) => set({ name: e.target.value })}
          />
          <Slider
            label={t('master.customEffect.impact')}
            min={5}
            max={95}
            value={Math.round(draft.impactAt * 100)}
            onChange={(v) => set({ impactAt: v / 100 })}
            format={(v) =>
              `${v}% · ${t('master.customEffect.duration', {
                s: ((draft.durationMs * v) / 100 / 1000).toFixed(2),
              })}`
            }
          />
          <p className="-mt-2 text-xs text-slate-400">{t('master.customEffect.impactHint')}</p>
          <Slider
            label={t('master.customEffect.scale')}
            min={MIN_EFFECT_SCALE * 100}
            max={MAX_EFFECT_SCALE * 100}
            step={5}
            value={Math.round(draft.scale * 100)}
            onChange={(v) => set({ scale: v / 100 })}
            format={(v) => `${v}%`}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <AssetPicker
          role="effect"
          size="sm"
          label={t('master.customEffect.video')}
          value={draft.videoAssetId}
          // An effect is its video: it can be replaced, not removed.
          removable={false}
          onChange={(id) => void chooseVideo(id)}
        />
        <AssetPicker
          role="sfx"
          size="sm"
          label={t('master.customEffect.sound')}
          value={draft.soundAssetId}
          onChange={(soundAssetId) => set({ soundAssetId })}
        />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <SaveIndicator status={status} />
        <DeleteEffect effect={effect} />
      </footer>
    </li>
  )
}

/** A new effect starts from a video: picking or uploading one creates it. */
function NewEffect() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button className="self-start" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t('master.customEffect.add')}
      </Button>
    )
  }
  const create = async (videoAssetId: string | null) => {
    if (!videoAssetId) return
    const meta = await library.getAsset(videoAssetId)
    await library.saveEffect({
      id: crypto.randomUUID(),
      name: (meta?.name ?? t('master.customEffect.newName')).slice(0, 40),
      videoAssetId,
      durationMs: clampDuration(meta?.durationMs),
      impactAt: 0.5,
      scale: 1,
      soundAssetId: null,
      updatedAt: 0,
    })
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 p-4">
      <AssetPicker
        role="effect"
        label={t('master.customEffect.video')}
        value={null}
        onChange={(id) => void create(id)}
      />
      <Button variant="ghost" className="self-start" onClick={() => setOpen(false)}>
        {t('assets.deleteCancel')}
      </Button>
    </div>
  )
}

/** The GM's video effects, offered next to the built-in ones in abilities and actions. */
export function CustomEffects() {
  const { t } = useTranslation()
  const effects = useCustomEffects()
  if (!effects) return null
  return (
    <div className="flex flex-col gap-4">
      {effects.length === 0 ? (
        <p className="text-sm text-slate-400">{t('master.customEffect.none')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {effects.map((effect) => (
            <CustomEffectCard key={effect.id} effect={effect} />
          ))}
        </ul>
      )}
      <NewEffect />
    </div>
  )
}
