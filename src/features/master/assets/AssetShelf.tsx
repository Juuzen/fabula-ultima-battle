import { Trash2, Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { libraryAssetSource } from '@/app/library/assetSource'
import { useAssets } from '@/app/library/assetHooks'
import { library } from '@/app/library/library'
import { ROLE_KINDS, type AssetMeta, type AssetRole } from '@/domain'
import { Button } from '@/shared/ui/Button'

import { PreviewButton } from './AssetPicker'
import { AssetThumb } from './AssetThumb'
import { useAudioPreview } from './audioPreview'
import { ACCEPT, formatBytes, uploadAsset, type UploadProblem } from './uploadAsset'
import { useUploadMessage } from './uploadMessage'

const formatDuration = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s < 60
    ? `${(ms / 1000).toFixed(1)} s`
    : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function details(asset: AssetMeta): string {
  const parts = [formatBytes(asset.size)]
  if (asset.width && asset.height) parts.push(`${asset.width}×${asset.height}`)
  if (asset.durationMs) parts.push(formatDuration(asset.durationMs))
  return parts.join(' · ')
}

/** The file's name, renamed in place (commits on blur or Enter). */
function NameField({ asset }: { asset: AssetMeta }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(asset.name)
  const [last, setLast] = useState(asset.name)
  if (asset.name !== last) {
    setLast(asset.name)
    setDraft(asset.name)
  }
  const commit = () => {
    if (draft.trim() === '') setDraft(asset.name)
    else if (draft.trim() !== asset.name) void library.renameAsset(asset.id, draft)
  }
  return (
    <input
      aria-label={t('assets.rename')}
      value={draft}
      maxLength={120}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="h-8 w-full min-w-0 rounded bg-transparent px-1 text-sm text-slate-100 ring-1 ring-transparent hover:ring-slate-700 focus:bg-slate-950 focus:ring-indigo-400 focus:outline-none"
    />
  )
}

/** Delete, with a second click to confirm and a word on where the file is used. */
function DeleteAsset({ asset }: { asset: AssetMeta }) {
  const { t } = useTranslation()
  const [usage, setUsage] = useState<number | null>(null)
  const armed = usage !== null
  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('assets.delete', { name: asset.name })}
        title={t('assets.delete', { name: asset.name })}
        className="hover:text-rose-300"
        onClick={() => void library.assetUsage(asset.id).then(setUsage)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    )
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-rose-950/40 p-2 ring-1 ring-rose-800">
      {usage > 0 && (
        <p className="text-xs text-rose-200">{t('assets.deleteUsed', { count: usage })}</p>
      )}
      {asset.role === 'effect' && (
        <p className="text-xs text-rose-200">{t('assets.deleteEffectVideo')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (useAudioPreview.getState().playingId === asset.id) useAudioPreview.getState().stop()
            void library.deleteAsset(asset.id).then(() => libraryAssetSource.forget(asset.id))
          }}
        >
          {t('assets.deleteConfirm')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setUsage(null)}>
          {t('assets.deleteCancel')}
        </Button>
      </div>
    </div>
  )
}

type Props = { role: AssetRole; title: string; hint?: string }

/** One shelf of the library: its files, upload (button or drop), rename, listen, delete. */
export function AssetShelf({ role, title, hint }: Props) {
  const { t } = useTranslation()
  const headingId = useId()
  const input = useRef<HTMLInputElement>(null)
  const assets = useAssets(role)
  const [busy, setBusy] = useState(0)
  const [problem, setProblem] = useState<UploadProblem | null>(null)
  const [dragging, setDragging] = useState(false)
  const message = useUploadMessage()
  const visual = !ROLE_KINDS[role].includes('audio')

  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])]
    if (list.length === 0) return
    setProblem(null)
    setBusy((n) => n + list.length)
    for (const file of list) {
      const result = await uploadAsset(file, role)
      if (result.problem) setProblem(result.problem)
      setBusy((n) => n - 1)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void upload(e.dataTransfer.files)
  }

  return (
    <section
      aria-labelledby={headingId}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
      className={`flex flex-col gap-4 rounded-xl border p-5 transition-colors ${
        dragging ? 'border-indigo-400 bg-indigo-600/10' : 'border-slate-800 bg-slate-900/40'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3
            id={headingId}
            className="font-display text-lg font-semibold tracking-wide text-slate-100"
          >
            {title}
          </h3>
          {hint && <p className="max-w-prose text-sm text-slate-400">{hint}</p>}
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT[role]}
          className="sr-only"
          tabIndex={-1}
          aria-label={`${title}: ${t('assets.upload')}`}
          onChange={(e) => {
            void upload(e.target.files)
            e.target.value = ''
          }}
        />
        <Button onClick={() => input.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy > 0 ? t('assets.uploading') : t('assets.upload')}
        </Button>
      </header>

      {problem && (
        <p role="alert" className="text-sm text-rose-300">
          {message(problem, role)}
        </p>
      )}

      {assets && assets.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          {dragging ? t('assets.drop') : t('assets.emptyShelf')}
        </p>
      )}

      {assets && assets.length > 0 && (
        <ul
          aria-label={title}
          className={
            visual
              ? 'grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3'
              : 'flex flex-col divide-y divide-slate-800'
          }
        >
          {assets.map((asset) =>
            visual ? (
              <li
                key={asset.id}
                aria-label={asset.name}
                className="flex flex-col gap-2 rounded-lg bg-slate-950/60 p-2 ring-1 ring-slate-800"
              >
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-slate-950">
                  <AssetThumb assetId={asset.id} fallback={asset.kind} />
                </div>
                <NameField asset={asset} />
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-400 tabular-nums">
                    {details(asset)}
                  </span>
                  <DeleteAsset asset={asset} />
                </div>
              </li>
            ) : (
              <li
                key={asset.id}
                aria-label={asset.name}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <PreviewButton asset={asset} />
                <div className="min-w-0 flex-1">
                  <NameField asset={asset} />
                </div>
                <span className="text-xs text-slate-400 tabular-nums">{details(asset)}</span>
                <DeleteAsset asset={asset} />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
