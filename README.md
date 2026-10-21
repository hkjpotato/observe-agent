# observe-agent

A raw viewer for Codex rollout files: one row per line of the `.jsonl`, grouped by turn, labelled with the record's own `type` and `payload.type`.

Page: https://hkjpotato.github.io/observe-agent/

## Examples

All three are one turn, run in `sandbox/`. The prompt:

```
Use the personal_notebook roll_dice tool to roll one six-sided die, then reply with just the result.
```

(The interactive run starts with "hi, plz use…" instead.)

| File | How it was made |
|---|---|
| `examples/codex-exec-0.162.1.jsonl` | `codex exec --skip-git-repo-check "<prompt>"` (CLI 0.162.1) |
| `examples/codex-interactive-0.163.0.jsonl` | `codex` in macOS Terminal (CLI 0.163.0), prompt typed in |
| `examples/codex-desktop-0.162.0-alpha.17.2.jsonl` | Codex Desktop, `sandbox/` opened as the project |

`personal_notebook` is a small local MCP server with a `roll_dice` tool.

Rollouts are read from `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. The interactive CLI ran through the Desktop app's app-server, so its `session_meta` shows the Desktop version and `source: vscode`.

## Sanitizing

`scripts/sanitize.mjs` keeps every record and key and only replaces values: home paths, emails, account ids, installed-tool lists and private words (from an uncommitted `raw/redact.txt`). Strings over 500 characters, such as vendor instructions or encrypted reasoning, become `[omitted: N chars]`.

```
node scripts/sanitize.mjs raw/<file>.jsonl examples/<file>.jsonl
```

## Run locally

```
python3 -m http.server
```
