import { useTranslation } from 'react-i18next'

import { useSoundSettings } from '@/app/library/assetHooks'
import { library } from '@/app/library/library'
import { BUILTIN_EFFECTS, SYSTEM_SOUNDS, type SoundSettings } from '@/domain'

import { AssetPicker } from './AssetPicker'
import { AssetShelf } from './AssetShelf'
import { LibraryBlock, LibraryPage } from './LibraryPage'

const save = (settings: SoundSettings) =>
  library.saveSoundSettings(settings).catch((error: unknown) => {
    console.error('Could not save sound settings', error)
  })

/** Which sound plays on a hit, a heal, a KO, the start of battle, and for each built-in effect. */
function SoundSlots() {
  const { t } = useTranslation()
  const settings = useSoundSettings()
  return (
    <>
      <LibraryBlock
        title={t('master.audioLibrary.system')}
        hint={t('master.audioLibrary.systemHint')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {SYSTEM_SOUNDS.map((sound) => (
            <AssetPicker
              key={sound}
              role="sfx"
              size="sm"
              label={t(`master.audioLibrary.systemSounds.${sound}`)}
              value={settings.system[sound]}
              onChange={(id) =>
                void save({ ...settings, system: { ...settings.system, [sound]: id } })
              }
            />
          ))}
        </div>
      </LibraryBlock>
      <LibraryBlock
        title={t('master.audioLibrary.effectSounds')}
        hint={t('master.audioLibrary.effectSoundsHint')}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {BUILTIN_EFFECTS.map((effect) => (
            <AssetPicker
              key={effect}
              role="sfx"
              size="sm"
              label={t(`effects.${effect}`)}
              value={settings.effects[effect]}
              onChange={(id) =>
                void save({ ...settings, effects: { ...settings.effects, [effect]: id } })
              }
            />
          ))}
        </div>
      </LibraryBlock>
    </>
  )
}

/** Music and sound effects, and where the sounds play. Live playback stays in Screen control. */
export function AudioLibraryPage() {
  const { t } = useTranslation()
  return (
    <LibraryPage title={t('master.audioLibrary.title')} intro={t('master.audioLibrary.intro')}>
      <AssetShelf
        role="music"
        title={t('master.audioLibrary.music')}
        hint={t('master.audioLibrary.musicHint')}
      />
      <AssetShelf
        role="sfx"
        title={t('master.audioLibrary.sfx')}
        hint={t('master.audioLibrary.sfxHint')}
      />
      <SoundSlots />
    </LibraryPage>
  )
}
