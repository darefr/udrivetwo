import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fleet, destinations } from '../rental-data'

export type Row = Record<string, any>
export interface Sql {
  rows<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>
}
export interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>
  close(): Promise<void>
}
export const localMode = () =>
  !process.env.VERCEL_ENV?.match(/^production$/) &&
  (process.env.NODE_ENV !== 'production' || process.env.UDRIVE_MODE === 'test')
export const devDirectory = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.UDRIVE_DATA_DIR || '.udrive',
  )
const globals = globalThis as typeof globalThis & {
  udriveDatabase?: Promise<Database>
  udriveLocalSchema?: number
}
export const defaultSettings = {
  company: 'U Drive Car Rental Kathmandu',
  email: '',
  whatsapp: '+9779800899505',
  hours: 'Contact the Kathmandu desk to arrange a handover.',
  currency: 'NPR',
  deliveryFee: 0,
  extraFee: 0,
  maxDays: 365,
  holdHours: 48,
  policies:
    'The rental desk confirms identification, deposit and handover requirements.',
  cancellation:
    'Contact the desk before pickup. The terms agreed for your rental apply.',
  emailEnabled: true,
  whatsappEnabled: true,
  assistantEnabled: true,
}
export async function initialize(db: Database) {
  await db.transaction(async (tx) => {
    await tx.rows('SELECT pg_advisory_xact_lock(862005)')
    const [r] = await tx.rows(
      "SELECT to_regclass('public.schema_versions')::text AS installed",
    )
    const addReceipts = async () => {
      await tx.rows(
        await readFile(
          path.join(process.cwd(), 'db', '002_receipts.sql'),
          'utf8',
        ),
      )
      await tx.rows('INSERT INTO schema_versions(version) VALUES(2)')
    }
    if (r.installed) {
      const [version] = await tx.rows(
        'SELECT max(version) AS v FROM schema_versions',
      )
      if (version.v === 1) await addReceipts()
      else if (version.v !== 2)
        throw new Error('Unsupported U Drive schema version')
      return
    }
    const schema = await readFile(
      path.join(process.cwd(), 'db', '001_platform.sql'),
      'utf8',
    )
    await tx.rows(schema)
    await addReceipts()
    const areas = [
      ...destinations.map((d) => ({ slug: d.slug, name: d.name, details: d })),
      ...['Bhaktapur', 'Lalitpur', 'Other location in Nepal'].map((name) => ({
        slug: name.toLowerCase().replaceAll(' ', '-'),
        name,
        details: {},
      })),
    ]
    for (const [i, d] of areas.entries())
      await tx.rows(
        'INSERT INTO locations(slug,name,details,sort_order) VALUES($1,$2,$3,$4)',
        [d.slug, d.name, JSON.stringify(d.details), i],
      )
    for (const [i, v] of fleet.entries()) {
      const { slug, name, dailyRate, gallery, availability, image, ...specs } =
        v
      await tx.rows(
        'INSERT INTO vehicles(slug,name,brand,model,specs,location,daily_rate,available,featured,popular,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,true,$9)',
        [
          slug,
          name,
          name.split(' ')[0],
          name.split(' ').slice(1).join(' '),
          JSON.stringify({ ...specs, doors: 5 }),
          'kathmandu',
          dailyRate,
          availability !== 'Unavailable',
          i,
        ],
      )
      for (const [n, img] of gallery.entries())
        await tx.rows(
          'INSERT INTO vehicle_images(vehicle_id,path,label,sort_order) VALUES($1,$2,$3,$4)',
          [slug, img.image, img.label, n],
        )
    }
    await tx.rows('INSERT INTO settings(id,value) VALUES(1,$1)', [
      JSON.stringify(defaultSettings),
    ])
  })
}
async function connect(): Promise<Database> {
  let db: Database
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 15000,
      ...(process.env.DATABASE_CA
        ? {
            ssl: {
              ca: process.env.DATABASE_CA.replaceAll('\\n', '\n'),
              rejectUnauthorized: true,
            },
          }
        : {}),
    })
    const wrap = (c: { query: Function }): Sql => ({
      async rows(s, p) {
        const result = await c.query(s, p)
        return result.rows ?? []
      },
    })
    db = {
      ...wrap(pool),
      async transaction(fn) {
        const c = await pool.connect()
        try {
          await c.query('BEGIN')
          const result = await fn(wrap(c))
          await c.query('COMMIT')
          return result
        } catch (e) {
          await c.query('ROLLBACK')
          throw e
        } finally {
          c.release()
        }
      },
      close: () => pool.end(),
    }
    if (process.env.UDRIVE_MIGRATE === '1') await initialize(db)
  } else {
    if (!localMode())
      throw new Error(
        'Set DATABASE_URL and run the database migration before serving production traffic.',
      )
    const { PGlite } = await import('@electric-sql/pglite')
    const directory = devDirectory()
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const engine = new PGlite(path.join(directory, 'postgres'))
    const wrap = (c: { query: Function; exec: Function }): Sql => ({
      async rows(s, p) {
        if (!p && s.includes('CREATE TABLE schema_versions')) {
          await c.exec(s)
          return []
        }
        return (await c.query(s, p)).rows
      },
    })
    db = {
      ...wrap(engine),
      transaction: (fn) => engine.transaction((tx) => fn(wrap(tx))),
      close: () => engine.close(),
    }
    await initialize(db)
  }
  return db
}
export function database() {
  if (
    !process.env.DATABASE_URL &&
    localMode() &&
    globals.udriveLocalSchema !== 2
  ) {
    globals.udriveLocalSchema = 2
    if (globals.udriveDatabase)
      globals.udriveDatabase = globals.udriveDatabase
        .then(async (db) => {
          await initialize(db)
          return db
        })
        .catch((e) => {
          delete globals.udriveDatabase
          throw e
        })
  }
  return (globals.udriveDatabase ??= connect().catch((e) => {
    delete globals.udriveDatabase
    throw e
  }))
}
export async function query<T extends Row = Row>(
  sql: string,
  values: unknown[] = [],
) {
  return (await database()).rows<T>(sql, values)
}
export async function tx<T>(fn: (sql: Sql) => Promise<T>) {
  return (await database()).transaction(fn)
}
export async function settings(sql?: Sql): Promise<typeof defaultSettings> {
  const [r] = await (sql ?? (await database())).rows(
    'SELECT value FROM settings WHERE id=1',
  )
  return { ...defaultSettings, ...r.value }
}
export async function audit(
  sql: Sql,
  actor: string | null,
  action: string,
  entity: string,
  id: string | null,
  detail: Row = {},
) {
  await sql.rows(
    'INSERT INTO activity_log(actor_id,action,entity,entity_id,detail) VALUES($1,$2,$3,$4,$5)',
    [actor, action, entity, id, JSON.stringify(detail)],
  )
}
