import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterObject, HIDDEN, type BlacklistConfig } from './blacklist.ts'

const device = {
  id: 'd1',
  code: 'SW-0042',
  name: 'Core switch',
  serialNumber: 'HG1234',
  managementIp: '10.20.0.42',
  model: { id: 'm1', name: 'CRS326-24G-2S+', partNumber: 'CRS326' },
  manufacturer: { id: 'v1', name: 'MikroTik' },
  deviceType: { id: 't1', code: 'switch', name: 'Switch' },
}

function blacklist(overrides: Partial<BlacklistConfig>): BlacklistConfig {
  return { fields: [], objectFields: {}, objectTypes: [], ...overrides }
}

test('empty blacklist returns the object unchanged', () => {
  assert.deepEqual(filterObject(blacklist({}), 'device', device), device)
})

test('field hidden everywhere is replaced on the object and nested objects', () => {
  const result = filterObject(
    blacklist({ fields: ['serialNumber', 'partNumber'] }),
    'device',
    device,
  )
  assert.deepEqual(result, {
    ...device,
    serialNumber: HIDDEN,
    model: { ...device.model, partNumber: HIDDEN },
  })
})

test('field hidden for one type is kept on other types', () => {
  const result = filterObject(
    blacklist({ objectFields: { deviceModel: ['name'] } }),
    'device',
    device,
  )
  assert.deepEqual(result, {
    ...device,
    model: { ...device.model, name: HIDDEN },
  })
})

test('hidden field stays in the response even when missing a value', () => {
  const result = filterObject(
    blacklist({ fields: ['serialNumber'] }),
    'device',
    {
      ...device,
      serialNumber: null,
    },
  )
  assert.equal((result as typeof device).serialNumber, HIDDEN)
})

test('hidden nested object type is replaced as a whole', () => {
  const result = filterObject(
    blacklist({ objectTypes: ['manufacturer'] }),
    'device',
    device,
  )
  assert.deepEqual(result, { ...device, manufacturer: HIDDEN })
})

test('hidden top-level object type hides the whole object', () => {
  assert.equal(
    filterObject(blacklist({ objectTypes: ['device'] }), 'device', device),
    HIDDEN,
  )
})

test('does not modify the input', () => {
  const copy = structuredClone(device)
  filterObject(
    blacklist({ fields: ['serialNumber'], objectTypes: ['manufacturer'] }),
    'device',
    device,
  )
  assert.deepEqual(device, copy)
})
