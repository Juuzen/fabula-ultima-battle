import { useTranslation } from 'react-i18next'

import { AssetShelf } from './AssetShelf'
import { CustomEffects } from './CustomEffects'
import { LibraryBlock, LibraryPage } from './LibraryPage'

/** Backgrounds, custom effects and their videos, and the art uploaded from the sheets. */
export function VideoLibraryPage() {
  const { t } = useTranslation()
  return (
    <LibraryPage title={t('master.videoLibrary.title')} intro={t('master.videoLibrary.intro')}>
      <AssetShelf
        role="background"
        title={t('master.videoLibrary.backgrounds')}
        hint={t('master.videoLibrary.backgroundsHint')}
      />
      <LibraryBlock
        title={t('master.videoLibrary.effects')}
        hint={t('master.videoLibrary.effectsHint')}
      >
        <CustomEffects />
      </LibraryBlock>
      <AssetShelf role="effect" title={t('master.videoLibrary.effectVideos')} />
      <AssetShelf
        role="art"
        title={t('master.videoLibrary.art')}
        hint={t('master.videoLibrary.artHint')}
      />
    </LibraryPage>
  )
}
