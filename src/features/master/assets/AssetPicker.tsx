import { Library, Pause, Play, Search, Upload, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useAssetMeta, useAssets } from '@/app/library/assetHooks'
import { ROLE_KINDS, type AssetMeta, type AssetRole } from '@/domain'
import { Button } from '@/shared/ui/Button'
import { Popover } from '@/shared/ui/Popover'

import { AssetThumb } from './AssetThumb'
import { useAudioPreview } from './audioPreview'
import { ACCEPT, uploadAsset, type UploadProblem } from './uploadAsset'
import { useUploadMessage } from './uploadMessage'

const LABEL = 'text-xs font-medium tracking-wide text-slate-400 uppercase'

/** ▶ / ❚❚ for a track or sound, on the GM's own speakers. */
export function PreviewButton({ asset }: { asset: Pick<AssetMeta, 'id' | 'name'> }) {
  const { t } = useTranslation()
  const playing = useAudioPreview((s) => s.playingId === asset.id)
  const toggle = useAudioPreview((s) => s.toggle)
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={playing}
      aria-label={playing ? t('assets.stop') : t('assets.play', { name: asset.name })}
      title={playing ? t('assets.stop') : t('assets.play', { name: asset.name })}
      onClick={() => toggle(asset.id)}
    >
      {playing ? (
        <Pause className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Play className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  )
}

/** Library files of one shelf, searchable; picking one closes the panel. */
function LibraryChooser({
  role,
  value,
  onPick,
}: {
  role: AssetRole
  value: string | null
  onPick: (id: string) => void
}) {
  const { t } = useTranslation()
  const assets = useAssets(role)
  const [query, setQuery] = useState('')
  const visual = !ROLE_KINDS[role].includes('audio')
  if (!assets) return null
  const shown = assets.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-3">
      {assets.length > 6 && (
        <label className="flex items-center gap-2 rounded-md bg-slate-950 px-3 ring-1 ring-slate-700 focus-within:ring-indigo-400">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('assets.search')}
            placeholder={t('assets.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full bg-transparent text-sm text-slate-100 focus:outline-none"
          />
        </label>
      )}
      {assets.length === 0 ? (
        <p className="text-sm text-slate-400">{t('assets.emptyShelf')}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-400">{t('assets.noMatch')}</p>
      ) : (
        <ul
          className={`grid max-h-72 gap-2 overflow-y-auto pr-1 ${visual ? 'grid-cols-3' : 'grid-cols-1'}`}
        >
          {shown.map((asset) => {
            const selected = asset.id === value
            return (
              <li key={asset.id} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(asset.id)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-md p-1.5 text-left text-sm ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                    visual ? 'flex-col' : ''
                  } ${selected ? 'bg-indigo-600/20 ring-indigo-500' : 'ring-slate-700 hover:bg-slate-800'}`}
                >
                  {visual && (
                    <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-slate-950">
                      <AssetThumb assetId={asset.id} fallback={asset.kind} />
                    </span>
                  )}
                  <span className="w-full truncate text-slate-200">{asset.name}</span>
                </button>
                {!visual && <PreviewButton asset={asset} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

type Props = {
  role: AssetRole
  label: string
  value: string | null
  onChange: (assetId: string | null) => void
  /** sm: a single row, for dense editors (e.g. an ability's sound). */
  size?: 'md' | 'sm'
  /** false when a file is required (e.g. a custom effect's video): it can be replaced only. */
  removable?: boolean
}

/**
 * Chooses a file for a sheet, a scene or a setting: upload a new one (it goes to the shared
 * library and can be reused anywhere), pick one already there, or remove it.
 */
export function AssetPicker({
  role,
  label,
  value,
  onChange,
  size = 'md',
  removable = true,
}: Props) {
  const { t } = useTranslation()
  const labelId = useId()
  const input = useRef<HTMLInputElement>(null)
  const meta = useAssetMeta(value)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<UploadProblem | null>(null)
  const [dragging, setDragging] = useState(false)
  const message = useUploadMessage()
  const audio = ROLE_KINDS[role].includes('audio')

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setProblem(null)
    const result = await uploadAsset(file, role)
    setBusy(false)
    if (result.asset) onChange(result.asset.id)
    else setProblem(result.problem)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void upload(e.dataTransfer.files[0])
  }

  const name = value === null ? t('assets.none') : (meta?.name ?? t('assets.missing'))
  const small = size === 'sm'

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <span id={labelId} className={LABEL}>
        {label}
      </span>
      <div
        className={`flex items-center gap-3 rounded-lg transition-colors ${dragging ? 'bg-indigo-600/15 ring-2 ring-indigo-400' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {!audio && (
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950/60 ${
              value ? 'ring-1 ring-slate-700' : 'border border-dashed border-slate-700'
            } ${small ? 'h-12 w-12' : 'h-28 w-28'}`}
          >
            <AssetThumb assetId={value} fallback={ROLE_KINDS[role][0]} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className={`truncate text-sm ${value ? 'text-slate-100' : 'text-slate-400'}`}
            data-testid="asset-name"
          >
            {busy ? t('assets.uploading') : name}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={input}
              type="file"
              accept={ACCEPT[role]}
              className="sr-only"
              tabIndex={-1}
              aria-label={`${label}: ${t('assets.upload')}`}
              onChange={(e) => {
                void upload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t('assets.upload')}
            </Button>
            <Popover
              label={t('assets.pickerTitle', { label })}
              title={t('assets.choose')}
              align="start"
              panelClassName="w-[min(24rem,calc(100vw-2rem))]"
              triggerClassName="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2.5 text-sm font-medium text-slate-100 ring-1 ring-slate-600 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 aria-expanded:bg-slate-700"
              trigger={
                <>
                  <Library className="h-4 w-4" aria-hidden="true" />
                  {t('assets.choose')}
                </>
              }
            >
              {(close) => (
                <LibraryChooser
                  role={role}
                  value={value}
                  onPick={(id) => {
                    onChange(id)
                    close()
                  }}
                />
              )}
            </Popover>
            {audio && value && meta && <PreviewButton asset={meta} />}
            {value && removable && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${label}: ${t('assets.remove')}`}
                title={t('assets.remove')}
                onClick={() => onChange(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-rose-300">
          {message(problem, role)}
        </p>
      )}
    </div>
  )
}
