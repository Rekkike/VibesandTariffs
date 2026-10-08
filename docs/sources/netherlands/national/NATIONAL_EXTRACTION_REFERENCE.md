# Netherlands National Extraction Reference — Port Call Cost Analyzer

Authority of record for the Dutch national layer. This layer is **empty
by understanding**: no national port-dues statute applies to the model's
Dutch ports, and this document records why, so that no future session
re-opens the statute hunt.

Created: 2026-10-08 (the Rotterdam expansion pass, v0.7.0).

## 1. The finding

Rotterdam — the first Dutch port, and in the model's current scope the
only one — has **no municipal port-dues statute**. Havenbedrijf Rotterdam
N.V. (HbR) levies its seaport dues, quay dues, and waste fee under
**private law, through its published General Terms and Conditions
including Port Tariffs** (the archived
docs/sources/netherlands/rotterdam/port-of-rotterdam/
port-tariffs-and-conditions-port-of-rotterdam-2026.pdf, THE authority of
record for the Rotterdam figures). The rate authority is a publisher's
terms document, not a statute or ordinance. The statute hunt is closed
by understanding; the adjudication and the trap-document record live in
docs/sources/netherlands/rotterdam/ROTTERDAM_SOURCE_PROVENANCE.md (the
identity sidecar, § "Excluded, never fetched, never archived").

## 2. The excluded traps (recorded so they are never re-chased)

Two municipal ordinance files appeared in the Drive staging of the
source-collection session — "Verordening op de heffing en de invordering
van havengelden 2026" and "Zeehavengeldverordening 2025" — and were
**confirmed by the staging's own verified manifest to be Alkmaar's and
Vlaardingen's respectively, not Rotterdam's**. They are not national
instruments and not Rotterdam instruments; they were never fetched and
never archived. No Dutch port in the model's scope may cite them.

## 3. What the Dutch ports do share, and where it lives

The silo discipline (ports are data silos; shared national rules are
referenced, never duplicated) has no Dutch national block to reference.
Pilotage in the Rotterdam-Rijnmond region is provided under the Dutch
pilots' own regional tariff (Loodswezen, decision ACM 9 December 2025)
— a regional, not national, instrument; it is archived under the
Rotterdam silo (docs/sources/netherlands/rotterdam/loodswezen/) and
cited by the port's extraction reference. Should a second Dutch port be
added whose pilotage region differs, that port archives its own
regional brochure under its own silo; no national layer is created by
convenience.

## 4. Scope note

This document records an absence. No YAML, no engine constant, no code
change is attached to it. If a future Dutch national instrument is
identified (for example a future national waste-reception fee), the
adding pass records it here first, with its archive path and
provenance, before any port YAML cites it.
