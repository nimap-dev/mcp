import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod'
import type { ApiClient } from '../api/client.ts'
import type { Config } from '../config.ts'
import {
  HIDDEN_NOTE,
  idSchema,
  statusEnum,
  statusSchema,
  textSchema,
  toolResult,
  UPDATE_NOTE,
  clearSchema,
  mergeChanges,
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

  const fields = {
    hostname: textSchema.optional().describe('DNS name.'),
    managementIp: textSchema
      .optional()
      .describe('One IPv4 or IPv6 address the device is managed on.'),
    serialNumber: textSchema.optional(),
    inventoryNumber: textSchema.optional(),
    physicalLabel: textSchema
      .optional()
      .describe('What is actually written on the device.'),
    notes: textSchema.optional(),
  }
  const deviceModelId = idSchema.describe(
    'Exactly one of deviceModelId and deviceTypeId; the type then comes from the model.',
  )
  const deviceTypeId = idSchema.describe(
    'Exactly one of deviceModelId and deviceTypeId; for a device without a model.',
  )

  server.registerTool(
    'create_device',
    {
      title: 'Create device',
      description: `Documents a new network device. Only fill in values the user gave you; never make up a serial number, address or other detail. Returns the created device. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        name: textSchema.min(1),
        status: statusEnum,
        deviceModelId: deviceModelId.optional(),
        deviceTypeId: deviceTypeId.optional(),
        code: textSchema
          .optional()
          .describe(
            'Leave it out to get the next free code of the device type, such as SW-004.',
          ),
        ...fields,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (body) =>
      toolResult(blacklist, 'device', () => api.POST('/api/devices', { body })),
  )

  server.registerTool(
    'update_device',
    {
      title: 'Update device',
      description: `Changes a device by its id. ${UPDATE_NOTE} Setting deviceModelId or deviceTypeId replaces the current model or type. Use update_device_status to change its status. Returns the updated device. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        id: idSchema,
        name: textSchema.min(1).optional(),
        code: textSchema
          .min(1)
          .optional()
          .describe('Short code such as SW-001.'),
        deviceModelId: deviceModelId.optional(),
        deviceTypeId: deviceTypeId.optional(),
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
      toolResult(blacklist, 'device', async () => {
        const current = await api.GET('/api/devices/{id}', {
          params: { path: { id } },
        })
        if (!current.data) return current
        const {
          code,
          name,
          physicalLabel,
          serialNumber,
          inventoryNumber,
          managementIp,
          hostname,
          notes,
          model,
          deviceType,
        } = current.data
        const kind =
          changes.deviceModelId || changes.deviceTypeId
            ? {}
            : model
              ? { deviceModelId: model.id }
              : { deviceTypeId: deviceType.id }
        return api.PUT('/api/devices/{id}', {
          params: { path: { id } },
          body: mergeChanges(
            {
              code,
              name,
              physicalLabel,
              serialNumber,
              inventoryNumber,
              managementIp,
              hostname,
              notes,
              ...kind,
            },
            changes,
            clear,
          ),
        })
      }),
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
