import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { ZodError } from 'zod'
import { query, localMode, type Sql } from './database'
import { insist, Problem, type Principal } from './contracts'
export const token = () => randomBytes(32).toString('base64url')
export const digest = (s: string) =>
  createHash('sha256').update(s).digest('hex')
export const same = (a: string, b: string) =>
  timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)))
export const derive = (s: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      s,
      salt,
      64,
      { N: 32768, r: 8, p: 2, maxmem: 64 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  )
export async function hashPassword(value: string) {
  const salt = randomBytes(24).toString('hex')
  return `s2:${salt}:${(await derive(value, salt)).toString('hex')}`
}
export async function checkPassword(value: string, stored: string | null) {
  const [, salt, expected] = (stored || 's2:expired:').split(':')
  const key = await derive(value, salt)
  return !!expected && same(key.toString('hex'), expected)
}
export const publicOrigin = () => {
  const value =
    process.env.APP_ORIGIN ||
    (localMode() ? process.env.V0_RUNTIME_URL : '') ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    (localMode() ? 'http://localhost:3000' : '')
  insist(value, 503, 'The rental service origin is not configured.')
  const url = new URL(value)
  insist(
    localMode() || url.protocol === 'https:',
    503,
    'Secure origin required.',
  )
  return url.origin
}
export function checkOrigin(req: Request) {
  const origins = [
    publicOrigin(),
    ...(localMode()
      ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          process.env.V0_RUNTIME_URL,
          process.env.V0_DEV_APP_URL,
          process.env.V0_BUILD_URL,
          process.env.V0_SANDBOX_URL,
        ]
      : []),
  ]
    .filter(Boolean)
    .map((x) => new URL(x!).origin)
  insist(
    origins.includes(req.headers.get('origin') || '') &&
      req.headers.get('sec-fetch-site') !== 'cross-site',
    403,
    'Please submit this request from the U Drive website.',
  )
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const [r] = await query(
    `INSERT INTO rate_limits(bucket,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<=now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING count`,
    [digest(key), seconds],
  )
  insist(r.count <= limit, 429, 'Too many requests. Please try again later.')
}
export function clientKey(req: Request) {
  return process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 'edge'
    : process.env.TRUST_PROXY === '1'
      ? req.headers.get('x-real-ip') || 'proxy'
      : 'local'
}
export async function readBytes(req: Request, limit: number) {
  insist(req.body, 400, 'Request body required.')
  insist(
    Number(req.headers.get('content-length') || 0) <= limit,
    413,
    'Request is too large.',
  )
  const reader = req.body.getReader()
  const parts: Uint8Array[] = []
  let n = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      n += value.byteLength
      if (n > limit) {
        await reader.cancel()
        throw new Problem(413, 'Request is too large.')
      }
      parts.push(value)
    }
    return Buffer.concat(parts)
  } finally {
    reader.releaseLock()
  }
}
export async function jsonBody(req: Request) {
  insist(
    req.headers.get('content-type')?.split(';')[0] === 'application/json',
    415,
    'Send a JSON request.',
  )
  const bytes = await readBytes(req, 32768)
  try {
    return JSON.parse(bytes.toString())
  } catch {
    throw new Problem(400, 'Invalid JSON.')
  }
}
export const response = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
export function failure(e: unknown) {
  if (e instanceof Problem) return response({ error: e.message }, e.status)
  if (e instanceof ZodError)
    return response(
      {
        error: e.issues
          .map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`)
          .slice(0, 3)
          .join('; '),
      },
      422,
    )
  const db = e as { code?: string; constraint?: string }
  if (db.code === '23505')
    return response(
      {
        error:
          db.constraint === 'occupied_days_pkey'
            ? 'This vehicle is already booked or blocked for those dates.'
            : 'This request conflicts with an existing record.',
      },
      409,
    )
  if (['23503', '23514', '22P02', '22007'].includes(db.code || ''))
    return response(
      {
        error:
          'Invalid information or a related record is no longer available.',
      },
      422,
    )
  console.error(
    '[U Drive] Request failed',
    e instanceof Error ? e.name : 'Error',
    db.code || 'internal',
  )
  return response(
    {
      error:
        'The rental desk couldn’t complete this request. Please try again.',
    },
    500,
  )
}
export async function session() {
  const t = (await cookies()).get('udrive_session')?.value
  if (!t || t.length !== 43) return null
  const [u] = await query<Principal>(
    'SELECT u.id,u.name,u.email,u.email_verified,u.role,c.id AS customer_id,c.phone FROM sessions s JOIN users u ON u.id=s.user_id JOIN customers c ON c.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.enabled AND c.enabled',
    [digest(t)],
  )
  return u ?? null
}
export const cookieOptions = () => ({
  httpOnly: true,
  path: '/',
  secure: true,
  sameSite:
    process.env.NODE_ENV === 'development'
      ? ('none' as const)
      : ('lax' as const),
})
export async function newSession(sql: Sql, id: string, remember: boolean) {
  const raw = token()
  const seconds = (remember ? 30 : 1) * 86400
  await sql.rows(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')",
    [digest(raw), id, seconds],
  )
  return { raw, seconds, remember }
}
export async function issueSession(s: Awaited<ReturnType<typeof newSession>>) {
  ;(await cookies()).set('udrive_session', s.raw, {
    ...cookieOptions(),
    ...(s.remember ? { maxAge: s.seconds } : {}),
  })
}
export async function logout() {
  const jar = await cookies()
  const raw = jar.get('udrive_session')?.value
  if (raw)
    await query('DELETE FROM sessions WHERE token_hash=$1', [digest(raw)])
  jar.set('udrive_session', '', { ...cookieOptions(), maxAge: 0 })
}
