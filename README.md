# @nimap/mcp

MCP server for [nimap](https://github.com/nimap-dev/nimap). It lets AI assistants read the network documentation through the nimap API, using a personal API key. Runs over stdio only.

## Development

```sh
pnpm install
pnpm build
node dist/index.js --config ./config.yaml
```

Copy `config.example.yaml` to `config.yaml` and fill in the server address and your API key.

## License

AGPL-3.0-only
