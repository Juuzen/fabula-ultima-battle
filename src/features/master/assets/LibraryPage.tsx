import { useId, type ReactNode } from 'react'

import { StorageEstimate } from './StorageEstimate'

/** Frame shared by the Audio and Video library sections. */
export function LibraryPage({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="font-display text-3xl font-bold tracking-wide text-white">
            {title}
          </h2>
          <p className="text-sm text-slate-400">{intro}</p>
        </div>
        <StorageEstimate />
      </header>
      {children}
    </section>
  )
}

/** A titled block that is not a shelf (e.g. custom effects, sound slots). */
export function LibraryBlock({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
    >
      <div className="flex flex-col gap-1">
        <h3 id={id} className="font-display text-lg font-semibold tracking-wide text-slate-100">
          {title}
        </h3>
        {hint && <p className="max-w-prose text-sm text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
