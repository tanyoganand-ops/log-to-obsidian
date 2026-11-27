'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { tmp, copyDir } = require('./helpers.js');
const root = path.resolve(__dirname, '..');

test('--watch rebuilds when a PROGRESS-LOG.md changes', async () => {
  const dir = tmp();
  copyDir(path.join(root, 'sample-input'), path.join(dir, 'sample-input'));
  const cfg = path.join(dir, 'sample-input', 'config.json');
  const note = path.join(dir, 'sample-vault', 'Projects', 'Project Alpha.md');
  const child = spawn(process.execPath, [path.join(root, 'build-vault.js'), '--config', cfg, '--watch'], { stdio: 'ignore' });
  const waitFor = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
  try {
    assert.ok(await waitFor(() => fs.existsSync(note), 8000), 'initial build');
    const log = path.join(dir, 'sample-input', 'projects', 'project-alpha', 'PROGRESS-LOG.md');
    fs.appendFileSync(log, '\n## 2026-11-27\n\n- **Next:** Watch mode marker task\n');
    assert.ok(await waitFor(() => fs.readFileSync(note, 'utf8').includes('Watch mode marker task'), 10000), 'rebuild after change');
  } finally { child.kill(); }
});
