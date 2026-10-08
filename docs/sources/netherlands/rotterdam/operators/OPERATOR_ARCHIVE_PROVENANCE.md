# Rotterdam operator archive — provenance of record (v0.8.0, Item 0)

The four deep-sea container terminal operators at Maasvlakte and their
conditions/tariff documents, archived per the directive. Every figure this
pass cites is traceable to one of these binaries or to the v0.7.0 archive.

## vrto/

1. `vrto-general-terms-conditions-en.pdf` — **VRTO uniform General Terms
   and Conditions (EN)**, the uniform conditions of the Rotterdam Terminal
   Operators' Association (filed at the Registry of the District Court of
   Rotterdam on 11 December 2023; the ECT truck-conditions document and
   the RWG terminal-conditions page both defer to it).
   - Source URL (fetched): `https://rwg.nl/nl/media/236` (the RWG-hosted
     download of the VRTO conditions — RWG's own terminal-conditions page
     states "The VRTO Conditions can also be downloaded by clicking the
     button below", and this is that download; the vrto.nl origin
     `https://vrto.nl/wp-content/uploads/2023/12/EN-20231130-VRTO-voorwaarden.pdf`
     is captcha-gated from this sandbox, the fetch-route record below).
   - Bytes: 140,707
   - MD5 (identity of record, computed): `26a589086cc561f2f98270656803ed19`
   - Content verified: 7 pages; Article 6.6 (liability 2 SDR/kg to a
     maximum of 100,000 SDR per event); Article 8.2 (UNUM Arbitration
     Rules, Rotterdam); Article 10.1 (the successor of the Association of
     Rotterdam Stevedores 1976 conditions); English translation with the
     Dutch text prevailing (Article 10.2) — each clause read from the
     binary this session.

## ect/ (in this folder; ECT Delta and ECT Euromax are Hutchison Ports
terminals at 1e Maasvlakte)

2. `ect-tarieven-wegvervoer-2026-v1.0.pdf` — **ECT Tarieven wegvervoer
   2026 v1.0** (the truck-tariff schedule; applicable to the Hutchison
   Ports ECT Delta, ECT Euromax and Delta II terminals; valid
   1 January – 31 December 2026).
   - Source URL (fetched):
     `https://www.ect.nl/sites/d10p.ect.nl/files/2025-10/tariefblad-truck-2026-v1.0.pdf`
   - Bytes: 133,190
   - MD5 (identity of record, computed): `9afa1cdf587657aa4ce10b7a48aca2b9`
   - Content verified: 1 page; the spread surcharge, spread premium and
     climate tariff schedule (landside truck charges — the finding of
     record: ECT publishes **landside-only** rates in this class of
     document; no vessel-side handling rate is published).

3. `ect-algemene-voorwaarden-tarieven-wegvervoer-v2.0-januari-2026.pdf` —
   **ECT Algemene voorwaarden tarieven wegvervoer, versie 2.0 januari
   2026** (the truck-rate conditions governing the schedule above; names
   the VRTO conditions as governing all ECT services).
   - Source URL (fetched):
     `https://www.ect.nl/sites/d10p.ect.nl/files/2025-10/algemene-voorwaarden-tarieven-wegvervoer-versie-1-januari-2026.pdf`
     (the file's own printed version is 2.0 januari 2026; the URL path
     carries the upload slug "versie-1-januari-2026", recorded verbatim —
     the binary's printed title is the identity of record).
   - Bytes: 197,086
   - MD5 (identity of record, computed): `2905928133095fe67cf07572de00b75b`
   - Content verified: 3 pages; the definitions include the VRTO
     conditions; the conditions govern the truck charges only.

## rwg/ (Rotterdam World Gateway, 2e Maasvlakte)

4. `rwg-general-purchase-conditions.pdf` — **RWG General Purchase
   Conditions** (Algemene inkoopvoorwaarden Rotterdam World Gateway B.V.,
   versie juni 2020; the conditions of record for RWG's purchase of goods
   and services — RWG's terminal-conditions page states its activities
   are subject to the VRTO conditions, with these purchase conditions
   applying to its purchases).
   - Source URL (fetched): `https://www.rwg.nl/media/123/` (RWG's own
     media link; the English terminal-conditions page's "General Purchase
   Conditions" anchor).
   - Bytes: 231,041
   - MD5 (identity of record, computed): `0d5248238bcaf2cb494d29d7229fb789`
   - Content verified: 2 pages; versie juni 2020; the purchase-conditions
     scope (Koper/Leverancier) — a vendor-side document, the finding of
     record: RWG publishes **conditions-only**; no tariff, no priced
     schedule, and no vessel-side handling rate exists in its published
     record.

## apmt/ — STOP-AND-REPORT (recorded 2026-10-08)

5. **APMT Maasvlakte II terms** — NOT ARCHIVED. The directive's declared
   route: the terms page (`https://www.apmterminals.com/en/maasvlakte/
   services/terms-and-conditions`) is CDN-blocked from every sandbox
   route (observed: HTTP 403 Access Denied via the Akamai edge,
   Reference #18.5b6a645f.1791483780.96876f83), and the user-delivered
   print-to-PDF has **not reached the Drive Rotterdam folder** (the
   folder's contents enumerated this session: only the v0.7.0 sources and
   the manifests). Search-snippet evidence is context, never the archive,
   per the directive. This item waits on the user's delivery into the
   Drive Rotterdam folder; the §9 finding for APMT MVII ("no published
   tariff of its own, deferring services to VRTO", per the search-record
   context) is recorded as CONTEXT ONLY in the reference and is not cited
   as archive evidence until the binary arrives.

## Fetch-route record (environment, for future sessions)

- `vrto.nl` direct fetches are captcha-gated from this sandbox (the
  sgcaptcha interstitial observed on every route, including the wp-content
  PDF path); the RWG-hosted mirror of the same filed document fetches
  cleanly and is the archived route, the origin recorded.
- `d10p.ect.nl` does not resolve from this sandbox (gaierror); the same
  files are served from `www.ect.nl/sites/d10p.ect.nl/files/...` and
  fetch cleanly there.
- `apmterminals.com` is CDN-blocked (Akamai 403) on every route tried.
