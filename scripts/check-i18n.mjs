#!/usr/bin/env node
// Lists literal UI strings in the buyer-facing pages that have no Urdu entry in src/i18n/ur.ts.
// Report mode (default) never fails; pass --strict to exit 1 when anything is untranslated.
// Usage: npm run i18n:check [-- --strict] [-- --all]   (--all also scans shared components + layouts)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const strict = process.argv.includes('--strict');
const all = process.argv.includes('--all');

// Load UR + UR_PATTERNS by transpiling ur.ts on the fly.
const urSrc = fs.readFileSync(path.join(root, 'i18n', 'ur.ts'), 'utf8');
const js = ts.transpileModule(urSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { UR, UR_PATTERNS } = mod.exports;
const known = (s) => UR[s] !== undefined || UR_PATTERNS.some(([re]) => re.test(s));

const ATTRS = new Set(['placeholder', 'title', 'label', 'aria-label', 'alt', 'description', 'eyebrow', 'subtitle', 'heading', 'cta']);
const dirs = [path.join(root, 'features', 'buyer'), path.join(root, 'features', 'storefront')];
if (all) dirs.push(path.join(root, 'components', 'comman'), path.join(root, 'components', 'layouts'));

const found = new Map(); // text -> Set(file:line)
function add(text, file, line) {
  const s = text.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || !/[A-Za-z]{2}/.test(s)) return;
  if (/^[a-z0-9_.\-/#:@]+$/.test(s) && !s.includes(' ')) return; // identifiers / urls / classnames
  if (known(s)) return;
  if (!found.has(s)) found.set(s, new Set());
  found.get(s).add(`${path.relative(root, file)}:${line}`);
}
function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  (function v(n) {
    if (ts.isJsxText(n)) add(n.getText(), file, line(n));
    else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)) add(n.initializer.text, file, line(n));
    else if (ts.isJsxExpression(n) && n.expression && (ts.isStringLiteral(n.expression) || ts.isNoSubstitutionTemplateLiteral(n.expression)) && ts.isJsxElement(n.parent)) add(n.expression.text, file, line(n));
    ts.forEachChild(n, v);
  })(sf);
}
(function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) scan(p);
  }
})(dirs.length ? dirs[0] : root);
for (const d of dirs.slice(1)) (function walk(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.tsx')) scan(p); } })(d);

const rows = [...found.entries()].sort((a, b) => b[1].size - a[1].size);
for (const [text, where] of rows) console.log(`${JSON.stringify(text)}  <- ${[...where].slice(0, 2).join(', ')}${where.size > 2 ? ` (+${where.size - 2})` : ''}`);
console.log(`\n${rows.length} untranslated literal string(s) in ${all ? 'buyer + shared UI' : 'buyer pages'}.`);
if (strict && rows.length) process.exit(1);