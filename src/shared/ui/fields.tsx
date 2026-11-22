import { useId, type InputHTMLAttributes, type Ref } from 'react'

const INPUT =
  'h-10 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, className = '', ref, ...rest }: TextFieldProps) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </label>
      <input id={id} ref={ref} type="text" className={INPUT} {...rest} />
    </div>
  )
}

type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  label: string
  /** Kept as a string so the user can type freely (empty, partial…). */
  value: string
  onValueChange: (value: string) => void
  hideLabel?: boolean
}

export function NumberField({
  label,
  value,
  onValueChange,
  hideLabel = false,
  className = '',
  ...rest
}: NumberFieldProps) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={id}
        className={
          hideLabel ? 'sr-only' : 'text-xs font-medium tracking-wide text-slate-400 uppercase'
        }
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`${INPUT} tabular-nums`}
        {...rest}
      />
    </div>
  )
}

type ToggleProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
  disabled?: boolean
}

/** Accessible switch (role="switch"). */
export function Toggle({ label, checked, onChange, description, disabled }: ToggleProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-40 ${
          checked ? 'bg-indigo-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
      <label htmlFor={id} className="flex cursor-pointer flex-col text-sm text-slate-200">
        {label}
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </label>
    </div>
  )
}

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** How the value is shown next to the label (and read by screen readers). */
  format?: (value: number) => string
  disabled?: boolean
  className?: string
}

/** Range input with its label and current value. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
  disabled,
  className = '',
}: SliderProps) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          {label}
        </label>
        <output htmlFor={id} className="text-sm text-slate-200 tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer accent-indigo-500 disabled:opacity-40"
      />
    </div>
  )
}
