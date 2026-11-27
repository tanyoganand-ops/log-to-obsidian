'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-')); }
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else { fs.copyFileSync(s, d); const st = fs.statSync(s); fs.utimesSync(d, st.atime, st.mtime); }
  }
}
function snapshot(dir) { // relative path -> sha256 (+ mtime) for every file
  const out = {};
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else out[path.relative(dir, f).replace(/\\/g, '/')] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  } };
  walk(dir);
  return out;
}
module.exports = { tmp, copyDir, snapshot };
