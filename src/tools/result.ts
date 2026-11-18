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

export const statusSchema = z
  .array(z.enum(['planned', 'active', 'decommissioned', 'archived']))
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
    error?: { detail?: string }
    response: Response
  }>,
): Promise<CallToolResult> {
  if (isHidden(blacklist, type)) {
    return errorResult(`Objects of type ${type} are hidden by configuration.`)
  }

  const { data, error, response } = await request()
  if (data === undefined) {
    return errorResult(
      `nimap API error ${response.status}: ${error?.detail ?? response.statusText}`,
    )
  }

  const filtered = Array.isArray(data)
    ? data.map((item) => filterObject(blacklist, type, item))
    : filterObject(blacklist, type, data)
  return {
    content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
  }
}
