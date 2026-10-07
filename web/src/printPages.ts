// Comparison print/PDF export (spec v0.6.1): the page-composition model
// behind the printed comparison. Pure presentation-layer logic - it reads
// the already-computed comparison inputs (port count, rates, vessel, call)
// and derives the page structure; no engine interaction, no figure
// computation, no currency change.

// The settled break constant (spec v0.6.1): A4 portrait carries three port
// columns per printed page. SETTLED - this is a fixed typographic decision,
// never derived from any measurement: pages break after every third port
// column (3 + 3 + 3 at nine ports; at the current eight ports the pages
// hold 3 + 3 + 2). Only a spec change may move it; the print suite pins it
// by composition, not by reading this constant back.
export const PRINT_COLUMNS_PER_PAGE = 3;

// One printed page: its port columns (the selected ports in comparison
// order, sliced by the settled constant), its 1-based page number, and the
// total page count.
export interface PrintPage {
  ports: { id: string; name: string }[];
  pageNumber: number;
  totalPages: number;
}

// Pages the printed comparison composes into: the port list sliced into
// consecutive PRINT_COLUMNS_PER_PAGE-column groups. The final short page
// (3 + 3 + 2 at eight ports) is honest - it carries fewer columns, never
// stretched ones.
export function printPagesFor(ports: { id: string; name: string }[]): PrintPage[] {
  if (ports.length === 0) return [];
  const totalPages = Math.ceil(ports.length / PRINT_COLUMNS_PER_PAGE);
  const pages: PrintPage[] = [];
  for (let i = 0; i < ports.length; i += PRINT_COLUMNS_PER_PAGE) {
    pages.push({
      ports: ports.slice(i, i + PRINT_COLUMNS_PER_PAGE),
      pageNumber: pages.length + 1,
      totalPages
    });
  }
  return pages;
}

// The continuation note from page 2 onward (spec v0.6.1): a printed page
// must state which port columns it carries - "continued - ports 4-6 of 8".
// Blank (exact byte-identical predecessor) on page 1; the em-dash form is
// the printed convention (hyphens, never the screen's curly dashes, so the
// note is stable in every PDF text layer).
export function printContinuationNote(page: PrintPage, totalPorts: number): string {
  if (page.pageNumber === 1) return '';
  const first = (page.pageNumber - 1) * PRINT_COLUMNS_PER_PAGE + 1;
  const last = first + page.ports.length - 1;
  return `continued \u2014 ports ${first}\u2013${last} of ${totalPorts}`;
}
