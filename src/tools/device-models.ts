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

const mountingEnum = z.enum([
  'rack',
  'wall',
  'desktop',
  'din_rail',
  'ceiling',
  'pole',
  'embedded',
  'other',
])

const poeStandardEnum = z.enum(['af', 'at', 'bt', 'passive'])

export function registerDeviceModelTools(
  server: McpServer,
  api: ApiClient,
  { blacklist, allowWrite }: Config,
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
        mounting: mountingEnum
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

  if (!allowWrite) return

  const positive = z.int().min(1)
  const fields = {
    displayName: textSchema
      .optional()
      .describe(
        'A friendlier name shown instead of the model name, such as hAP ax² for C52iG-5HaxD2HaxD-TC.',
      ),
    variant: textSchema
      .optional()
      .describe('A hardware revision or variant, such as rev 2.'),
    partNumber: textSchema.optional(),
    mounting: mountingEnum.optional(),
    rackUnits: positive.optional(),
    widthMm: positive.optional(),
    heightMm: positive.optional(),
    depthMm: positive.optional(),
    powerWattsMax: positive.optional().describe('Maximum power draw in watts.'),
    poeIn: z.boolean().optional().describe('Can be powered over Ethernet.'),
    poeInStandard: poeStandardEnum
      .optional()
      .describe(
        'The PoE standard needed when powered over Ethernet; only with poeIn.',
      ),
    poeOut: z
      .boolean()
      .optional()
      .describe('Can power other devices over Ethernet.'),
    poeOutStandard: poeStandardEnum
      .optional()
      .describe('The highest PoE standard supplied; only with poeOut.'),
    poeBudgetWatts: positive
      .optional()
      .describe('Total power supplied over PoE in watts; only with poeOut.'),
    endOfSale: z.iso
      .date()
      .optional()
      .describe('The day the manufacturer stops selling the model (EOS).'),
    endOfSupport: z.iso
      .date()
      .optional()
      .describe(
        'The day the manufacturer stops supporting the model (EOL); not before endOfSale.',
      ),
    website: textSchema
      .optional()
      .describe("The model's page on the manufacturer's site."),
    notes: textSchema.optional(),
  }

  server.registerTool(
    'create_device_model',
    {
      title: 'Create device model',
      description: `Documents a new device model in the catalog. Only fill in values the user gave you; never make up dimensions, power or dates. Returns the created model. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        name: textSchema.min(1).describe('The model name, such as RB760iGS.'),
        manufacturerId: idSchema,
        deviceTypeId: idSchema,
        status: statusEnum,
        ...fields,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (body) =>
      toolResult(blacklist, 'deviceModel', () =>
        api.POST('/api/device-models', { body }),
      ),
  )

  server.registerTool(
    'update_device_model',
    {
      title: 'Update device model',
      description: `Changes a device model by its id. ${UPDATE_NOTE} Use update_device_model_status to change its status. Returns the updated model. ${HIDDEN_NOTE}`,
      inputSchema: z.object({
        id: idSchema,
        name: textSchema.min(1).optional(),
        manufacturerId: idSchema.optional(),
        deviceTypeId: idSchema.optional(),
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
      toolResult(blacklist, 'deviceModel', async () => {
        const current = await api.GET('/api/device-models/{id}', {
          params: { path: { id } },
        })
        if (!current.data) return current
        const {
          $schema,
          id: _id,
          status,
          createdAt,
          updatedAt,
          deviceType,
          manufacturer,
          ...rest
        } = current.data
        return api.PUT('/api/device-models/{id}', {
          params: { path: { id } },
          body: mergeChanges(
            {
              ...rest,
              deviceTypeId: deviceType.id,
              manufacturerId: manufacturer.id,
            },
            changes,
            clear,
          ),
        })
      }),
  )

  server.registerTool(
    'update_device_model_status',
    {
      title: 'Update device model status',
      description: `Changes the lifecycle status of a device model by its id: planned, active, decommissioned (no longer used) or archived. Returns the updated model. ${HIDDEN_NOTE}`,
      inputSchema: z.object({ id: idSchema, status: statusEnum }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    ({ id, status }) =>
      toolResult(blacklist, 'deviceModel', () =>
        api.PATCH('/api/device-models/{id}/status', {
          params: { path: { id } },
          body: { status },
        }),
      ),
  )

  server.registerTool(
    'delete_device_model',
    {
      title: 'Delete device model',
      description:
        'Permanently deletes a device model by its id. A model that is no longer used should be marked decommissioned instead of deleted.',
      inputSchema: z.object({ id: idSchema }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id }) =>
      toolResult(blacklist, 'deviceModel', () =>
        api.DELETE('/api/device-models/{id}', { params: { path: { id } } }),
      ),
  )
}
