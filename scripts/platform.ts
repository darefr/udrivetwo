import { database, initialize, localMode } from '../lib/platform/database'
import { ownerSetupToken } from '../lib/platform/bootstrap'
import { runJobs } from '../lib/platform/notifications'
async function main() {
  const command = process.argv[2]
  if (command === 'check') {
    const required = ['DATABASE_URL', 'APP_ORIGIN', 'CRON_SECRET']
    if (process.env.PAYMENT_PROVIDER === 'khalti')
      required.push('KHALTI_SECRET_KEY')
    if (process.env.WHATSAPP_ACCESS_TOKEN)
      required.push(
        'WHATSAPP_GRAPH_VERSION',
        'WHATSAPP_TEMPLATE',
        'WHATSAPP_PHONE_NUMBER_ID',
      )
    if (process.env.SMTP_URL) required.push('EMAIL_FROM')
    for (const p of ['GOOGLE', 'FACEBOOK'])
      if (process.env[p + '_CLIENT_ID']) required.push(p + '_CLIENT_SECRET')
    const missing = required.filter((k) => !process.env[k])
    if (missing.length)
      throw new Error('Missing configuration: ' + missing.join(', '))
    if (new URL(process.env.APP_ORIGIN!).protocol !== 'https:')
      throw new Error('APP_ORIGIN must use HTTPS')
    if (process.env.CRON_SECRET!.length < 32)
      throw new Error('Use a random CRON_SECRET of at least 32 characters')
    if (process.env.SMTP_URL && !process.env.SMTP_URL.startsWith('smtps://'))
      throw new Error('Use encrypted smtps:// transport')
    console.log(
      'Production configuration checked. Live provider deliveries are not tested.',
    )
    return
  }
  const db = await database()
  try {
    if (command === 'migrate') {
      await initialize(db)
      console.log('Schema version 2 installed; existing records preserved.')
    } else if (command === 'jobs') {
      console.log(await runJobs())
    } else if (command === 'owner') {
      if (!localMode())
        throw new Error('Use the protected /admin/setup page in production.')
      await ownerSetupToken()
      console.log(
        'Owner code prepared in the private development directory. Visit /admin/setup after signing in.',
      )
    } else throw new Error('Unknown maintenance command')
  } finally {
    await db.close()
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Maintenance failed')
  process.exitCode = 1
})
