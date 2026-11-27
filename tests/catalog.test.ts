import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { database, tx, query } from '../lib/platform/database'
import { createIdentity } from '../lib/platform/identity'
import { saveImage, imageStorage } from '../lib/platform/storage'
import { vehicles } from '../lib/platform/catalog'
import { adminWrite } from '../lib/platform/admin'
import type { Principal } from '../lib/platform/contracts'
test('uploaded gallery, newly added unit, database edits, archive and validation persist', async () => {
  delete process.env.DATABASE_URL
  delete process.env.VERCEL_ENV
  process.env.UDRIVE_MODE = 'test'
  process.env.UDRIVE_DATA_DIR = await mkdtemp(join(tmpdir(), 'udrive-gallery-'))
  const db = await database()
  try {
    const id = await tx((sql) =>
      createIdentity(sql, 'Fleet Operator', 'fleet@example.test', null),
    )
    const user: Principal = {
      id,
      name: 'Fleet Operator',
      email: 'fleet@example.test',
      email_verified: true,
      role: 'FLEET_MANAGER',
      customer_id: (
        await query('SELECT id FROM customers WHERE user_id=$1', [id])
      )[0].id,
      phone: '',
    }
    const photo = await saveImage(await readFile('public/favicon.png'), user)
    const bytes = await imageStorage.get(photo.path.split('/').pop()!)
    assert(bytes && Buffer.from(bytes).toString('ascii', 8, 12) === 'WEBP')
    await assert.rejects(saveImage(Buffer.from('not an image'), user))
    const v = {
      slug: 'test-unit',
      name: 'Test unit',
      brand: 'U Drive',
      model: 'Test',
      location: 'kathmandu',
      daily_rate: 6500,
      self_rate: null,
      driver_rate: 9000,
      available: true,
      active: true,
      featured: false,
      popular: false,
      sort_order: 15,
      bodyType: 'SUV',
      tier: 'Standard',
      seats: 5,
      doors: 5,
      transmission: 'Automatic',
      fuel: 'Electric',
      overview: 'Test rental vehicle.',
      features: ['Five seats'],
      modes: ['self-drive', 'with-driver'],
      gallery: [{ image: photo.path, label: 'Catalog test photo' }],
    }
    await adminWrite('vehicles', undefined, v, user, 'POST')
    assert.equal(
      (await vehicles()).find((car) => car.slug === v.slug)?.image,
      photo.path,
    )
    await adminWrite(
      'vehicles',
      v.slug,
      { ...v, daily_rate: 7000 },
      user,
      'PATCH',
    )
    assert.equal(
      (await vehicles()).find((car) => car.slug === v.slug)?.dailyRate,
      7000,
    )
    await adminWrite('vehicles', v.slug, {}, user, 'DELETE')
    assert(!(await vehicles()).some((car) => car.slug === v.slug))
    assert((await vehicles(true)).some((car) => car.slug === v.slug))
    await assert.rejects(
      adminWrite(
        'pricing',
        'missing',
        { daily_rate: 100, self_rate: null, driver_rate: null },
        user,
        'PATCH',
      ),
    )
  } finally {
    await db.close()
  }
})
