import { createBlobAssetSource } from '@/infra/assets/assetResolver'

import { library } from './library'

/** The app's files, read from the library (both windows: same origin, same database). */
export const libraryAssetSource = createBlobAssetSource((id) => library.getAssetBlob(id))
