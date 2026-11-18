import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { Config } from '../config.ts'
import {
  HIDDEN_NOTE,
  idSchema,
  statusEnum,
  statusSchema,
  toolResult,
} from './result.ts'

export function registerDeviceTools(
  server: McpServer,
  api: ApiClient,
  { blacklist, allowWrite }: Config,
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

  if (!allowWrite) return

  server.registerTool(
    'create_device',
    {
      title: 'Create device',
      description: `Documents a new network device. Only fill in values the user gave you; never make up a serial number, address or other detail. Returns the created device. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        name: z.string().min(1),
        status: statusEnum,
        deviceModelId: z
          .string()
          .optional()
          .describe(
            'Exactly one of deviceModelId and deviceTypeId; the type then comes from the model.',
          ),
        deviceTypeId: z
          .string()
          .optional()
          .describe(
            'Exactly one of deviceModelId and deviceTypeId; for a device without a model.',
          ),
        code: z
          .string()
          .optional()
          .describe(
            'Leave it out to get the next free code of the device type, such as SW-004.',
          ),
        hostname: z.string().optional().describe('DNS name.'),
        managementIp: z
          .string()
          .optional()
          .describe('One IPv4 or IPv6 address the device is managed on.'),
        serialNumber: z.string().optional(),
        inventoryNumber: z.string().optional(),
        physicalLabel: z
          .string()
          .optional()
          .describe('What is actually written on the device.'),
        notes: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (body) =>
      toolResult(blacklist, 'device', () => api.POST('/api/devices', { body })),
  )

  server.registerTool(
    'update_device_status',
    {
      title: 'Update device status',
      description: `Changes the lifecycle status of a device by its id: planned, active, decommissioned (taken out of service) or archived. Returns the updated device. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ id: idSchema, status: statusEnum }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    ({ id, status }) =>
      toolResult(blacklist, 'device', () =>
        api.PATCH('/api/devices/{id}/status', {
          params: { path: { id } },
          body: { status },
        }),
      ),
  )

  server.registerTool(
    'delete_device',
    {
      title: 'Delete device',
      description:
        'Permanently deletes a device by its id. Its code is not handed out again. A device that was taken out of service should be marked decommissioned instead of deleted.',
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'device', () =>
        api.DELETE('/api/devices/{id}', { params: { path: { id } } }),
      ),
  )
}
