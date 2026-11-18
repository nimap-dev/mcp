import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { BlacklistConfig } from '../blacklist.ts'
import { HIDDEN_NOTE, idSchema, statusSchema, toolResult } from './result.ts'

export function registerDeviceTools(
  server: McpServer,
  api: ApiClient,
  blacklist: BlacklistConfig,
) {
  server.registerTool(
    'list_devices',
    {
      title: 'List devices',
      description: `Lists documented network devices (switches, routers, access points, cameras...) with their code, name, type, model, manufacturer, hostname and management IP. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        status: statusSchema,
        deviceTypeId: z
          .string()
          .optional()
          .describe('Only devices of this device type.'),
        deviceModelId: z
          .string()
          .optional()
          .describe('Only devices of this model.'),
        manufacturerId: z
          .string()
          .optional()
          .describe('Only devices whose model this manufacturer makes.'),
      }),
      annotations: { readOnlyHint: true },
    },
    (query) =>
      toolResult(blacklist, 'device', () =>
        api.GET('/api/devices', { params: { query } }),
      ),
  )

  server.registerTool(
    'get_device',
    {
      title: 'Get device',
      description: `Returns one device by its id, with all its documented details. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'device', () =>
        api.GET('/api/devices/{id}', { params: { path: { id } } }),
      ),
  )
}
