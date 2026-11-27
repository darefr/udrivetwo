import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { devDirectory, localMode } from './database'
export async function ownerSetupToken() {
  if (process.env.ADMIN_SETUP_TOKEN)
    return process.env.ADMIN_SETUP_TOKEN.length >= 32
      ? process.env.ADMIN_SETUP_TOKEN
      : null
  if (!localMode()) return null
  await mkdir(devDirectory(), { recursive: true, mode: 0o700 })
  const file = path.join(devDirectory(), 'owner-code')
  try {
    await writeFile(file, randomBytes(32).toString('base64url'), {
      flag: 'wx',
      mode: 0o600,
    })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
  }
  return (await readFile(file, 'utf8')).trim()
}
