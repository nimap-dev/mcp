export const HIDDEN = '[hidden]'

export const objectTypes = {
  device: {
    model: 'deviceModel',
    manufacturer: 'manufacturer',
    deviceType: 'deviceType',
  },
  deviceModel: { manufacturer: 'manufacturer', deviceType: 'deviceType' },
  deviceType: {},
  manufacturer: {},
  location: {},
  building: {},
} as const satisfies Record<string, Record<string, string>>

export type ObjectType = keyof typeof objectTypes

export type BlacklistConfig = {
  fields: string[]
  objectFields: Partial<Record<ObjectType, string[]>>
  objectTypes: ObjectType[]
}

export function isHidden(blacklist: BlacklistConfig, type: ObjectType) {
  return blacklist.objectTypes.includes(type)
}

export function filterObject(
  blacklist: BlacklistConfig,
  type: ObjectType,
  value: unknown,
): unknown {
  if (isHidden(blacklist, type)) return HIDDEN
  if (typeof value !== 'object' || value === null) return value

  const nested: Partial<Record<string, ObjectType>> = objectTypes[type]
  const hiddenFields = [
    ...blacklist.fields,
    ...(blacklist.objectFields[type] ?? []),
  ]

  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => {
      if (hiddenFields.includes(key)) return [key, HIDDEN]
      const nestedType = nested[key]
      return [
        key,
        nestedType ? filterObject(blacklist, nestedType, field) : field,
      ]
    }),
  )
}
