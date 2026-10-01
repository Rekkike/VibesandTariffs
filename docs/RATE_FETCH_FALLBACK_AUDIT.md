# Rate-Fetch Fallback Chain Audit (v0.3.5)

This document is the committed audit seam for the v0.3.5 defect-fix pass: the
rate-fetch fallback chain for the comparison view's "Fetch latest ECB rate"
button (the v0.3.2 feature). It records the defect characterization, the
fallback-endpoint verification performed live from the build environment on
2026-10-01, the items that cannot be verified from this environment, and the
failure-surface contract the implementation must satisfy. Per the standing
discipline, the extraction references under docs/sources/ remain the
authorities of record and prevail over this directive where they conflict;
no rate figure is invented here — every figure below is transcribed from a
live fetch or an archived source.

## 1. Defect characterization (Item 0.1)

**The report.** The v0.3.2 "Fetch latest ECB rate" button fails for real
users with browser network errors ("Failed to fetch" on Chrome; "Load
failed" on Safari), consistently across devices and networks, while the
same Frankfurter URL answers correctly for non-browser clients.

**Reproduced from the build environment (a non-browser client), 2026-10-01:**
the primary endpoint answers correctly —

- `https://api.frankfurter.app/latest?from=EUR&to=SEK` →
  `{ "base": "EUR", "date": "2026-09-30", "rates": { "SEK": 11.331 } }`

The endpoint itself is healthy and serves the latest TARGET publication.
The failure is therefore browser-side: a fetch that succeeds for a
non-browser client fails inside the user's browser. The candidate causes
(CORS response headers missing or changed at the origin or an intermediary;
browser, extension, DNS, or network-level domain blocking; a captive portal
or middlebox refusing the domain) all produce the same browser-visible
network error and are indistinguishable from the page's perspective.

**The defect class.** The v0.3.2 pins stubbed `global.fetch` with synthetic
responses at every level (unit pins on the parser, UI pins on the rendered
view). No test ever reached the live network, so the entire class of
browser-side network/CORS failures was invisible to the pin suite: the pins
prove the code handles the responses it is handed, not that the production
endpoint is reachable from a browser. This is the stubbed-pin gap: the
feature shipped with its network behavior unverified against the live
network, and the reporting user is the first live verification — which
failed. The honest-failure design worked as intended (the error is visible
and the current value is retained); the defect is that the fetch pins a
single third-party domain with no fallback, so every browser-side failure
of that one domain is a total feature failure.

## 2. Fallback endpoints, verified live (Item 0.2)

Only endpoints verified live from this environment on 2026-10-01 ship as
fallbacks. A 404 domain must not ship (and does not).

### 2.1 Primary — api.frankfurter.app (unchanged, retained first)

The pinned, previously-shipped endpoint; verified live 2026-10-01: latest
TARGET publication 2026-09-30, SEK 11.331 per EUR. It remains the primary:
the defect is not that this endpoint is down (it answers), but that it is
the only endpoint.

### 2.2 Fallback — ECB daily reference-rate XML (verified live)

`https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml` — the ECB's
own published daily reference-rate file, the primary source the Frankfurter
API mirrors. Verified live 2026-10-01: answers the full gesmes:Envelope XML
with `<Cube time='2026-09-30'>` and `<Cube currency='SEK' rate='11.3310'/>`,
identical (to four decimals, the ECB's own precision) to the Frankfurter
mirror's 11.331 for the same publication date. This is the highest-authority
fallback available: the ECB's own publication of the same reference rate,
on the ECB's own domain. Browser accessibility from this environment: the
ECB web domain is a public website served to browsers by design; the
sandbox cannot execute a browser fetch, so the CORS behavior of this XML
endpoint is recorded as unverifiable from the sandbox (see §3).

### 2.3 Fallback — ECB SDMX data API (bot-checked for this client, included with the observation recorded)

`https://data-api.ecb.europa.eu/service/data/EXR/D.SEK.EUR.SP00.A?lastNObservations=1&format=jsondata`
— the ECB's Data Portal API for the SDMX series EXR/D.SEK.EUR.SP00.A
(EUR→SEK, spot, daily reference rate), the same series Frankfurter
transcribes. **Bot-check observed 2026-10-01**: both the jsondata and the
csvdata requests return the Myra security-check interstitial ("Our systems
have detected unusual traffic...") for this environment's automated client
— the same observation recorded at the v0.3.0 registry attempts. The
bot-check is a network-client-based defense (it answers a browser with a
JS challenge and passes), not evidence the endpoint is down or
browser-inaccessible; the ECB documents this API for public programmatic
use. It is included as the third endpoint with the bot-check recorded here;
whether a browser fetch passes the check is unverifiable from the sandbox.

### 2.4 Rejected — api.frankfurter.dev (verified live, 404)

`https://api.frankfurter.dev/latest?from=EUR&to=SEK` answers
`{ "status": 404, "message": "not found" }` — the `.dev` mirror domain does
not serve the API's `latest` route. A 404 domain must not ship; it is
recorded as tried-and-rejected, not included in the chain.

## 3. Unverifiable from the sandbox (named)

- **Browser CORS behavior of every endpoint.** The sandbox has no browser;
  a CORS preflight/response-header check cannot be executed. The chain
  design (try each endpoint, fall through on any failure) is precisely the
  mitigation: whichever endpoint a given browser/network can reach, serves.
- **Browser reachability of the ECB XML file and passage through the Myra
  bot-check for the SDMX API** (§2.2, §2.3): the sandbox's automated client
  is not a browser; the XML answered this client fully and the SDMX API
  served it the bot-check interstitial.
- **The reporting user's specific failure cause** (which of CORS / extension
  / network blocking killed the primary for them): not determinable from
  here; the chain does not require knowing it.
- **Live-URL smoke check from the deploy environment:** cannot be run from
  this sandbox (no browser, no deploy-environment shell); recorded as the
  deferred verification note for the deploy environment, per the pass
  directive's report requirement.

## 4. Failure-surface contract (Item 0.3, confirmed)

- Any endpoint that answers with a non-OK status, an unparseable body, a
  missing rate for the pair, or that cannot be reached at all (network
  error) is a **per-endpoint failure**: the chain falls through to the next
  endpoint, collecting the per-endpoint failure reason (network vs status
  vs parse) as it goes.
- Only when **all** endpoints fail does the user-visible failure note
  render, naming each endpoint tried and each failure reason, with the
  current-value-retained guarantee (pinned default or existing override
  stays in effect, never silent).
- The successful fetch names its endpoint and publication date in the
  fetched-rate rendering (provenance already renders; it now states which
  source answered).
- The pinned default remains the model's rate regardless of any fetch —
  the unchanged contract.

## 5. Verdict

The chain ships as: (1) api.frankfurter.app (primary, unchanged);
(2) www.ecb.europa.eu eurofxref-daily.xml (the ECB's own publication);
(3) data-api.ecb.europa.eu SDMX EXR/D.SEK.EUR.SP00.A (the ECB's data API,
bot-check observed for automated clients, recorded). The `.dev` Frankfurter
mirror is rejected (404, verified). Zero drift: default state and all
figures byte-identical; only the fetch path and its rendering change.
