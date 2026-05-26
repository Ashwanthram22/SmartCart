/**
 * One-off: replace common light-theme hex values with CSS variables.
 * Run: node scripts/migrate-theme-vars.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../src");

const REPLACEMENTS = [
  ["#f9f9ff", "var(--sc-page-bg)"],
  ["#f9fafb", "var(--sc-bg)"],
  ["#F9F9FF", "var(--sc-page-bg)"],
  ["#F9FAFB", "var(--sc-bg)"],
  ["#141b2b", "var(--sc-text)"],
  ["#141B2B", "var(--sc-text)"],
  ["#111827", "var(--sc-text)"],
  ["#6b7280", "var(--sc-text-muted)"],
  ["#6B7280", "var(--sc-text-muted)"],
  ["#64748b", "var(--sc-text-muted)"],
  ["#94a3b8", "var(--sc-text-faint)"],
  ["#475569", "var(--sc-text-faint)"],
  ["#ececf2", "var(--sc-border)"],
  ["#ECECF2", "var(--sc-border)"],
  ["#e5e7eb", "var(--sc-border-strong)"],
  ["#e6e6ee", "var(--sc-border)"],
  ["#f3f4f6", "var(--sc-surface-muted)"],
  ["#f1f5f9", "var(--sc-border-subtle)"],
  ["#f8fafc", "var(--sc-surface-high)"],
  ["#6b38d4", "var(--sc-accent)"],
  ["#6B38D4", "var(--sc-accent)"],
  ["#5527b6", "var(--sc-accent-strong)"],
  ["#5124c7", "var(--sc-accent-hover)"],
  ["#8455ef", "var(--sc-accent-strong)"],
  ["#c4b5fd", "var(--sc-accent-ring)"],
  ["rgba(107, 56, 212, 0.1)", "var(--sc-accent-soft)"],
  ["rgba(107, 56, 212, 0.08)", "var(--sc-input-focus-ring)"],
  ["rgba(107, 56, 212, 0.14)", "var(--sc-accent-soft)"],
  ["rgba(107, 56, 212, 0.28)", "var(--sc-input-border)"],
  ["rgba(107, 56, 212, 0.55)", "var(--sc-input-focus-border)"],
  ["#dc2626", "var(--sc-danger)"],
  ["#16a34a", "var(--sc-success)"],
  ["#f59e0b", "var(--sc-warning)"],
  ["#e9ecf2", "var(--sc-scrollbar-track)"],
  ["#ffffff", "var(--sc-surface)"],
  ["#FFFFFF", "var(--sc-surface)"],
  ["background: #fff;", "background: var(--sc-surface);"],
  ["background:#fff;", "background:var(--sc-surface);"],
  ["color: #ffffff;", "color: var(--sc-text-on-accent);"],
  ["color: #fff;", "color: var(--sc-text-on-accent);"],
  ["#f7f8fc", "var(--sc-bg)"],
  ["#1f2937", "var(--sc-scrollbar-thumb-hover)"],
  ["#0f172a", "var(--sc-text)"],
  ["#334155", "var(--sc-text-faint)"],
];

const SKIP = new Set(["theme.css", "migrate-theme-vars.mjs"]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (name.endsWith(".css") && !SKIP.has(name)) files.push(p);
  }
  return files;
}

let total = 0;
for (const file of walk(srcRoot)) {
  let text = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed = true;
      total += 1;
    }
  }
  if (changed) fs.writeFileSync(file, text);
}

console.log(`Migration pass complete (${total} replacement batches).`);
