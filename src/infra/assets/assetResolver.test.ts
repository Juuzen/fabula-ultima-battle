import { describe, expect, it, vi } from 'vitest'

import { createBlobAssetSource } from './assetResolver'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createBlobAssetSource', () => {
  it('loads each file once, keeps one URL, and tells subscribers', async () => {
    const read = vi.fn<(id: string) => Promise<Blob | undefined>>(async (id) =>
      id === 'pic' ? new Blob(['x'], { type: 'image/png' }) : undefined,
    )
    const urls = {
      createObjectURL: vi.fn<(blob: Blob) => string>(() => 'blob:pic'),
      revokeObjectURL: vi.fn<(url: string) => void>(),
    }
    const source = createBlobAssetSource(read, urls)
    const listener = vi.fn<() => void>()
    source.subscribe(listener)

    expect(source.peek('pic')).toBeUndefined()
    source.load('pic')
    source.load('pic')
    source.load('gone')
    await flush()

    expect(read).toHaveBeenCalledTimes(2)
    expect(source.peek('pic')).toEqual({ url: 'blob:pic', kind: 'image' })
    expect(source.peek('gone')).toBeNull()
    expect(listener).toHaveBeenCalled()

    source.forget('pic')
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:pic')
    expect(source.peek('pic')).toBeUndefined()
  })
})
