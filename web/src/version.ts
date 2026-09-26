// Version constant (spec v0.2.68, item 1): the single web-layer source of
// truth for the application version. The header chip renders this constant,
// and the version guard cross-checks it against the specification header —
// a chip ahead of the spec (a bump that skipped the spec row) or behind
// (a spec bump that skipped the constant) fails CI. The bump ritual gains
// one step: spec header, changelog row, and this constant, all in the
// same change. This is the only place the web layer carries the version.
export const APP_VERSION = 'v0.2.70';
