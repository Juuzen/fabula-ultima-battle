import type { ReactNode } from 'react'

type Props = {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Titled card used to group the Master's controls. */
export function Panel({ title, actions, children, className = '' }: Props) {
  return (
    <section
      aria-label={title}
      className={`rounded-xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg tracking-wide text-slate-100">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}
