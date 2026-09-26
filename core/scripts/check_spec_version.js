#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SPEC_PATH = 'docs/SPECIFICATION.md';
const VERSION_CONST_PATH = 'web/src/version.ts';
const BEHAVIOR_PATHS = ['core/src/', 'core/data/', 'core/scripts/', 'web/src/'];

function usage() {
  process.stderr.write(
    [
      'Usage:',
      '  node check_spec_version.js --base <ref> --head <ref>',
      '      Compare the two git refs: if behavior files changed, the spec',
      '      must gain a new changelog version row in the same change.',
      '  node check_spec_version.js --fixture <dir>',
      '      Run against a fixture directory containing:',
      '        <dir>/changed-files  (one changed path per line)',
      '        <dir>/spec-diff      (unified diff of docs/SPECIFICATION.md)',
      '  node check_spec_version.js --state <dir>',
      '      Run against a snapshot directory containing:',
      '        <dir>/base-spec      (spec content at the base)',
      '        <dir>/head-spec      (spec content at the head)',
      '        plus changed-files relative to the snapshot root',
      '',
    ].join('\n')
  );
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function changedPathsFromGit(baseRef, headRef) {
  const out = git(['diff', '--name-only', `${baseRef}...${headRef}`]);
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isBehaviorPath(filePath) {
  return BEHAVIOR_PATHS.some((prefix) => filePath === prefix.slice(0, -1) || filePath.startsWith(prefix));
}

const CHANGELOG_ROW = /^\|\s*0\.2\.\d+\s*\|/;

function specVersionRows(specText) {
  return specText
    .split('\n')
    .filter((line) => CHANGELOG_ROW.test(line));
}

// Spec header version (v0.2.68, item 1): the first heading line carries the
// specification version, e.g. '# Port Call Cost Analyzer — Specification
// v0.2.67'.
function specHeaderVersion(specText) {
  const m = specText.match(/Specification v(0\.2\.\d+)/);
  return m ? `v${m[1]}` : null;
}

// Web-layer version constant (v0.2.68, item 1): the single source of truth
// the version chip renders. Extracted from the constant's own file, never
// from a second hand-kept copy.
function webVersionConstant(versionTsText) {
  if (!versionTsText) return null;
  const m = versionTsText.match(/APP_VERSION\s*=\s*'(v0\.2\.\d+)'/);
  return m ? m[1] : null;
}

function fail(message) {
  process.stderr.write(`spec-version-guard: FAIL — ${message}\n`);
  process.exit(1);
}

function pass(message) {
  process.stdout.write(`spec-version-guard: OK — ${message}\n`);
  process.exit(0);
}

function check(changedFiles, baseSpec, headSpec, headVersionTs) {
  const behaviorChanges = changedFiles.filter(isBehaviorPath);
  if (behaviorChanges.length === 0) {
    pass('no behavior-path changes (engine/data/web); spec bump not required');
  }

  const baseRows = new Set(specVersionRows(baseSpec));
  const newRows = specVersionRows(headSpec).filter((row) => !baseRows.has(row));
  if (newRows.length === 0) {
    fail(
      [
        `behavior changes in this change require a matching specification version bump,`,
        `but no new changelog row was added to ${SPEC_PATH}.`,
        `Behavior paths: ${BEHAVIOR_PATHS.join(', ')}`,
        `Changed behavior files:`,
        ...behaviorChanges.map((f) => `  ${f}`),
        `Add a new "| 0.2.x | date | ..." changelog row and bump the header version in ${SPEC_PATH} in the same change.`,
      ].join('\n')
    );
  }
  // Version-constant cross-check (v0.2.68, item 1): the web-layer
  // APP_VERSION constant and the spec header must agree — a chip ahead of
  // the spec (a bump that skipped the spec row) fails, and a chip behind
  // (a spec bump that skipped the constant) fails. The same hand-kept-array
  // drift class the guard exists for; caught in CI, never on the page.
  const header = specHeaderVersion(headSpec);
  const constant = headVersionTs === null ? null : webVersionConstant(headVersionTs);
  if (headVersionTs !== null && constant === null) {
    fail(
      `the web version constant (${VERSION_CONST_PATH}) does not carry a parseable APP_VERSION = 'v0.2.x' — the version chip has no source of truth.`
    );
  }
  if (headVersionTs !== null && header !== null && constant !== header) {
    fail(
      [
        `the web version constant and the spec header disagree: ${VERSION_CONST_PATH} says ${constant}, ${SPEC_PATH} header says ${header}.`,
        `The bump ritual is: spec header, changelog row, and the constant, all in the same change.`,
        header && constant && compareVersions(constant, header) > 0
          ? '(the chip is ahead of the spec — a bump that skipped the spec row)'
          : '(the chip is behind the spec — a spec bump that skipped the constant)'
      ].join('\n')
    );
  }
  pass(
    `behavior changes carry a matching spec changelog entry (${newRows.length} new row(s)): ${newRows
      .map((row) => row.split('|')[1].trim())
      .join(', ')}`
  );
}

// 'v0.2.10' vs 'v0.2.9' — numeric, never lexical.
function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function readIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function listSnapshotFiles(root) {
  const acc = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['base-spec', 'head-spec', 'changed-files', 'spec-diff'].includes(entry.name)) continue;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), prefix + entry.name + '/');
      } else if (entry.isFile()) {
        acc.push(prefix + entry.name);
      }
    }
  };
  walk(root, '');
  return acc;
}

const args = process.argv.slice(2);

function argValue(name) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  return args[i + 1];
}

if (args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(0);
} else if (args.includes('--fixture')) {
  const dir = argValue('--fixture');
  const changedFiles = readIfExists(path.join(dir, 'changed-files'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const specDiff = readIfExists(path.join(dir, 'spec-diff'));
  const addedRows = specDiff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .filter((line) => CHANGELOG_ROW.test(line));
  // Fixture directories carry no web source, so the version-constant
  // cross-check is not exercisable here (the CI demonstration uses
  // --state fixtures for it); pass null to skip it explicitly.
  check(changedFiles, '', addedRows.join('\n') + (addedRows.length ? '\n' : ''), null);
} else if (args.includes('--state')) {
  const dir = argValue('--state');
  const baseSpec = readIfExists(path.join(dir, 'base-spec'));
  const headSpec = readIfExists(path.join(dir, 'head-spec'));
  const changedFiles = listSnapshotFiles(dir);
  const versionTsPath = path.join(dir, VERSION_CONST_PATH.replace(/\//g, path.sep));
  const versionTsExists = fs.existsSync(versionTsPath);
  check(changedFiles, baseSpec, headSpec, versionTsExists ? fs.readFileSync(versionTsPath, 'utf8') : null);
} else {
  const base = argValue('--base');
  const head = argValue('--head');
  if (!base || !head) {
    usage();
    process.stderr.write('spec-version-guard: FAIL — --base and --head are required for git mode\n');
    process.exit(1);
  }
  const changedFiles = changedPathsFromGit(base, head);
  const baseSpec = git(['show', `${base}:${SPEC_PATH}`]);
  const headSpec = git(['show', `${head}:${SPEC_PATH}`]);
  let headVersionTs = null;
  try {
    headVersionTs = git(['show', `${head}:${VERSION_CONST_PATH}`]);
  } catch (e) {
    // The constant did not exist at the base era of compared history;
    // the cross-check is skipped for pre-v0.2.68 comparisons only when
    // the file is absent at the head too (it never is from v0.2.68 on).
    headVersionTs = null;
  }
  check(changedFiles, baseSpec, headSpec, headVersionTs);
}
