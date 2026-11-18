import createClient from 'openapi-fetch'
import type { paths } from './schema.ts'

export type ApiClient = ReturnType<typeof createApiClient>

export function createApiClient(server: string, apiKey: string) {
  return createClient<paths>({
    baseUrl: server,
    headers: { Authorization: `Bearer ${apiKey}` },
    querySerializer: { array: { style: 'form', explode: false } },
  })
}
