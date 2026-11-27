import { imageStorage } from '@/lib/platform/storage'
import { failure } from '@/lib/platform/security'
import { insist } from '@/lib/platform/contracts'
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    insist(/^[a-f0-9]{64}$/.test(id), 404, 'Image not found.')
    const bytes = await imageStorage.get(id)
    insist(bytes, 404, 'Image not found.')
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public,max-age=31536000,immutable',
      },
    })
  } catch (e) {
    return failure(e)
  }
}
