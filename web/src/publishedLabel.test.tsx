// Published-vs-derived per-GT labeling pins (spec v0.2.68, item 3).
//
// The defect: HEL's port-dues family note rendered "6.85 SEK/GT effective —
// derived, not a published rate" — but HEL's port dues are a published flat
// per-GT rate (tariff-2026.pdf p.5, no banding), so a true statement carried
// a false implicature. The fix is conditional, not a string swap: a family's
// effective per-GT figure renders the published label with its citation
// exactly when it is a single per-GT rule with no adjustments firing; every
// aggregating figure (multiple rules, firing adjustments, a non-per-GT
// basis) keeps the derived label.
//
// Pins: HEL port dues render "6.85 SEK/GT — published flat rate, no banding
// (tariff-2026.pdf p.5)"; GOT port dues stay derived (progressive bands +
// minimum + discounts — the effective per-GT genuinely aggregates); HAM
// port dues stay derived (composite tranche); the condition is pinned —
// an aggregating family must never render the published label, and a firing
// discount moves a published family back to derived (the ESI entry at HEL).
// Zero-drift: the GOT and HAM cells render byte-identically to the
// pre-v0.2.68 surface (the derived label and every figure unchanged).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const renderComparison = async (call: CallInput) => {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const r = createRoot(c);
  await act(async () => {
    r.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={DEFAULT_VESSEL}
        call={call}
        selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
        onSelectionChange={() => {}}
        activeVessel="TEST"
      />
    );
  });
  await act(async () => { await new Promise(res => setTimeout(res, 50)); });
  return { container: c, root: r };
};

const cleanup = async (container: HTMLDivElement, root: Root) => {
  await act(async () => { root.unmount(); });
  document.body.removeChild(container);
};

// The desktop table cell for a port's port-dues family row.
const familyCell = (container: HTMLDivElement, portName: string) => {
  const row = Array.from(container.querySelectorAll('.comparison-table tbody tr'))
    .find(tr => (tr.querySelector('td')?.textContent ?? '').trim() === 'port dues');
  expect(row).toBeDefined();
  const cells = Array.from(row!.querySelectorAll('td'));
  return cells.find(td => (td.textContent ?? '').includes(portName));
};

describe('published-vs-derived per-GT labeling (spec v0.2.68, item 3)', () => {
  it('HEL port dues render the published flat-rate label with citation', async () => {
    const { container, root } = await renderComparison(defaultCall('helsingborg') as CallInput);
    const helCell = familyCell(container, 'Helsingborg');
    expect(helCell).toBeDefined();
    expect(helCell!.textContent).toContain('6.85 SEK/GT — published flat rate, no banding (tariff-2026.pdf p.5)');
    // The derived label does not render for HEL's port dues at the default call.
    expect(helCell!.textContent).not.toContain('effective — derived');
    await cleanup(container, root);
  });

  it('GOT port dues stay derived (aggregating: progressive bands, minimum, discounts)', async () => {
    const { container, root } = await renderComparison(defaultCall('gothenburg') as CallInput);
    const gotCell = familyCell(container, 'Gothenburg');
    expect(gotCell).toBeDefined();
    expect(gotCell!.textContent).toContain('SEK/GT effective — derived, not a published rate');
    expect(gotCell!.textContent).not.toContain('published flat rate');
    await cleanup(container, root);
  });

  it('HAM port dues stay derived (composite tranche, non-flat basis)', async () => {
    const { container, root } = await renderComparison(defaultCall('hamburg') as CallInput);
    const hamCell = familyCell(container, 'Hamburg');
    expect(hamCell).toBeDefined();
    expect(hamCell!.textContent).toContain('EUR/GT effective — derived, not a published rate');
    expect(hamCell!.textContent).not.toContain('published flat rate');
    await cleanup(container, root);
  });

  it('the condition is per-figure: a firing discount moves the HEL family back to derived', async () => {
    // An ESI score entry fires the 10% environmental discount on HEL's port
    // dues — the figure now combines with an adjustment, so the derived
    // label returns automatically (never a port-hardcoded string).
    const call = {
      ...(defaultCall('helsingborg') as CallInput),
      esi_score: 40
    } as CallInput;
    const { container, root } = await renderComparison(call);
    const helCell = familyCell(container, 'Helsingborg');
    expect(helCell).toBeDefined();
    expect(helCell!.textContent).toContain('SEK/GT effective — derived, not a published rate');
    expect(helCell!.textContent).not.toContain('published flat rate');
    await cleanup(container, root);
  });

  it('the mobile card renders the same conditional labeling (the shared amountCell path)', async () => {
    const { ComparisonView, __setMobileQueryForTests } = require('./App');
    __setMobileQueryForTests(() => true);
    const c = document.createElement('div');
    document.body.appendChild(c);
    const r = createRoot(c);
    await act(async () => {
      r.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('helsingborg') as CallInput}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="TEST"
        />
      );
    });
    await act(async () => { await new Promise(res => setTimeout(res, 50)); });
    const helCard = Array.from(c.querySelectorAll('.comparison-port-card'))
      .find(card => (card.textContent ?? '').includes('Helsingborg'));
    expect(helCard).toBeDefined();
    const portDuesLine = Array.from(helCard!.querySelectorAll('.comparison-card-family'))
      .find(dd => (dd.querySelector('.comparison-card-family-name')?.textContent ?? '') === 'port dues');
    expect(portDuesLine).toBeDefined();
    expect(portDuesLine!.textContent).toContain('published flat rate, no banding (tariff-2026.pdf p.5)');
    await act(async () => { r.unmount(); });
    document.body.removeChild(c);
    __setMobileQueryForTests(() => false);
  });

  it('zero-drift: the GOT/HAM derived cells and every figure render byte-identically (labels only moved)', async () => {
    const { container, root } = await renderComparison(defaultCall('gothenburg') as CallInput);
    const gotCell = familyCell(container, 'Gothenburg');
    // GOT family figure unchanged: 204,279.20 / 194,849 = 1.05 SEK/GT
    expect(gotCell!.textContent).toContain('1.05 SEK/GT effective — derived, not a published rate');
    const hamCell = familyCell(container, 'Hamburg');
    // HAM family figure unchanged: 62,030.41 / 194,849 = 0.32 EUR/GT
    expect(hamCell!.textContent).toContain('0.32 EUR/GT effective — derived, not a published rate');
    // The family amounts themselves are byte-identical to the baseline.
    expect(gotCell!.textContent).toContain('204\u00a0279\u00a0kr');
    expect(hamCell!.textContent).toContain('62\u00a0030\u00a0€');
    await cleanup(container, root);
  });
});
