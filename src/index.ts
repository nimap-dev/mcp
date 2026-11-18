#!/usr/bin/env node
import { createRequire } from 'node:module'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createApiClient } from './api/client.ts'
import { loadConfig } from './config.ts'
import { registerDeviceModelTools } from './tools/device-models.ts'
import { registerDeviceTools } from './tools/devices.ts'
import { registerManufacturerTools } from './tools/manufacturers.ts'

const { version }: { version: string } = createRequire(import.meta.url)(
  '../package.json',
)
const config = loadConfig()
const api = createApiClient(config.server, config.apiKey)

serveStdio(
  () => {
    const server = new McpServer(
      { name: 'nimap', version },
      { capabilities: { tools: {} } },
    )
    registerDeviceTools(server, api, config.blacklist)
    registerDeviceModelTools(server, api, config.blacklist)
    registerManufacturerTools(server, api, config.blacklist)
    return server
  },
  { onerror: (error) => console.error(error) },
)
