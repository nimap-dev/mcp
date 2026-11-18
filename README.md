# @nimap/mcp

MCP server for [nimap](https://github.com/nimap-dev/nimap). It lets AI assistants read the network documentation through the nimap API, using a personal API key. Runs over stdio only.

## Configuration

Create a personal API key in nimap (account settings → API keys) and save a config file, for example `~/.config/nimap-mcp/config.yaml`:

```yaml
server: https://nimap.example.com
apiKey: nimap_xxx
blacklist:
  fields: [serialNumber]
  objectFields:
    deviceType: [icon, color]
  objectTypes: [manufacturer]
```

The blacklist hides data from the AI assistant. A hidden value is replaced with `[hidden]`, and a hidden object type is not returned at all. It is not access control: anyone with the API key can read the same data from the API.

## Claude Desktop

Add the server to `claude_desktop_config.json` (Settings → Developer → Edit Config) and restart Claude Desktop:

```json
{
  "mcpServers": {
    "nimap": {
      "command": "npx",
      "args": ["-y", "@nimap/mcp", "--config", "/absolute/path/to/config.yaml"]
    }
  }
}
```

Use absolute paths. Claude Desktop does not load your shell profile, so with a Node version manager such as nvm, set `command` to the absolute path of `npx`. Node.js 22 or newer is required.

## Claude Code

```sh
claude mcp add nimap -- npx -y @nimap/mcp --config /absolute/path/to/config.yaml
```

## Development

```sh
pnpm install
pnpm build
pnpm test
node dist/index.js --config ./config.yaml
```

Copy `config.example.yaml` to `config.yaml` and fill in the server address and your API key. To update the API types, copy `nimap-openapi.yaml` from the nimap repository and run `pnpm generate`.

## Releasing

Bump the version, push the tag, and CI publishes to npm:

```sh
pnpm version patch
git push --follow-tags
```

The first version has to be published by hand (`pnpm login`, then `pnpm publish`). After that, enable trusted publishing for the package on npmjs.com (repository `nimap-dev/mcp`, workflow `ci.yml`), so CI needs no npm token.

## License

AGPL-3.0-only
