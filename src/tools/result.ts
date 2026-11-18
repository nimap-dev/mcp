import type { CallToolResult } from '@modelcontextprotocol/server'
import * as z from 'zod'
import {
  filterObject,
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
