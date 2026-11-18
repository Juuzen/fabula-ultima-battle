import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-400',
  secondary:
    'bg-slate-800 text-slate-100 ring-1 ring-slate-600 hover:bg-slate-700 focus-visible:outline-slate-400',
  danger: 'bg-rose-700 text-white hover:bg-rose-600 focus-visible:outline-rose-400',
  success: 'bg-emerald-700 text-white hover:bg-emerald-600 focus-visible:outline-emerald-400',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-slate-400',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-4 text-sm',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}
