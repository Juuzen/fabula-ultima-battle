import { createContext, useContext } from 'react'

/**
 * True while the GM edits a scene's layout: sprites and nameplates follow the pointer at once,
 * with no entrance and no sliding into place.
 */
export const SceneEditingContext = createContext(false)

export const useSceneEditing = () => useContext(SceneEditingContext)
