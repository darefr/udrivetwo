import { runJobs } from '@/lib/platform/notifications'
import { failure, response, same } from '@/lib/platform/security'
import { insist } from '@/lib/platform/contracts'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  try {
    insist(
      process.env.CRON_SECRET &&
        same(
          req.headers.get('authorization') || '',
          `Bearer ${process.env.CRON_SECRET}`,
        ),
      401,
      'Worker authorization required.',
    )
    return response(await runJobs())
  } catch (e) {
    return failure(e)
  }
}
