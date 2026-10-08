# Rotterdam source archive — provenance of record

Provenance header for the six archived documents of the Rotterdam expansion
(v0.7.0, Item 0). This file is the identity sidecar for the binaries; the
extraction reference (`ROTTERDAM_EXTRACTION_REFERENCE.md`, built in the
encoding units) carries the content record and cites this file as its
provenance authority.

## Identity standard (adjudicated, 2026-10-08)

The originally delivered MD5 table was **voided by adjudication**: its
checksums were computed by an assistant-side hashing tool proven unreliable
(its sibling sha256sum failed outright in the same session; its stat
reported a 4.9 MB PDF as "179 bytes"). Those checksums describe nothing
real and are recorded nowhere as expectations. The identity of record is
the MD5 computed from the fetched bytes, below. Byte-identity is
established by reproducible fetches: every file was fetched from its
canonical publisher URL, and the byte counts match the Drive-staged
copies' metadata exactly (Drive `file_size` for all six), independently
confirmed. Where two fetch routes were available, they agreed.

## Archived documents

All fetched 2026-10-08 from the publishers' own document URLs.

### port-of-rotterdam/

1. `port-tariffs-and-conditions-port-of-rotterdam-2026.pdf` — **THE
   authority** (General Terms and Conditions including Port Tariffs 2026;
   Annex 1 inside, 25 pp).
   - Source URL: https://www.portofrotterdam.com/sites/default/files/2025-12/port-tariffs-and-conditions-port-of%20-rotterdam-2026.pdf
   - Bytes: 4,910,526
   - MD5 (identity of record): `3463ad43438dc2be69bbf4bd4bffeecf`
2. `general-terms-and-conditions-including-port-tariffs-2025.pdf` —
   context (prior-year edition; step tables and worked examples for
   comparison).
   - Source URL: https://www.portofrotterdam.com/sites/default/files/2026-01/general-terms-and-conditions-including-port-tariffs-2025.pdf
   - Bytes: 3,241,289
   - MD5 (identity of record): `405f201799b5562cddfb5c706dcdc7cc`
3. `tariffs-of-third-parties-port-of-rotterdam-2026.pdf` — towage and
   mooring priced (Fairplay/Svitzer/Boluda per tug; KRVE boatmen).
   - Source URL: https://www.portofrotterdam.com/sites/default/files/2026-01/tariffs-of-third-parties-port-of-rotterdam-2026.pdf
   - Bytes: 1,773,603
   - MD5 (identity of record): `8e6fc9b2b1498576ebdbeb5a6d2e14c2`
4. `port-waste-reception-and-handling-plan_0.pdf` — context
   (cost-recovery system; the waste rates live in the 2026 terms'
   Annex 1).
   - Source URL: https://www.portofrotterdam.com/sites/default/files/2024-02/port-waste-reception-and-handling-plan_0.pdf
   - Bytes: 869,410
   - MD5 (identity of record): `c855ef1c2132e50ab12127a463c6e37a`
   - Route note: this file was additionally downloaded complete via the
     authenticated Drive route in the same session; the Drive copy and
     the site copy share their exact opening object bytes
     (`%PDF-1.7 ... 4332 0 obj ... Length 240 ...`), corroborating
     byte-identity across sources.

### loodswezen/

5. `Pilotage-Tariffs-2026-RR-lr.pdf` — brochure A (7,440,925 B,
   distinct from -1). The pilotage tariff of record together with 6.
   - Source URL (found on the Dutch region page
     loodswezen.nl/regios/rotterdam-rijnmond/, which links this
     brochure; the English page links only -1):
     https://loodswezen.nl/wp-content/uploads/2026/05/Pilotage-Tariffs-2026-RR-lr.pdf
   - Bytes: 7,440,925
   - MD5 (identity of record): `b9a3143e9bef075019b01b168a2f0efc`
6. `Pilotage-Tariffs-2026-RR-lr-1.pdf` — brochure B (7,377,298 B,
   different checksum; a complete Pilotage Tariffs 2026
   Rotterdam-Rijnmond brochure carrying the S/TC tables). Both archived
   per the directive.
   - Source URL: https://loodswezen.nl/wp-content/uploads/2025/12/Pilotage-Tariffs-2026-RR-lr-1.pdf
   - Bytes: 7,377,298
   - MD5 (identity of record): `67f253368ca1666b3a9c1e25e4717281`

## Excluded, never fetched, never archived

The two municipal ordinance files present in the Drive staging
("Verordening op de heffing en de invordering van havengelden 2026" and
"Zeehavengeldverordening 2025") are **traps, confirmed by the staging's
own verified manifest**: Alkmaar's and Vlaardingen's respectively, not
Rotterdam's. Rotterdam has no municipal port-dues statute; HbR levies
under private law through its published General Terms, which are the
rate authority. The statute hunt is closed by understanding.

## Fetch-route record (environment, for future sessions)

`curl` and `wget` are blocked in this sandbox; plain `python3 urllib`
worked for every public canonical URL (with an unverified-SSL context
for loodswezen.nl, whose chain this sandbox cannot verify). Google
Drive direct endpoints are auth-gated from the sandbox (sign-in
redirects); the Drive files are owner-private. The authenticated Drive
MCP can download full base64 but has no path-write capability, and
re-emitting multi-megabyte base64 through model output is not a
corruption-proof identity route and was not used for archiving.
