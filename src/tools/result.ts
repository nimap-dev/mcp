import type { CallToolResult } from '@modelcontextprotocol/server'
import * as z from 'zod'
import {
  filterObject,
  HIDDEN,
  isHidden,
  type BlacklistConfig,
  type ObjectType,
} from '../blacklist.ts'

export const HIDDEN_NOTE =
  'Fields shown as "[hidden]" exist but are hidden by configuration; never guess their value.'

export const statusEnum = z.enum([
  'planned',
  'active',
  'decommissioned',
  'archived',
])

export const statusSchema = z
  .array(statusEnum)
  .optional()
  .describe('Lifecycle statuses to include. Defaults to planned and active.')

export const idSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'id must be a UUID',
  )
  .describe('The id (UUID) of the object.')

export const textSchema = z.string().refine((value) => value !== HIDDEN, {
  message: `"${HIDDEN}" only marks a hidden value; leave the field out to keep it`,
})

export const UPDATE_NOTE =
  'Send only the fields to change; left out fields keep their value. To empty optional fields, list them in clear.'

export function clearSchema<T extends object>(fields: T) {
  const names = Object.keys(fields) as [
    Extract<keyof T, string>,
    ...Extract<keyof T, string>[],
  ]
  return z.array(z.enum(names)).optional().describe('Optional fields to empty.')
}

export function mergeChanges<T extends object, C extends object>(
  current: T,
  changes: C,
  clear: readonly string[] = [],
) {
  const merged = { ...current, ...changes }
  return Object.fromEntries(
    Object.entries(merged).filter(([field]) => !clear.includes(field)),
  ) as typeof merged
}

function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text }] }
}

export async function toolResult(
  blacklist: BlacklistConfig,
  type: ObjectType,
  request: () => Promise<{
    data?: unknown
    error?: {
      detail?: string
      errors?: { location?: string; message?: string }[] | null
    }
    response: Response
  }>,
): Promise<CallToolResult> {
  if (isHidden(blacklist, type)) {
    return errorResult(`Objects of type ${type} are hidden by configuration.`)
  }

  const { data, error, response } = await request()
  if (!response.ok) {
    const details = (error?.errors ?? []).map(
      (e) => `\n- ${e.location ?? ''}: ${e.message ?? ''}`,
    )
    return errorResult(
      `nimap API error ${response.status}: ${error?.detail ?? response.statusText}${details.join('')}`,
    )
  }

  if (data === undefined) {
    return { content: [{ type: 'text', text: 'Done.' }] }
  }

  const filtered = Array.isArray(data)
    ? data.map((item) => filterObject(blacklist, type, item))
    : filterObject(blacklist, type, data)
  return {
    content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
  }
}
