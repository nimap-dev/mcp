import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'
import * as z from 'zod'
import { objectTypes, type ObjectType } from './blacklist.ts'

const ObjectTypeSchema = z.enum(
  Object.keys(objectTypes) as [ObjectType, ...ObjectType[]],
)

const ConfigSchema = z.strictObject({
  server: z.url(),
  apiKey: z.string().startsWith('nimap_'),
  allowWrite: z.boolean().default(false),
  blacklistBlocksWrite: z.boolean().default(false),
  blacklist: z
    .strictObject({
      fields: z.array(z.string()).default([]),
      objectFields: z
        .partialRecord(ObjectTypeSchema, z.array(z.string()))
        .default({}),
      objectTypes: z.array(ObjectTypeSchema).default([]),
    })
    .prefault({}),
})

export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(): Config {
  const { values } = parseArgs({ options: { config: { type: 'string' } } })
  if (!values.config) throw new Error('missing --config <path>')

  const result = ConfigSchema.safeParse(
    parse(readFileSync(values.config, 'utf8')),
  )
  if (!result.success) {
    throw new Error(
      `invalid config ${values.config}:\n${z.prettifyError(result.error)}`,
    )
  }
  return result.data
}
