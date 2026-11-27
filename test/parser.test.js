'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseLog, parseIndex, splitRow, tokens, overlap, classify, fileUrl } = require('../build-vault.js');

test('parses sections, "(later)" suffix and labels', () => {
  const r = parseLog('# T\n\n## 2026-01-02\n\n- **Done:** one\n- **Next:** two\n\n## 2026-01-02 (later)\n\n- **Decisions:** three\n');
  assert.strictEqual(r.entries.length, 2);
  assert.strictEqual(r.entries[1].suffix, '(later)');
  assert.deepStrictEqual(r.entries[0].blocks.map((b) => b.label), ['Done', 'Next']);
  assert.strictEqual(r.entries[1].blocks[0].label, 'Decisions');
});

test('CRLF, BOM and emoji do not break parsing', () => {
  const text = '\uFEFF## 2026-02-01\r\n\r\n- **Done:** shipped the \ud83d\ude80 build\r\n- **Next:** write docs\r\n';
  const r = parseLog(text);
  assert.strictEqual(r.entries.length, 1);
  assert.match(r.entries[0].blocks[0].items[0].text, /\ud83d\ude80 build$/);
  assert.strictEqual(r.pending[0].text, 'write docs');
});

test('alternative bold styles: "**Done**:" and bold without bullet', () => {
  const r = parseLog('## 2026-03-01\n**Done**: a thing\n**Next:** another thing\n');
  assert.strictEqual(r.entries[0].blocks.length, 2);
});

test('missing sections and empty logs are fine', () => {
  assert.deepStrictEqual(parseLog('').entries, []);
  const r = parseLog('## 2026-03-01\n\njust a note without labels\n- plain bullet\n');
  assert.strictEqual(r.entries[0].blocks.length, 0);
  assert.strictEqual(r.entries[0].notes.length, 2);
  assert.strictEqual(r.pending.length, 0);
});

test('multi-line items and sub-bullets under one label', () => {
  const r = parseLog('## 2026-03-01\n- **Next:**\n  - [ ] first thing\n  - [x] second thing\n- **Unverified:** long item that\n  continues here\n');
  const texts = r.pending.map((p) => p.text);
  assert.deepStrictEqual(texts, ['first thing', 'long item that continues here']);
});

test('pending is cleared by a later Done with 70%+ token overlap', () => {
  const r = parseLog([
    '## 2026-04-01', '- **Next:** Write the executive summary', '- **Next:** Order the printed brochures',
    '## 2026-04-05', '- **Done:** Wrote the executive summary and sent it', '- **Done:** Something unrelated entirely'].join('\n'));
  assert.deepStrictEqual(r.pending.map((p) => p.text), ['Order the printed brochures']);
});

test('a Done in the same section or earlier does not clear a Next', () => {
  const r = parseLog('## 2026-04-01\n- **Done:** Write the report\n- **Next:** Write the report\n');
  assert.strictEqual(r.pending.length, 1);
});

test('ticked [x] items are not pending; delivered counts as done', () => {
  const r = parseLog('## 2026-04-01\n- **Next:**\n  - [x] done already\n  - [ ] still open\n- **Unverified:** check the logo file\n## 2026-04-02\n- **Delivered:** Checked the logo file\n');
  assert.deepStrictEqual(r.pending.map((p) => p.text), ['still open']);
});

test('overlap below 70% keeps the item pending', () => {
  const r = parseLog('## 2026-04-01\n- **Next:** compile budget spreadsheet for client review\n## 2026-04-02\n- **Done:** compiled the budget\n');
  assert.strictEqual(r.pending.length, 1);
  assert.ok(overlap(tokens('compile budget spreadsheet for client review'), tokens('compiled the budget')) < 0.7);
});

test('labels inside code fences are ignored', () => {
  const r = parseLog('## 2026-05-01\n- **Done:** real\n```\n- **Next:** fake\n```\n');
  assert.strictEqual(r.pending.length, 0);
});

test('index table: long cells, pipes in code and links, escaped pipes', () => {
  const long = 'word '.repeat(2000);
  const md = ['# Index', '', '| Project | Stage | Last touched | Next action |', '|---|---|---|---|',
    '| **Alpha** | Build | 2026-01-01 | ' + long + ' and `a | b` and [[x|y]] and a\\|b |',
    '| Beta | Wrapped | 2026-01-02 | Nothing \ud83c\udf89 |', '', 'after table'].join('\r\n');
  const rows = parseIndex(md);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].project, 'Alpha');
  assert.ok(rows[0].nextAction.length > 9000);
  assert.match(rows[0].nextAction, /a \| b/);
  assert.strictEqual(rows[1].stage, 'Wrapped');
});

test('index table: column order may differ and extra columns are ignored', () => {
  const rows = parseIndex('| Notes | Next action | Last touched | Stage | Project |\n|-|-|-|-|-|\n| n | do it | 2026-01-01 | Done | P |\n');
  assert.deepStrictEqual(rows[0], { project: 'P', stage: 'Done', lastTouched: '2026-01-01', nextAction: 'do it' });
});

test('splitRow keeps [[a|b]] together', () => {
  assert.deepStrictEqual(splitRow('| [[a|b]] | c |'), ['[[a|b]]', 'c']);
});

test('status heuristic', () => {
  assert.strictEqual(classify('Build', 'Needs sign-off first'), 'blocked');
  assert.strictEqual(classify('Build', 'Waiting on the client'), 'blocked');
  assert.strictEqual(classify('Build', 'blocked by legal'), 'blocked');
  assert.strictEqual(classify('Done', 'Needs nothing'), 'done');
  assert.strictEqual(classify('Wrapped up', ''), 'done');
  assert.strictEqual(classify('Parked', 'x'), 'parked');
  assert.strictEqual(classify('Waiting', 'x'), 'waiting');
  assert.strictEqual(classify('Build', 'Write the draft'), 'active');
});

test('file URLs for Windows and POSIX paths', () => {
  assert.strictEqual(fileUrl('C:\\Users\\a b\\x (1).pdf'), 'file:///C:/Users/a%20b/x%20%281%29.pdf');
  assert.strictEqual(fileUrl('/home/a/x#1.pdf'), 'file:///home/a/x%231.pdf');
});
