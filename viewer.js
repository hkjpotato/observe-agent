// observe-agent: a raw viewer for Codex rollout files (.jsonl).
// One row per line of the file, grouped by turn (task_started), labelled
// only with the record's own `type` and `payload.type`. Click a row for the full record.

const EXAMPLES = [
  { file: "examples/codex-exec-0.162.1.jsonl", title: "codex exec (CLI 0.162.1)" },
  { file: "examples/codex-interactive-0.163.0.jsonl", title: "codex interactive (CLI 0.163.0)" },
  { file: "examples/codex-desktop-0.162.0-alpha.17.2.jsonl", title: "Codex Desktop (0.162.0-alpha.17.2)" },
];

// One colour per top-level `type`; anything else is grey.
const COLOR = { response_item: "purple", event_msg: "teal" };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// payload.type, plus role / name / item.type when the record has them.
function sub(r) {
  const p = r.payload ?? {};
  return [p.type, p.role, p.name, p.type === "item_completed" ? p.item?.type : null].filter(Boolean).join(" · ");
}

// Last 4 characters of call_id, to pair a tool call with its output.
function preview(r) {
  const id = r.payload?.call_id;
  return id ? `call_id …${id.slice(-4)}` : "";
}

async function render(ex) {
  const rows = (await (await fetch(ex.file)).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));

  const groups = [{ title: "before the first turn", rows: [] }];
  rows.forEach((r, i) => {
    if (r.payload?.type === "task_started") groups.push({ title: `turn ${groups.length}`, rows: [] });
    groups.at(-1).rows.push({ r, line: i + 1 });
  });

  const types = [...new Set(rows.map((r) => r.type))];
  const chips = types.map((t) => `<button class="chip c-${COLOR[t] ?? "gray"}" data-type="${esc(t)}">${esc(t)}</button>`).join("");

  const body = groups
    .filter((g) => g.rows.length)
    .map(
      (g) => `<details class="turn" open><summary>${g.title}</summary>${g.rows
        .map(({ r, line }) => {
          const mcp = r.payload?.item?.type === "McpToolCall" ? " mcp" : "";
          return `<details class="row c-${COLOR[r.type] ?? "gray"}${mcp}" data-type="${esc(r.type)}"><summary>
            <span class="ln">${line}</span><span class="ty">[${esc(r.type)}] ${esc(sub(r))}</span><span class="pv">${esc(preview(r))}</span>
          </summary><pre>${esc(JSON.stringify(r, null, 2))}</pre></details>`;
        })
        .join("")}</details>`,
    )
    .join("");

  document.getElementById("view").innerHTML =
    `<div class="bar"><a href="${ex.file}">${ex.file}</a> · ${rows.length} lines · ${chips}</div>${body}`;
  document.querySelectorAll(".bar .chip").forEach((chip) => {
    chip.onclick = () => {
      const off = chip.classList.toggle("off");
      document.querySelectorAll(`.row[data-type="${chip.dataset.type}"]`).forEach((row) => (row.hidden = off));
    };
  });
}

const nav = document.getElementById("nav");
EXAMPLES.forEach((ex, i) => {
  const b = document.createElement("button");
  b.textContent = ex.title;
  b.onclick = () => {
    [...nav.children].forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    render(ex);
  };
  nav.appendChild(b);
  if (i === 0) b.click();
});
