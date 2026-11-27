import { cookies } from 'next/headers'
import { z } from 'zod'
import { audit, localMode, query, settings, tx, type Sql } from './database'
import {
  email,
  insist,
  password,
  phone,
  text,
  type Principal,
} from './contracts'
import {
  digest,
  token,
  same,
  publicOrigin,
  hashPassword,
  checkPassword,
  newSession,
  issueSession,
  logout,
  rateLimit,
} from './security'
import { enqueue, notify } from './notifications'
export async function createIdentity(
  sql: Sql,
  name: string,
  address: string,
  hash: string | null,
  verified = false,
) {
  const [u] = await sql.rows(
    'INSERT INTO users(name,email,password_hash,email_verified,terms_at) VALUES($1,$2,$3,$4,now()) RETURNING id',
    [name, address, hash, verified],
  )
  const [c] = await sql.rows(
    'INSERT INTO customers(user_id,name,email) VALUES($1,$2,$3) RETURNING id',
    [u.id, name, address],
  )
  await notify(
    sql,
    { permission: 'customers' },
    'CUSTOMER',
    'New customer',
    `${name} created a U Drive account.`,
    `/admin?tab=customers&id=${c.id}`,
  )
  const cfg = await settings(sql)
  if (cfg.emailEnabled)
    await enqueue(
      sql,
      'email',
      cfg.email ||
        process.env.ADMIN_EMAIL ||
        (localMode() ? 'desk@udrive.test' : ''),
      'CUSTOMER',
      'New U Drive customer',
      `${name} created an account.`,
    )
  await audit(sql, u.id, 'ACCOUNT_CREATED', 'customer', c.id)
  return u.id as string
}
async function sendToken(
  sql: Sql,
  id: string,
  purpose: 'reset' | 'email' | 'verify',
  target: string,
) {
  const raw = token()
  await sql.rows(
    'DELETE FROM verification_tokens WHERE user_id=$1 AND purpose=$2',
    [id, purpose],
  )
  await sql.rows(
    "INSERT INTO verification_tokens(token_hash,user_id,purpose,target,expires_at) VALUES($1,$2,$3,$4,now()+interval '30 minutes')",
    [digest(raw), id, purpose, target],
  )
  const label =
    purpose === 'reset' ? 'Reset your password' : 'Verify your email address'
  await enqueue(
    sql,
    'email',
    target,
    purpose,
    label,
    `${label} for your U Drive account. This single-use link expires in 30 minutes.\n\n${publicOrigin()}/${purpose === 'reset' ? 'reset-password' : 'verify-email'}#token=${raw}\n\nIf you did not request this, ignore this message.`,
  )
}
export async function authAction(
  action: string,
  data: unknown,
  user: Principal | null,
) {
  if (action === 'register') {
    const d = z
      .object({ name: text(2, 100), email, password, terms: z.literal(true) })
      .strict()
      .parse(data)
    await rateLimit('register:' + d.email, 4, 3600)
    const hash = await hashPassword(d.password)
    const s = await tx(async (sql) => {
      const id = await createIdentity(sql, d.name, d.email, hash)
      await sendToken(sql, id, 'verify', d.email)
      return newSession(sql, id, false)
    })
    await issueSession(s)
    return { redirect: '/account' }
  }
  if (action === 'login') {
    const d = z
      .object({
        email,
        password: z.string().min(1).max(128),
        remember: z.boolean().default(false),
      })
      .strict()
      .parse(data)
    await rateLimit('login:' + d.email, 12, 900)
    const [u] = await query(
      'SELECT u.* FROM users u JOIN customers c ON c.user_id=u.id WHERE u.email=$1 AND u.enabled AND c.enabled',
      [d.email],
    )
    const ok = await checkPassword(d.password, u?.password_hash)
    insist(ok && u, 401, 'Email or password is incorrect.')
    const s = await tx((sql) => newSession(sql, u.id, d.remember))
    await issueSession(s)
    return { redirect: u.role === 'CUSTOMER' ? '/account' : '/admin' }
  }
  if (action === 'logout') {
    await logout()
    return { redirect: '/sign-in' }
  }
  if (action === 'forgot') {
    const d = z.object({ email }).parse(data)
    await rateLimit('reset:' + d.email, 4, 3600)
    await tx(async (sql) => {
      const [u] = await sql.rows(
        'SELECT id FROM users WHERE email=$1 AND enabled',
        [d.email],
      )
      if (u) await sendToken(sql, u.id, 'reset', d.email)
    })
    return {
      message: 'If this address has an account, a reset link has been queued.',
    }
  }
  if (action === 'reset' || action === 'verify') {
    const d = z
      .object({ token: z.string().length(43), password: password.optional() })
      .parse(data)
    const hash =
      action === 'reset' ? await hashPassword(password.parse(d.password)) : null
    await tx(async (sql) => {
      const [t] = await sql.rows(
        'DELETE FROM verification_tokens WHERE token_hash=$1 AND expires_at>now() AND purpose=ANY($2::text[]) RETURNING *',
        [digest(d.token), action === 'reset' ? ['reset'] : ['email', 'verify']],
      )
      insist(t, 400, 'This link is invalid or expired. Request a new one.')
      if (hash) {
        await sql.rows('UPDATE users SET password_hash=$2 WHERE id=$1', [
          t.user_id,
          hash,
        ])
        await sql.rows('DELETE FROM sessions WHERE user_id=$1', [t.user_id])
      } else {
        await sql.rows(
          'UPDATE users SET email=$2,email_verified=true WHERE id=$1',
          [t.user_id, t.target],
        )
        await sql.rows('UPDATE customers SET email=$2 WHERE user_id=$1', [
          t.user_id,
          t.target,
        ])
        if (t.purpose === 'email')
          await sql.rows('DELETE FROM sessions WHERE user_id=$1', [t.user_id])
      }
      await sql.rows('DELETE FROM verification_tokens WHERE user_id=$1', [
        t.user_id,
      ])
      await audit(
        sql,
        t.user_id,
        hash ? 'PASSWORD_RESET' : 'EMAIL_VERIFIED',
        'user',
        t.user_id,
      )
    })
    return {
      message: hash
        ? 'Password reset. Sign in with your new password.'
        : 'Email verified. You can now sign in.',
    }
  }
  insist(user, 401, 'Sign in to manage your account.')
  if (action === 'profile') {
    const d = z
      .object({ name: text(2, 100), phone: z.union([phone, z.literal('')]) })
      .strict()
      .parse(data)
    await tx(async (sql) => {
      await sql.rows('UPDATE users SET name=$2 WHERE id=$1', [user.id, d.name])
      await sql.rows('UPDATE customers SET name=$2,phone=$3 WHERE user_id=$1', [
        user.id,
        d.name,
        d.phone,
      ])
      await audit(sql, user.id, 'PROFILE_UPDATED', 'user', user.id)
    })
    return { message: 'Profile updated.' }
  }
  if (action === 'verify-again') {
    await rateLimit('verify:' + user.id, 4, 3600)
    await tx((sql) => sendToken(sql, user.id, 'verify', user.email))
    return { message: 'Verification link queued.' }
  }
  if (action === 'password' || action === 'email') {
    const d = z
      .object({
        current: z.string().min(1).max(128),
        password: password.optional(),
        email: email.optional(),
      })
      .parse(data)
    const [u] = await query('SELECT password_hash FROM users WHERE id=$1', [
      user.id,
    ])
    insist(
      await checkPassword(d.current, u.password_hash),
      403,
      'Your current password could not be verified.',
    )
    if (action === 'email') {
      const target = email.parse(d.email)
      await tx((sql) => sendToken(sql, user.id, 'email', target))
      return {
        message: 'Verify the link at your new address to complete the change.',
      }
    }
    const h = await hashPassword(password.parse(d.password))
    await tx(async (sql) => {
      await sql.rows('UPDATE users SET password_hash=$2 WHERE id=$1', [
        user.id,
        h,
      ])
      await sql.rows('DELETE FROM sessions WHERE user_id=$1', [user.id])
      await sql.rows('DELETE FROM verification_tokens WHERE user_id=$1', [
        user.id,
      ])
      await audit(sql, user.id, 'PASSWORD_CHANGED', 'user', user.id)
    })
    return { redirect: '/sign-in' }
  }
  if (action === 'bootstrap') {
    const d = z.object({ code: z.string().min(32).max(256) }).parse(data)
    const { ownerSetupToken } = await import('./bootstrap')
    const secret = await ownerSetupToken()
    insist(secret && same(d.code, secret), 403, 'Invalid setup authorization.')
    const elevated = await tx(async (sql) => {
      await sql.rows('SELECT pg_advisory_xact_lock(862006)')
      insist(
        !(
          await sql.rows(
            "SELECT id FROM users WHERE role='SUPER_ADMIN' LIMIT 1",
          )
        ).length,
        409,
        'An owner already exists.',
      )
      await sql.rows("INSERT INTO installations(name) VALUES('owner')")
      await sql.rows("UPDATE users SET role='SUPER_ADMIN' WHERE id=$1", [
        user.id,
      ])
      await audit(sql, user.id, 'OWNER_BOOTSTRAPPED', 'user', user.id)
      await sql.rows('DELETE FROM sessions WHERE user_id=$1', [user.id])
      return newSession(sql, user.id, false)
    })
    await issueSession(elevated)
    return { redirect: '/admin' }
  }
  if (action === 'claim') {
    const raw = (await cookies()).get('udrive_claim')?.value
    insist(raw, 404, 'No guest request to link.')
    await tx(async (sql) => {
      const b = await sql.rows(
        'UPDATE bookings SET customer_id=$1,guest_claim_hash=NULL WHERE guest_claim_hash=$2 AND lower(contact_email)=$3 RETURNING id',
        [user.customer_id, digest(raw), user.email],
      )
      insist(
        b.length,
        404,
        'Sign in with the address used for your guest request.',
      )
      await notify(
        sql,
        { user: user.id },
        'LINKED',
        'Guest booking linked',
        b[0].id,
        `/account?tab=bookings&id=${b[0].id}`,
        b[0].id,
      )
    })
    ;(await cookies()).delete('udrive_claim')
    return { message: 'Booking linked to your account.' }
  }
  throw new Error('Unknown account action')
}
