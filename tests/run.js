#!/usr/bin/env node
/* ============================================================
 * tests/run.js — zero-dependency test runner
 *
 * Each tests/test*.js is a self-contained script that loads the
 * game modules into a `vm` sandbox (stubbing document/localStorage),
 * runs its assertions, prints "<n> passed, <m> failed", and exits
 * non-zero on any failure. This runner executes every one of them in
 * a child process, streams their output, and aggregates the result so
 * the whole suite is one command (`npm test`) and CI-friendly.
 *
 * No external packages — Node's built-ins only, so it survives a fresh
 * container with nothing installed.
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter((f) => /^test.*\.js$/.test(f) && f !== 'run.js' && f !== 'harness.js')
  .sort();

let failed = 0;
const failures = [];
const t0 = Date.now();

for (const f of files) {
  const res = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  const out = (res.stdout || '').trim();
  const err = (res.stderr || '').trim();
  const ok = res.status === 0;
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  // pull the test's own "N passed, M failed" summary line if present
  const summary = (out.match(/\d+\s+passed,\s+\d+\s+failed/) || [''])[0];
  console.log(`${tag}  ${f.padEnd(26)} ${summary}`);
  if (!ok) {
    failed++;
    failures.push(f);
    if (out) console.log(out.split('\n').map((l) => '      ' + l).join('\n'));
    if (err) console.log(err.split('\n').map((l) => '      ' + l).join('\n'));
  }
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
if (failed === 0) {
  console.log(`\x1b[32m✓ all ${files.length} test files passed\x1b[0m  (${secs}s)`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failed}/${files.length} test files failed:\x1b[0m ${failures.join(', ')}  (${secs}s)`);
  process.exit(1);
}
