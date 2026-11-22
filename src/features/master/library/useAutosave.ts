import { useEffect, useEffectEvent, useRef, useState } from 'react'

export type SaveStatus = 'saved' | 'pending' | 'invalid' | 'error'

/**
 * Saves `value` a moment after it stops changing; `null` means "not valid, don't save".
 * A change still waiting when the editor unmounts is saved right away.
 */
export function useAutosave<T>(
  value: T | null,
  save: (value: T) => Promise<unknown>,
  delay = 400,
): SaveStatus {
  const key = value === null ? null : JSON.stringify(value)
  const [savedKey, setSavedKey] = useState(key)
  const [failed, setFailed] = useState(false)
  const pending = useRef<{ value: T; key: string } | null>(null)
  const saveRef = useRef(save)
  // `value` is represented by `key`: same content, same save.
  const latestValue = useEffectEvent(() => value)

  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    const next = latestValue()
    if (next === null || key === null || key === savedKey) {
      pending.current = null
      return
    }
    pending.current = { value: next, key }
    const timer = setTimeout(() => {
      const current = pending.current
      if (!current) return
      pending.current = null
      saveRef.current(current.value).then(
        () => {
          setFailed(false)
          setSavedKey(current.key)
        },
        (error: unknown) => {
          console.error('Autosave failed', error)
          setFailed(true)
        },
      )
    }, delay)
    return () => clearTimeout(timer)
  }, [key, savedKey, delay])

  // Flush on unmount, so switching sheets never loses the last edit.
  useEffect(
    () => () => {
      const current = pending.current
      if (current) {
        saveRef.current(current.value).catch((error: unknown) => {
          console.error('Autosave failed', error)
        })
      }
    },
    [],
  )

  if (key === null) return 'invalid'
  if (failed) return 'error'
  return key === savedKey ? 'saved' : 'pending'
}
