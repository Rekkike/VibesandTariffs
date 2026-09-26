// Version-chip pins (spec v0.2.68, item 1). The contract: the version
// derives from a single web-layer constant (web/src/version.ts) — the only
// place the web layer carries the version; the chip renders that constant
// beside the theme toggle; the version guard cross-checks the constant
// against the spec header, both directions (a chip ahead of the spec fails;
// a chip behind fails). Red proofs: mutating the constant without the spec
// fails the guard; bumping the spec without the constant fails the guard;
// a second version copy in the web source turns the single-source pin red.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App from './App';
import { APP_VERSION } from './version';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const versionSource = fs.readFileSync(path.join(__dirname, 'version.ts'), 'utf8');
// Every non-test web source file: the constant must be the only version
// string in the web layer.
const webSrcFiles = fs.readdirSync(__dirname)
  .filter(f => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f));

describe('version chip (spec v0.2.68, item 1)', () => {
  it('the constant is the only place the web layer carries a version string', () => {
    // The pin's letter: no *code-carried* version literal — a quoted
    // v0.2.x string anywhere in the web source outside version.ts is a
    // second hand-kept copy (comments citing spec versions are prose,
    // not version carriers).
    const versionRe = /['"`]v0\.2\.\d+['"`]/;
    const carriers = webSrcFiles.filter(f => {
      const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
      return f !== 'version.ts' && versionRe.test(text);
    });
    expect(carriers).toEqual([]);
  });

  it('the constant matches the specification header (the bump ritual, all three agree)', () => {
    const spec = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'SPECIFICATION.md'), 'utf8');
    const header = spec.match(/Specification (v0\.2\.\d+)/);
    expect(header).not.toBeNull();
    expect(APP_VERSION).toBe(header![1]);
    // And the changelog row for the same version exists.
    expect(spec).toMatch(new RegExp(`\\|\\s*${APP_VERSION.replace('v', '')}\\s*\\|`));
  });

  it('the chip renders the constant beside the theme toggle', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<App />); });
    const chip = container.querySelector('.version-chip');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toBe(APP_VERSION);
    // Beside the toggle: same header-controls container, the chip first.
    const controls = chip!.closest('.header-controls');
    expect(controls).not.toBeNull();
    expect(controls!.querySelector('.theme-toggle')).not.toBeNull();
    expect(controls!.querySelector('.version-chip')).toBe(chip);
    await act(async () => { root.unmount(); });
    document.body.removeChild(container);
  });

  it('the chip is styled with theme tokens only (the v0.2.51 discipline; no new literals beside the toggle)', () => {
    const css = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
    const block = css.match(/\.version-chip\s*\{[^}]+\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/var\(--border\)/);
    expect(block![0]).toMatch(/var\(--surface-raised\)/);
    expect(block![0]).toMatch(/var\(--text-secondary\)/);
    expect(block![0]).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(block![0]).not.toMatch(/\b[2-9]\d?px\b/);
  });

  it('red proof (guard, chip-ahead): the constant bumped without the spec fails the guard', () => {
    // Observed red before restore: with APP_VERSION at v0.2.99 and the spec
    // header at v0.2.68, the guard exits 1. Pinned here by running the
    // guard's own --state fixtures (the committed demonstration pair).
    const run = (fixture: string) => {
      try {
        execFileSync('node', [
          path.join(__dirname, '..', '..', 'core', 'scripts', 'check_spec_version.js'),
          '--state', path.join(__dirname, '..', '..', '.github', 'fixtures', fixture)
        ], { encoding: 'utf8' });
        return 0;
      } catch (e: any) {
        return e.status;
      }
    };
    expect(run('spec-guard-chip-ahead')).toBe(1);
    expect(run('spec-guard-chip-behind')).toBe(1);
    expect(execFileSync('node', [
      path.join(__dirname, '..', '..', 'core', 'scripts', 'check_spec_version.js'),
      '--fixture', path.join(__dirname, '..', '..', '.github', 'fixtures', 'spec-guard-bumped')
    ], { encoding: 'utf8' })).toContain('OK');
  });
});
