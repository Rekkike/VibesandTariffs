#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SPEC_PATH = 'docs/SPECIFICATION.md';
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

function fail(message) {
  process.stderr.write(`spec-version-guard: FAIL — ${message}\n`);
  process.exit(1);
}

function pass(message) {
  process.stdout.write(`spec-version-guard: OK — ${message}\n`);
  process.exit(0);
}

function check(changedFiles, baseSpec, headSpec) {
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
  pass(
    `behavior changes carry a matching spec changelog entry (${newRows.length} new row(s)): ${newRows
      .map((row) => row.split('|')[1].trim())
      .join(', ')}`
  );
}

function readIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function listSnapshotFiles(root) {
  const acc = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && !['base-spec', 'head-spec', 'changed-files', 'spec-diff'].includes(entry.name)) {
      acc.push(entry.name);
    }
  }
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
  check(changedFiles, '', addedRows.join('\n') + (addedRows.length ? '\n' : ''));
} else if (args.includes('--state')) {
  const dir = argValue('--state');
  const baseSpec = readIfExists(path.join(dir, 'base-spec'));
  const headSpec = readIfExists(path.join(dir, 'head-spec'));
  const changedFiles = listSnapshotFiles(dir);
  check(changedFiles, baseSpec, headSpec);
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
  check(changedFiles, baseSpec, headSpec);
}
