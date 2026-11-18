import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { BlacklistConfig } from '../blacklist.ts'
import { HIDDEN_NOTE, idSchema, toolResult } from './result.ts'

export function registerManufacturerTools(
  server: McpServer,
  api: ApiClient,
  blacklist: BlacklistConfig,
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
}
