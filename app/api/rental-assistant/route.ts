import {
  readAssistantRequest,
  type RentalResponder,
} from '@/lib/rental-assistant'
import { catalogReply } from '@/lib/rental-guide'

// A future server-side model adapter implements the same contract. The current source is always disclosed.
const responder: RentalResponder = catalogReply
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}
const maxBytes = 64 * 1024
const error = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers })

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return error('Use the rental assistant on this site.', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return error('Expected a JSON conversation.', 415)
  if (Number(request.headers.get('content-length')) > maxBytes)
    return error('Conversation is too long.', 413)
  if (!request.body) return error('A rental question is required.', 400)
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let body = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        return error('Conversation is too long.', 413)
      }
      body += decoder.decode(value, { stream: true })
    }
    const input = readAssistantRequest(JSON.parse(body + decoder.decode()))
    if (!input)
      return error(
        'Send a short rental question with a supported language.',
        400,
      )
    try {
      return Response.json(await responder(input, request.signal), { headers })
    } catch {
      return Response.json(catalogReply(input), { headers })
    }
  } catch {
    return error('The conversation could not be read.', 400)
  } finally {
    reader.releaseLock()
  }
}
