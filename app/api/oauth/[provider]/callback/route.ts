import { oauthCallback } from '@/lib/platform/oauth'
import { publicOrigin } from '@/lib/platform/security'
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    return await oauthCallback(request, (await params).provider)
  } catch {
    return Response.redirect(`${publicOrigin()}/sign-in?providerError=1`, 303)
  }
}
