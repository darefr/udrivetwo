import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { audit, query, tx } from './database'
import { insist, Problem, type Principal } from './contracts'
export interface ImageStorage {
  put(bytes: Buffer, actor: string): Promise<string>
  get(id: string): Promise<Uint8Array | null>
}
export const imageStorage: ImageStorage = {
  async put(bytes, actor) {
    const id = createHash('sha256').update(bytes).digest('hex')
    await tx(async (sql) => {
      await sql.rows(
        "INSERT INTO media_assets(id,bytes,mime) VALUES($1,$2,'image/webp') ON CONFLICT DO NOTHING",
        [id, bytes],
      )
      await audit(sql, actor, 'IMAGE_UPLOADED', 'media', id)
    })
    return `/api/media/${id}`
  },
  async get(id) {
    const [r] = await query('SELECT bytes FROM media_assets WHERE id=$1', [id])
    return r?.bytes ?? null
  },
}
export async function saveImage(input: Buffer, user: Principal) {
  let encoded: Buffer
  try {
    const img = sharp(input, { limitInputPixels: 24000000, failOn: 'warning' })
    const m = await img.metadata()
    insist(
      ['jpeg', 'png', 'webp'].includes(m.format || '') && (m.pages ?? 1) === 1,
      422,
      'Choose a still JPEG, PNG, or WebP image.',
    )
    encoded = await img
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toBuffer()
  } catch {
    throw new Problem(
      422,
      'Choose a valid still JPEG, PNG, or WebP under 24 megapixels.',
    )
  }
  return { path: await imageStorage.put(encoded, user.id) }
}
