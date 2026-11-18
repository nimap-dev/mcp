import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { BlacklistConfig } from '../blacklist.ts'
import { HIDDEN_NOTE, idSchema, statusSchema, toolResult } from './result.ts'

export function registerDeviceModelTools(
  server: McpServer,
  api: ApiClient,
  blacklist: BlacklistConfig,
) {
  server.registerTool(
    'list_device_models',
    {
      title: 'List device models',
      description: `Lists device models (the catalog of products devices are instances of) with manufacturer, type, part number, mounting, size, power and PoE, and end of sale and support dates. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        status: statusSchema,
        deviceTypeId: z
          .string()
          .optional()
          .describe('Only models of this device type.'),
        manufacturerId: z
          .string()
          .optional()
          .describe('Only models made by this manufacturer.'),
        mounting: z
          .enum([
            'rack',
            'wall',
            'desktop',
            'din_rail',
            'ceiling',
            'pole',
            'embedded',
            'other',
          ])
          .optional()
          .describe('Only models mounted this way.'),
      }),
      annotations: { readOnlyHint: true },
    },
    (query) =>
      toolResult(blacklist, 'deviceModel', () =>
        api.GET('/api/device-models', { params: { query } }),
      ),
  )

  server.registerTool(
    'get_device_model',
    {
      title: 'Get device model',
      description: `Returns one device model by its id, with all its documented details. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'deviceModel', () =>
        api.GET('/api/device-models/{id}', { params: { path: { id } } }),
      ),
  )
}
