// Sanitize raw agent logs (.jsonl) for public sharing.
// Usage: node scripts/sanitize.mjs raw/<file>.jsonl examples/<file>.jsonl
//
// Keeps every record and every key, so the structure stays 1:1 with the
// original. Only values are replaced:
//   - personal and organization names, paths, emails -> placeholders
//   - long strings (vendor instructions, tool definitions, encrypted
//     reasoning, environment snapshots) -> "[omitted: N chars]"
import fs from "node:fs";

const [src, dst] = process.argv.slice(2);
const MAX = 500; // longer strings are omitted; the example conversations are short

// Private words to replace live in raw/redact.txt (not committed), one regex per line.
const PRIVATE = fs.existsSync("raw/redact.txt")
  ? fs.readFileSync("raw/redact.txt", "utf8").split("\n").filter(Boolean)
  : [];
const REPLACE = [
  [/\/Users\/[A-Za-z0-9._-]+/g, "/Users/me"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "me@example.com"],
  ...PRIVATE.map((p) => [new RegExp(p, "gi"), "redacted"]),
];

// Keys whose values identify the account or list the user's installed tools.
const ID_KEYS = /user_id|account_id|client_id|connectorId|linkId/i;
const TOOL_LISTS = new Set(["addedNames", "addedLines", "removedNames", "removedLines"]);

function clean(value, key = "") {
  if (ID_KEYS.test(key) && typeof value === "string") return "[omitted]";
  if (TOOL_LISTS.has(key) && Array.isArray(value)) return [`[omitted: ${value.length} tool names]`];
  if (typeof value === "string") {
    if (value.length > MAX) return `[omitted: ${value.length} chars]`;
    return REPLACE.reduce((s, [re, to]) => s.replace(re, to), value);
  }
  // Lists of the user's connectors or MCP tool definitions.
  if (Array.isArray(value) && /mcp__|"claude\.ai /.test(JSON.stringify(value))) {
    return [`[omitted: ${value.length} connector/tool entries]`];
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    // An object keyed by installed tool names (e.g. world_state.state.tools).
    if (keys.some((k) => k.startsWith("mcp__"))) return { "[omitted]": `${keys.length} tools` };
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v, k)]));
  }
  return value;
}

// Vendor instructions (Codex "developer" messages) are omitted whatever their length.
function cleanRecord(r) {
  const p = r.payload;
  if (r.type === "response_item" && p?.type === "message" && p.role === "developer" && Array.isArray(p.content)) {
    p.content = p.content.map((c) => ({ ...c, text: `[omitted vendor instructions: ${String(c.text ?? "").length} chars]` }));
  }
  return clean(r);
}

const out = fs
  .readFileSync(src, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.stringify(cleanRecord(JSON.parse(line))));
fs.writeFileSync(dst, out.join("\n") + "\n");

// Report anything that still looks private.
const text = out.join("\n");
const leaks = [...PRIVATE.map((p) => new RegExp(p, "i")), /@(?!example\.com)[a-z0-9-]+\.[a-z]/i, /\/Users\/(?!me\b)/];
for (const re of leaks) {
  const m = text.match(re);
  if (m) console.log(`CHECK ${re}: ...${text.slice(Math.max(0, m.index - 40), m.index + 40)}...`);
}
console.log(`wrote ${dst} (${out.length} records)`);
