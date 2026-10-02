# National Extraction Reference — Port Call Cost Analyzer

Authority of record for the Swedish national fairway-dues and pilotage block
(Sjöfartsverket), shared by the five Swedish silos: Gavle, Gothenburg,
Helsingborg, Norrköping, and Norvik. The national rules are transcribed in
each port's own YAML file (the silo contract); this reference is written once
and cited by all five — the shared-machinery pattern extended to the source
tree. Where any builder directive conflicts with this document, this document
prevails. All amounts in SEK.

Created: 2026-10-02 (the national-archive pass, v0.4.5) — the directory's
first resident. Before this pass the prislista was not archived in-repo; the
five silos' national rules cited this path through the not-archived marker
(spec v0.2.32), and earlier revisions of the port extraction references
claimed an archive path that never existed (the v0.2.37 repair's precedent
class; the v0.4.4 audit's citation-integrity finding, closed by this pass).

---

## 1. Source

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| N1 | Sjöfartsverket, "Prislista farleds- och lotsavgifter 2026" (summary of fairway and pilotage dues effective 2026-01-01) | Sjöfartsverket (the Swedish Maritime Administration) | Yes | `docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.txt` (text extraction; the binary PDF is not archived — recorded limitation below) |

- Fetch URL (N1): https://www-n.sjofartsverket.se/globalassets/tjanster/anlopstjanster/sjofartsverkets-farleds--och-lotsavgifter/prislista-farleds--och-lotsavgifter-2026.pdf
- Fetch date (N1): 2026-10-02
- SHA-256 (the archived text extraction): `fa1cfe5a5bf90a6f0b22f30abd3e832f4e01c9dcdc907987e96cf92f720d4699`
- Recorded limitation (the binary-fetch gap): the sandbox fetch tooling
  retrieves the upstream PDF as text extraction only; the binary PDF bytes
  are not retrievable by this environment (the v0.4.4 audit reported the same
  limitation; re-tested this pass, unchanged). The archive is the verbatim
  text extraction as fetched, with its provenance recorded here — never a
  fabricated archive. The binary PDF remains available at the upstream URL;
  a future environment with binary-fetch capability may replace the text
  extraction with the PDF, re-verifying figures against it at that time.

## 2. Identity verification (N1)

- Issuer: Sjöfartsverket (the Swedish Maritime Administration) — the
  publisher domain (sjofartsverket.se) and the document's own heading
  ("Sammanfattning av Sjöfartsverkets farledsavgifter" / "Sammanfattning av
  Sjöfartsverkets lotsavgifter").
- Title: "Prislista farleds- och lotsavgifter 2026" (the price list for
  fairway dues and pilotage, 2026 edition) — the URL segment names the
  document; the content is the two summary sheets it publishes.
- Edition: 2026.
- Validity: "fr.o.m. 2026-01-01" (effective from 1 January 2026), stated in
  both summary headings.
- Structure: two sections — fairway dues (fartygsavgift by dräktighetsklass
  × miljöklass, beredskapsavgift, gods- och passageraravgift, transitgodsrabatt,
  frekvent trafik, miljöincitament/CSI nedsättning, Föreskrift 2025:6) and
  pilotage dues (lotsavgift per ½h by class, extra lots, lotsrabatter,
  beställningsavgift bands, Föreskrift 2025:5). Match — archived as expected.

## 3. Figures verified against this archive (v0.4.5 re-verification)

The v0.4.4 audit verified the transcribed figures against an ad-hoc text
fetch of the same URL; this pass re-verifies them against the archived
document. Every figure identical:

- Dräktighetsklass boundaries (lägsta nettodr.): 0 / 1 000 / 2 000 / 3 000 /
  6 000 / 10 000 / 15 000 / 30 000 / 60 000 / 100 000 — identical.
- Fartygsavgift class 9, D/E: 201 805 kr/anlöp — identical (class-9 row
  40 360 / 90 815 / 181 625 / 201 805).
- Beredskapsavgift class 9: 60 370 kr/anlöp — identical.
- Lotsavgift class 9: startavgift 35 755 kr, rörlig avgift 8 105 kr per ½h —
  identical.
- Beställningsavgift bands: 0–59 min 9 390; 1–1:59 7 510; 2–2:59 5 635;
  3–3:59 3 775; 4–4:59 1 880; oberoende av dräktighetsklass — identical.
- Godsavgift: högvärdigt gods 3,36 kr/ton; lågvärdigt gods 1,67 kr/ton —
  identical (passageraravgift 2,52 kr/pax and privata fordon 3,36 kr/st are
  the GOT-only components, never fired on container calls).
- Frekvent trafik scale: anlöp 1–2 100 %; 3 75 %; 4 50 %; 5 25 %; 6+ 0 % —
  identical.
- Miljöincitament (CSI): A 80 %; B 55 %; C 10 %; D/E 0 % — identical.

All five silos' transcriptions match the archive exactly; no figure, rate,
or condition changed in this pass (the citation-repair pass is bookkeeping
only; zero-drift on all six pinned totals).

## 4. Citation repair (v0.4.5)

The five Swedish silos' national rules cite
`docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.pdf`
with an `upstream_url` marker (the not-archived mechanism, spec v0.2.32).
The archived fetchable artifact is the text extraction (`.txt`), and the
binary PDF remains outside the repository; the citations are corrected to
the archived document's real path. The false-path finding (a cited
repository path that never existed) is closed: every citation now resolves
to this archive, and the not-archived marker set for the prislista paths is
emptied (the archive-presence pin: a silo's document_url pointing at a
non-existent path fails the source-integrity suite).
