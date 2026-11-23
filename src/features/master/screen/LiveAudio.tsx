import { Music, Volume2, VolumeX } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { useAssets } from '@/app/library/assetHooks'
import { useBattleActions, useBattleStore } from '@/app/store'
import { MAX_VOLUME, type AudioSettings } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { Slider } from '@/shared/ui/fields'
import { Popover } from '@/shared/ui/Popover'

import { SELECT } from '../action/pickers'
import { PreviewButton } from '../assets/AssetPicker'

const NONE = ''

function useSetAudio() {
  const { dispatch } = useBattleActions()
  return (audio: Partial<AudioSettings>) =>
    dispatch({ type: 'SET_PRESENTATION', changes: { audio } })
}

/** Silences the player screen at once (music and effects), and back. */
export function MuteButton() {
  const { t } = useTranslation()
  const muted = useBattleStore((s) => s.battle.presentation.audio.muted)
  const setAudio = useSetAudio()
  const Icon = muted ? VolumeX : Volume2
  return (
    <Button
      variant={muted ? 'danger' : 'secondary'}
      aria-pressed={muted}
      aria-label={t('master.liveAudio.mute')}
      title={t('master.liveAudio.muteHint')}
      onClick={() => setAudio({ muted: !muted })}
      className="w-10 px-0!"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}

/** The track playing now (changed live, with a crossfade) and the two volumes. */
export function LiveAudio() {
  const { t } = useTranslation()
  const selectId = useId()
  const audio = useBattleStore((s) => s.battle.presentation.audio)
  const tracks = useAssets('music') ?? []
  const setAudio = useSetAudio()
  const current = tracks.find((a) => a.id === audio.musicAssetId)

  return (
    <Popover
      label={t('master.liveAudio.trigger')}
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      trigger={
        <>
          <Music className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-40 truncate">{current?.name ?? t('master.liveAudio.title')}</span>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-lg tracking-wide text-slate-100">
          {t('master.liveAudio.title')}
        </h2>
        {tracks.length === 0 ? (
          <p className="text-sm text-slate-400">{t('master.liveAudio.noMusic')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={selectId}
              className="text-xs font-medium tracking-wide text-slate-400 uppercase"
            >
              {t('master.liveAudio.track')}
            </label>
            <div className="flex items-center gap-1">
              <select
                id={selectId}
                className={SELECT}
                value={audio.musicAssetId ?? NONE}
                onChange={(e) => setAudio({ musicAssetId: e.target.value || null })}
              >
                <option value={NONE}>{t('master.liveAudio.noTrack')}</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
              {current && <PreviewButton asset={current} />}
            </div>
            <p className="text-xs text-slate-400">{t('master.liveAudio.trackHint')}</p>
          </div>
        )}
        <Slider
          label={t('master.liveAudio.music')}
          min={0}
          max={MAX_VOLUME}
          value={audio.musicVolume}
          onChange={(musicVolume) => setAudio({ musicVolume })}
          format={(v) => `${v}%`}
        />
        <Slider
          label={t('master.liveAudio.sfx')}
          min={0}
          max={MAX_VOLUME}
          value={audio.sfxVolume}
          onChange={(sfxVolume) => setAudio({ sfxVolume })}
          format={(v) => `${v}%`}
        />
      </div>
    </Popover>
  )
}
