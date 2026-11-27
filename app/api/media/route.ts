import { saveImage } from '@/lib/platform/storage'
import { permit } from '@/lib/platform/contracts'
import {
  checkOrigin,
  failure,
  rateLimit,
  readBytes,
  response,
  session,
} from '@/lib/platform/security'
export async function POST(req: Request) {
  try {
    checkOrigin(req)
    const user = await session()
    permit(user, 'vehicles')
    await rateLimit('upload:' + user.id, 24, 3600)
    return response(
      await saveImage(await readBytes(req, 4 * 1024 * 1024), user),
      201,
    )
  } catch (e) {
    return failure(e)
  }
}
