'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, copyDir, snapshot } = require('./helpers.js');
const root = path.resolve(__dirname, '..');
const script = path.join(root, 'build-vault.js');

function setup() {
  const dir = tmp();
  copyDir(path.join(root, 'sample-input'), path.join(dir, 'sample-input'));
  return { dir, input: path.join(dir, 'sample-input'), cfg: path.join(dir, 'sample-input', 'config.json'), vault: path.join(dir, 'sample-vault') };
}
const run = (cfg, ...extra) => spawnSync(process.execPath, [script, '--config', cfg, ...extra], { encoding: 'utf8' });
const logOf = (c) => path.join(c.input, 'projects', 'project-alpha', 'PROGRESS-LOG.md');
const canLink = (() => { const d = tmp(); try { fs.symlinkSync(d, path.join(d, 'l'), 'junction'); return true; } catch (e) { return false; } })();

test('sentinel: generated note symlinked to an input log is refused, input unchanged', { skip: !canLink }, () => {
  const c = setup();
  assert.strictEqual(run(c.cfg).status, 0);
  const before = snapshot(c.dir);
  fs.rmSync(path.join(c.vault, 'Projects', 'Project Alpha.md'));
  fs.symlinkSync(logOf(c), path.join(c.vault, 'Projects', 'Project Alpha.md'));
  const before2 = snapshot(c.input);
  const r = run(c.cfg);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /symlink or junction/);
  assert.deepStrictEqual(snapshot(c.input), before2);
  assert.ok(Object.keys(before).length > 0);
});

test('sentinel: Projects dir linked outside the vault writes nothing outside', { skip: !canLink }, () => {
  const c = setup();
  const outside = path.join(c.dir, 'outside');
  fs.mkdirSync(outside);
  fs.mkdirSync(c.vault);
  fs.symlinkSync(outside, path.join(c.vault, 'Projects'), 'junction');
  const r = run(c.cfg);
  assert.notStrictEqual(r.status, 0);
  assert.deepStrictEqual(fs.readdirSync(outside), []);
  assert.ok(!fs.existsSync(path.join(c.vault, 'Dashboard.md')), 'no partial output');
});

test('sentinel: .obsidian linked to the input folder is refused, nothing written there', { skip: !canLink }, () => {
  const c = setup();
  fs.mkdirSync(c.vault);
  fs.symlinkSync(c.input, path.join(c.vault, '.obsidian'), 'junction');
  const before = snapshot(c.input);
  assert.notStrictEqual(run(c.cfg).status, 0);
  assert.deepStrictEqual(snapshot(c.input), before);
});

test('vault folder itself a symlink is refused', { skip: !canLink }, () => {
  const c = setup();
  const outside = path.join(c.dir, 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, c.vault, 'junction');
  assert.notStrictEqual(run(c.cfg).status, 0);
  assert.deepStrictEqual(fs.readdirSync(outside), []);
});

test('hard link: graph.json hard-linked to an input file is replaced, input content unchanged', () => {
  const c = setup();
  assert.strictEqual(run(c.cfg).status, 0);
  const target = path.join(c.input, 'INDEX.md');
  const g = path.join(c.vault, '.obsidian', 'graph.json');
  fs.rmSync(g);
  try { fs.linkSync(target, g); } catch (e) { return; }
  const before = fs.readFileSync(target);
  assert.strictEqual(run(c.cfg).status, 0);
  assert.ok(fs.readFileSync(target).equals(before));
  JSON.parse(fs.readFileSync(g, 'utf8'));
});

test('vault inside a project folder, or containing the inputs, is refused', () => {
  const c = setup();
  const alpha = path.join(c.input, 'projects', 'project-alpha');
  for (const v of [path.join(alpha, 'vault'), alpha, c.dir, c.input, path.join(c.input, 'INDEX.md')]) {
    const cfg2 = path.join(c.dir, 'cfg2.json');
    fs.writeFileSync(cfg2, JSON.stringify({ scan: [path.join(c.input, 'projects', '*')], indexFile: path.join(c.input, 'INDEX.md'), vaultDir: v }));
    const before = snapshot(c.input);
    const r = run(cfg2);
    assert.notStrictEqual(r.status, 0, v);
    assert.match(r.stderr, /overlaps an input/, v);
    assert.deepStrictEqual(snapshot(c.input), before);
  }
});

test('no temp files are left behind', () => {
  const c = setup();
  run(c.cfg); run(c.cfg);
  const all = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else all.push(f); } };
  walk(c.vault);
  assert.deepStrictEqual(all.filter((f) => /\.tmp-/.test(f)), []);
});

test('asOf: output is byte-identical for the same date; a different date changes only the dashboard', () => {
  const c = setup();
  run(c.cfg, '--as-of', '2026-11-27');
  const a = snapshot(c.vault);
  run(c.cfg, '--as-of', '2026-11-27');
  assert.deepStrictEqual(snapshot(c.vault), a);
  run(c.cfg, '--as-of', '2026-12-30');
  const b = snapshot(c.vault);
  const changed = Object.keys(a).filter((k) => a[k] !== b[k]);
  assert.deepStrictEqual(changed, ['Dashboard.md']);
});
