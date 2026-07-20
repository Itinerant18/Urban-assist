## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Skills

Project skills live in `.claude/skills/` (mirrored in `.cursor/skills/`). Each skill is a folder with a `SKILL.md` describing when and how to apply it. Before starting design, frontend, backend, architecture, or review work, check whether a matching skill folder exists and follow its SKILL.md instructions.

## MCP servers

Project MCP servers are defined per tool from the same source list (supabase, sequential-thinking, serena, chrome-devtools, tavily, MCP_DOCKER):

- Claude Code: `.mcp.json`
- Cursor: `.cursor/mcp.json`
- VS Code / Copilot: `.vscode/mcp.json`
- Gemini CLI: `.gemini/settings.json`
- opencode: `opencode.json`
- Codex: `.codex/config.toml` (merge into `~/.codex/config.toml` if not picked up)
- Antigravity: `.antigravity/mcp_config.json` (import via Antigravity MCP settings if project-level not picked up)

When editing the server list, update `.mcp.json` first, then regenerate the others to match.
