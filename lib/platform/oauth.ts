import * as oidc from 'openid-client'
import { cookies } from 'next/headers'
import { z } from 'zod'
import {
  publicOrigin,
  token,
  digest,
  same,
  newSession,
  issueSession,
  cookieOptions,
} from './security'
import { query, tx } from './database'
import { insist, email } from './contracts'
import { createIdentity } from './identity'
const providers = ['google', 'facebook'] as const
export const oauthFlags = () => ({
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  facebook: !!(
    process.env.FACEBOOK_CLIENT_ID &&
    process.env.FACEBOOK_CLIENT_SECRET &&
    process.env.FACEBOOK_GRAPH_VERSION
  ),
})
async function configuration(provider: (typeof providers)[number]) {
  insist(
    oauthFlags()[provider],
    503,
    'This provider is not enabled. Use your email and password instead.',
  )
  if (provider === 'google')
    return oidc.discovery(
      new URL('https://accounts.google.com'),
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    )
  const ver = process.env.FACEBOOK_GRAPH_VERSION!
  insist(/^v\d+\.0$/.test(ver), 503, 'Invalid provider configuration.')
  return new oidc.Configuration(
    {
      issuer: 'https://www.facebook.com',
      authorization_endpoint: `https://www.facebook.com/${ver}/dialog/oauth`,
      token_endpoint: `https://graph.facebook.com/${ver}/oauth/access_token`,
    },
    process.env.FACEBOOK_CLIENT_ID!,
    process.env.FACEBOOK_CLIENT_SECRET!,
    oidc.ClientSecretPost(process.env.FACEBOOK_CLIENT_SECRET!),
  )
}
export async function oauthStart(value: string) {
  const provider = z.enum(providers).parse(value)
  const conf = await configuration(provider)
  const state = token(),
    verifier = oidc.randomPKCECodeVerifier(),
    nonce = token()
  await query(
    "INSERT INTO oauth_attempts(state_hash,provider,verifier,nonce,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
    [digest(state), provider, verifier, nonce],
  )
  ;(await cookies()).set('udrive_oauth', state, {
    ...cookieOptions(),
    sameSite: 'lax',
    maxAge: 600,
  })
  return {
    url: oidc.buildAuthorizationUrl(conf, {
      response_type: 'code',
      scope:
        provider === 'google' ? 'openid email profile' : 'email,public_profile',
      redirect_uri: `${publicOrigin()}/api/oauth/${provider}/callback`,
      state,
      ...(provider === 'google'
        ? {
            nonce,
            code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
            code_challenge_method: 'S256',
          }
        : {}),
    }).href,
  }
}
export async function oauthCallback(req: Request, value: string) {
  const provider = z.enum(providers).parse(value)
  const url = new URL(`${publicOrigin()}/api/oauth/${provider}/callback`)
  url.search = new URL(req.url).search
  const state = url.searchParams.get('state')
  const jar = await cookies()
  insist(
    state && same(state, jar.get('udrive_oauth')?.value ?? ''),
    403,
    'Invalid sign-in attempt.',
  )
  const [a] = await query(
    'DELETE FROM oauth_attempts WHERE state_hash=$1 AND provider=$2 AND expires_at>now() RETURNING *',
    [digest(state), provider],
  )
  insist(a, 403, 'Sign-in expired.')
  jar.delete('udrive_oauth')
  const conf = await configuration(provider)
  const tokens = await oidc.authorizationCodeGrant(conf, url, {
    expectedState: state,
    ...(provider === 'google'
      ? {
          expectedNonce: a.nonce,
          pkceCodeVerifier: a.verifier,
          idTokenExpected: true,
        }
      : {}),
  })
  let identity: {
    subject: string
    name: string
    email: string
    verified: boolean
  }
  if (provider === 'google') {
    const c = tokens.claims()
    insist(c && c.email_verified === true, 403, 'A verified email is required.')
    identity = {
      subject: c.sub,
      name: String(c.name || 'Traveller').slice(0, 100),
      email: email.parse(c.email),
      verified: true,
    }
  } else {
    const r = await fetch(
      `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION}/me?fields=id,name,email`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(8000),
      },
    )
    insist(r.ok, 401, 'Provider verification failed.')
    const p = z
      .object({ id: z.string().min(1), name: z.string().max(100), email })
      .parse(await r.json())
    identity = { subject: p.id, name: p.name, email: p.email, verified: false }
  }
  const s = await tx(async (sql) => {
    const [linked] = await sql.rows(
      'SELECT o.user_id,u.enabled FROM oauth_identities o JOIN users u ON u.id=o.user_id WHERE o.provider=$1 AND o.subject=$2',
      [provider, identity.subject],
    )
    let id = linked?.user_id
    if (linked) insist(linked.enabled, 403, 'Account unavailable.')
    else {
      insist(
        !(
          await sql.rows('SELECT id FROM users WHERE email=$1', [
            identity.email,
          ])
        ).length,
        409,
        'Sign in using your existing account method.',
      )
      id = await createIdentity(
        sql,
        identity.name,
        identity.email,
        null,
        identity.verified,
      )
      await sql.rows(
        'INSERT INTO oauth_identities(provider,subject,user_id) VALUES($1,$2,$3)',
        [provider, identity.subject, id],
      )
    }
    return newSession(sql, id, false)
  })
  await issueSession(s)
  return Response.redirect(`${publicOrigin()}/account`, 303)
}
