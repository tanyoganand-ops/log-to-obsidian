#!/usr/bin/env node
'use strict';
// Generates sample-input/ : 4 fictional projects with deterministic file times. Made-up data only.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'sample-input');
fs.rmSync(root, { recursive: true, force: true });
const put = (rel, content, date) => {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  const t = new Date(date + 'T12:00:00Z');
  fs.utimesSync(f, t, t);
};
const pdf = (title) => '%PDF-1.4\n% fictional sample: ' + title + '\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n';
const blob = (n) => 'x'.repeat(n);

// ---- Project Alpha: active, three PDFs, mentions nothing, mentioned by Beta
put('projects/project-alpha/PROGRESS-LOG.md', [
  '# Progress log: Project Alpha', '',
  '## 2026-11-03', '',
  '- **Done:** Drafted the market overview and agreed the outline',
  '- **Decisions:** Keep the report to 12 pages, charts in the appendix',
  '- **Next:** Write the executive summary',
  '- **Next:** Collect three customer quotes',
  '- **Unverified:** Whether the 2025 growth figure includes refunds', '',
  '## 2026-11-10', '',
  '- **Done:** Wrote the executive summary and sent it for review',
  '- **Also built:** `chart-pack.pdf` with six charts',
  '- **Next:**',
  '  - [x] Add the customer quotes to the report',
  '  - [ ] Final proofread and export the report', '',
  '## 2026-11-10 (later)', '',
  '- **Done:** Collected three customer quotes \u2728',
  '- **Next:** Check the chart colours for print', '',
  '## 2026-11-24', '',
  '- **Done:** Exported `alpha-report-v1.pdf` and `alpha-appendix.pdf`',
  '- **Decisions:** Share the report with Project Beta as a reference for pricing',
  '- **Next:** Send the report to the sample client',
  '- **Next:** Book a review call for December', ''].join('\n'), '2026-11-24');
put('projects/project-alpha/alpha-report-v1.pdf', pdf('alpha report'), '2026-11-24');
put('projects/project-alpha/alpha-appendix.pdf', pdf('appendix'), '2026-11-24');
put('projects/project-alpha/exports/chart-pack.pdf', pdf('charts'), '2026-11-10');
put('projects/project-alpha/exports/cover.png', blob(2048), '2026-11-10');
put('projects/project-alpha/raw/interview-footage.mp4', blob(4096), '2026-11-09');
put('projects/project-alpha/_to-delete/old-draft.pdf', pdf('old'), '2026-10-01');
put('projects/project-alpha/node_modules/pkg/readme.html', '<p>ignore</p>', '2026-10-01');

// ---- Project Beta: blocked (newest Next needs something)
put('projects/project-beta/PROGRESS-LOG.md', [
  '# Progress log: Project Beta', '',
  '## 2026-11-12', '',
  '- **Done:** Built the pricing calculator prototype',
  '- **Next:** Test the calculator with real numbers',
  '- **Next:** Write the user guide', '',
  '## 2026-11-20', '',
  '- **Done:** Test the calculator with real numbers, results look right',
  '- **Decisions:** Use the pricing tiers from Project Alpha',
  '- **Unverified:** Rounding rules for the 3-year plan',
  '- **Next:** Needs sign-off from the sample finance lead before the guide can ship', '',
  '## 2026-11-26', '',
  '- **Done:** Drafted most of the user guide',
  '- **Next:** Waiting on the finance lead to confirm rounding rules', ''].join('\r\n'), '2026-11-26');
put('projects/project-beta/calculator.html', '<html><body>calc</body></html>', '2026-11-12');
put('projects/project-beta/user-guide-draft.docx', blob(5120), '2026-11-26');
put('projects/project-beta/pricing-table.csv', 'tier,price\nbasic,10\npro,25\n', '2026-11-20');

// ---- Project Gamma: done (index stage says Wrapped), mentions Beta
put('projects/project-gamma/PROGRESS-LOG.md', [
  '# Progress log: Project Gamma', '',
  '## 2026-10-28', '',
  '- **Done:** Finished the launch deck',
  '- **Next:** Present to the sample board', '',
  '## 2026-11-05', '',
  '- **Done:** Presented the deck to the sample board, approved',
  '- **Done:** Handed the pricing notes to project-beta',
  '- **Delivered:** Launch deck and speaker notes', ''].join('\n'), '2026-11-05');
put('projects/project-gamma/launch-deck.pptx', blob(8192), '2026-11-05');
put('projects/project-gamma/speaker-notes.pdf', pdf('notes'), '2026-11-05');

// ---- Project Delta: stale (last entry long ago), tagged private in the config
put('projects/project-delta/PROGRESS-LOG.md', [
  '# Progress log: Project Delta', '',
  '## 2026-10-02', '',
  '- **Done:** Collected the first batch of sample survey answers',
  '- **Next:** Clean the survey data',
  '- **Unverified:** Response rate looks low, check the mailing list', '',
  '## 2026-10-09', '',
  '- **Done:** Cleaned half of the survey data',
  '- **Next:** Clean the remaining survey data',
  '- **Next:** Draft the findings slide', ''].join('\n'), '2026-10-09');
put('projects/project-delta/survey-clean.csv', 'id,answer\n1,yes\n2,no\n', '2026-10-09');

// ---- root index with long, markdown-heavy cells
const longCell = 'Finish the report, then send it to **the sample client** (see [notes](https://example.invalid/notes)) and `book | review`. '.repeat(6);
put('INDEX.md', [
  '# Project index', '',
  '| Project | Stage | Last touched | Next action |',
  '| --- | --- | --- | --- |',
  '| **Project Alpha** | Build | 2026-11-24 | ' + longCell + ' |',
  '| Project Beta | Review | 2026-11-26 | Waiting on finance lead \ud83d\udd53 |',
  '| Project Gamma | Done: wrapped | 2026-11-05 | Nothing |',
  '| Project Delta | Stuck | 2026-10-09 | Clean the survey data |', ''].join('\n'), '2026-11-26');

put('config.json', JSON.stringify({
  scan: ['projects/*'],
  indexFile: 'INDEX.md',
  vaultDir: '../sample-vault',
  staleDays: 14,
  recentDays: 7,
  asOf: '2026-11-27',
  projectTags: { 'Project Delta': ['private'] },
}, null, 2) + '\n', '2026-11-26');
console.log('sample-input written');
