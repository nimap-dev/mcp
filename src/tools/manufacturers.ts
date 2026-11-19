import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { Config } from '../config.ts'
import {
  HIDDEN_NOTE,
  idSchema,
  textSchema,
  toolResult,
  UPDATE_NOTE,
  clearSchema,
  mergeChanges,
} from './result.ts'

export function registerManufacturerTools(
  server: McpServer,
  api: ApiClient,
  { blacklist, allowWrite }: Config,
) {
  server.registerTool(
    'list_manufacturers',
    {
      title: 'List manufacturers',
      description: `Lists manufacturers of device models with their name and website. ${HIDDEN_NOTE}`,
      annotations: { readOnlyHint: true },
    },
    () =>
      toolResult(blacklist, 'manufacturer', () =>
        api.GET('/api/manufacturers'),
      ),
  )

  server.registerTool(
    'get_manufacturer',
    {
      title: 'Get manufacturer',
      description: `Returns one manufacturer by its id. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'manufacturer', () =>
        api.GET('/api/manufacturers/{id}', { params: { path: { id } } }),
      ),
  )

  if (!allowWrite) return

  const fields = {
    website: textSchema.optional(),
    notes: textSchema.optional(),
  }

  server.registerTool(
    'create_manufacturer',
    {
      title: 'Create manufacturer',
      description: `Documents a new manufacturer of device models. Only fill in values the user gave you. Returns the created manufacturer. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ name: textSchema.min(1), ...fields }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (body) =>
      toolResult(blacklist, 'manufacturer', () =>
        api.POST('/api/manufacturers', { body }),
      ),
  )

  server.registerTool(
    'update_manufacturer',
    {
      title: 'Update manufacturer',
      description: `Changes a manufacturer by its id. ${UPDATE_NOTE} Returns the updated manufacturer. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        id: idSchema,
        name: textSchema.min(1).optional(),
        ...fields,
        clear: clearSchema(fields),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    ({ id, clear, ...changes }) =>
      toolResult(blacklist, 'manufacturer', async () => {
        const current = await api.GET('/api/manufacturers/{id}', {
          params: { path: { id } },
        })
        if (!current.data) return current
        const { name, website, notes } = current.data
        return api.PUT('/api/manufacturers/{id}', {
          params: { path: { id } },
          body: mergeChanges({ name, website, notes }, changes, clear),
        })
      }),
  )

  server.registerTool(
    'delete_manufacturer',
    {
      title: 'Delete manufacturer',
      description: 'Permanently deletes a manufacturer by its id.',
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'manufacturer', () =>
        api.DELETE('/api/manufacturers/{id}', { params: { path: { id } } }),
      ),
  )
}
