export const DISPLAY_WINDOW_NAME = 'fu-battle-display'

/**
 * Opens (or focuses, if already open) the player-facing Display window.
 * Returns null when the browser blocked the pop-up.
 */
export function openDisplayWindow(): Window | null {
  const url = new URL(window.location.href)
  url.hash = '#/display'
  const win = window.open(url.toString(), DISPLAY_WINDOW_NAME, 'popup,width=1280,height=720')
  win?.focus()
  return win
}
