# Port Call Cost Analyzer — Rotterdam Extraction Reference

Authority of record for the Rotterdam port file (docs/sources/netherlands/
rotterdam/ is this reference's directory). Provenance of record for the six
archived binaries: ROTTERDAM_SOURCE_PROVENANCE.md (the identity sidecar,
adjudicated 2026-10-08 — the MD5 table of record for every archive file;
this document cites it and never restates checksums). Where any directive
and this document differ, this document wins; directive identifications are
expectations and a mismatch is recorded as a finding, never archived as
expected.

Created: 2026-10-08 (the Rotterdam expansion pass, v0.7.0 — the first Dutch
port, the fourth expansion port of the 2026 wave). Status: authority of
record for the encoding; the checkpoints in section 6 are mandatory
verification anchors for the builder. All amounts in EUR unless stated;
the model's first port billed in EUR with a dues machinery of its own
(neither SEK nor DKK conversion in the dues layer).

## 0. Environment note (extractor)

The text extractor is not persistent in this sandbox and is reinstalled
per session (pdfplumber, pip). All page numbers below are PDF page
numbers of the archived binaries; the printed page numbers of the
brochure differ (PDF p.24 carries printed "Page 24" but the 2026 port
tariffs document has printed pp. 32–33 on PDF p.17 — each citation
states which numbering it uses).

## 1. Source documents (see the provenance sidecar for URLs, bytes, MD5s)

| # | Document | Role |
|---|----------|------|
| R1 | port-tariffs-and-conditions-port-of-rotterdam-2026.pdf | THE authority: HbR seaport dues machinery (11 steps), quay dues, waste fee, inland dues; Annex 1 rate tables; Annex 2 worked examples |
| R2 | general-terms-and-conditions-including-port-tariffs-2025.pdf | Context: prior-year edition for comparison |
| R3 | tariffs-of-third-parties-port-of-rotterdam-2026.pdf | Towage and mooring priced (Fairplay/Svitzer/Boluda; KRVE boatmen) |
| R4 | port-waste-reception-and-handling-plan_0.pdf | Context: the cost-recovery system |
| R5 | Pilotage-Tariffs-2026-RR-lr-1.pdf | Pilotage tariff of record (brochure B, the binary the tables below cite) |
| R6 | Pilotage-Tariffs-2026-RR-lr.pdf | Sibling brochure; tables verified identical (section 4) |

## 2. Binary-only items, re-verified from the binaries (2026-10-08)

The previous session died mid-extraction; its relayed results were
re-verified from the archived binaries, never trusted from text. Every
item below was re-read this session from the cited page.

### 2.1 KRVE mooring beyond 350 m (R3, PDF p. 8, printed pp. 6–7)

The A1 table's last base band is 345.00–349.99 m: mooring €3,576,
unmooring €3,327, shifting €5,178. Beyond it, per additional 5 m or
part thereof in excess of 350 m: +€126 mooring, +€117 unmooring,
+€183 shifting. Weekend/public-holiday surcharge 35% (C1); waiting-time
surcharge per A4; cancellation per A5. All four figures re-read from the
binary this session and confirmed exactly as the dying session resolved
them.

### 2.2 Waste-fee second maximum (R1, PDF p. 17, printed pp. 32–33, §3.1)

The fixed/variable structure is €220.00 fixed + €0.05 per GT, subject to
a maximum: **€2,000.00 general maximum; €3,500.00 the cruise-shipping
maximum**. Container vessels use the €2,000.00 maximum; €3,500.00 is the
cruise column, not a general cap. Re-read from the binary this session.

### 2.3 Efficiency-cap mapping (R1, PDF p. 15, printed pp. 28–29, §1.4(A))

Container ships: Deepsea 35%, Shortsea 45% (the efficiency-discount
percentages applied as GT × percentage × cargo rate to cap the cargo
component). General cargo 45%/55%; bulk, tankers, chemical/gas 133.3%.
Re-read from the binary this session.

### 2.4 Pilotage route matrix (R5, PDF p. 21, printed p. 21)

Sea → tariff area J (2e Maasvlakte) = **S-IN/OUT + TC5**. Verified
positionally (word-coordinate extraction), not only from the garbled flat
text layer: the matrix row-labels carry each area's tariff-column number
(A 1e Maasvlakte 4, B Europoort 5, ... J 2e Maasvlakte 5), and row J's
Sea cell reads S-IN/OUT + TC5. For the model's default berth area this is
the pilotage route of record. Re-read from the binary this session.

The brochure's own worked example (p. 22, Sea → 1st Maasvlakte, 105 dm)
contains an internal inconsistency, recorded as finding 3 in section 3:
its S-tariff (€5,490) matches the extracted 105 dm row exactly, but its
T-tariff amount (€1,072, labelled "tariff column 4") is the TC5 value of
that row; the TC4 value at 105 dm is €918. The other two worked examples
are internally consistent (see section 3, finding 3).

## 3. Directive-expectation mismatches (findings, recorded not forced)

1. The directive expects the pilotage S/TC table rows to run "through the
   table's upper end (239 dm)". **The binaries do not contain a 239 dm
   band.** Every S/TC table in the brochure ends at a ≥196 dm band
   (IN/OUT: ≥196 → S €11,496, TC16 €5,760; berth shift ≥196 → S €1,843;
   rendezvous ≥196 → S €7,097 — R5 pp. 29, 37, 45). The likely origin of
   the figure "239" is the TC16 value at the 35 dm IN/OUT row (239). The
   table's true upper end is the ≥196 dm band and section 4 records it
   in full.
2. The directive locates the S/TC tables "in the ~30–31 region of the
   brochure". The IN/OUT table actually spans PDF pp. 24–29 (the
   directive's own "~" notwithstanding, recorded for the page-citation
   trail).
3. **A source-document internal inconsistency** (a finding about the
   brochure, not about this archive): the brochure's worked pilot-station
   example (p. 22, Sea → 1st Maasvlakte, 105 dm) labels its route
   "tariff column 4" per the matrix but charges €1,072 — the TC5 value
   of the 105 dm row (TC4 is €918). The example's S-tariff (€5,490) and
   its arithmetic (5,490 + 1,072 = 6,562) are internally consistent; the
   column label and the matrix agree with each other (TC4); only the
   charged amount sits one column to the right of its own label. The
   brochure's other two worked examples check exactly against their
   tables and matrix cells (berth shift Botlek→Botlek 65 dm: S €364 +
   TC1 €316 = €680, berth-shift table p. 33 TC1@65 = 316 ✓; rendezvous
   → 1e Maasvlakte 191 dm: S €6,716 + TC15 + fixed €7,327 = €23,047,
   RV table S@191 = 6,716 ✓). Ruling for the encoding: the route matrix
   plus the tariff tables are the tariff of record; the inconsistent
   example amount is a brochure defect and is never used as a
   checkpoint. The encoding unit's Sea→J default (S-IN/OUT + TC5)
   follows the matrix, which the positional extraction confirms.

## 4. Pilotage IN/OUT S/TC table (R5, PDF pp. 24–29; the full record)

Draught-banded, per the "Pilotage tariffs decision ACM, 9 December 2025";
euro, exclusive of Dutch VAT. 170 bands: ≤27, then 28–195 in 1-dm bands,
then the terminal ≥196 band. Per-page row counts: p.24: 32, p.25: 32,
p.26: 32, p.27: 32, p.28: 32, p.29: 10 (32×5+10 = 170). Column-group
header on the table: A | B, I, J | C, D | E | F | G | H — TC4 serves
areas B/I/J, TC5 serves C/D (but the route matrix, section 2.4, charges
Sea→J as S-IN/OUT + TC5; the matrix is the authority for route→column
mapping). The MAREN MAERSK operating band (~145–160 dm) is covered by
the rows on p.27–p.28.

| Draught band (dm) | S-tariff (€) | TC1 | TC2 | TC3 | TC4 | TC5 | TC6 | TC7 | TC8 | TC9 | TC10 | TC11 | TC12 | TC13 | TC14 | TC15 | TC16 | Brochure page |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ≤27 | 345 | 28 | 39 | 48 | 60 | 68 | 77 | 86 | 97 | 105 | 116 | 127 | 134 | 144 | 153 | 166 | 175 | p.24 |
| 28 | 368 | 31 | 42 | 53 | 62 | 71 | 82 | 92 | 102 | 114 | 123 | 133 | 143 | 153 | 166 | 175 | 185 | p.24 |
| 29 | 392 | 34 | 44 | 56 | 67 | 77 | 86 | 100 | 109 | 119 | 130 | 143 | 149 | 166 | 175 | 186 | 196 | p.24 |
| 30 | 415 | 35 | 45 | 60 | 69 | 82 | 92 | 104 | 116 | 128 | 137 | 149 | 161 | 175 | 185 | 197 | 207 | p.24 |
| 31 | 427 | 38 | 47 | 61 | 71 | 84 | 96 | 108 | 118 | 131 | 143 | 153 | 167 | 179 | 191 | 202 | 214 | p.24 |
| 32 | 436 | 38 | 48 | 61 | 75 | 86 | 99 | 109 | 123 | 134 | 145 | 159 | 172 | 184 | 195 | 209 | 219 | p.24 |
| 33 | 448 | 38 | 49 | 62 | 77 | 88 | 101 | 113 | 127 | 137 | 148 | 161 | 176 | 189 | 200 | 215 | 226 | p.24 |
| 34 | 460 | 39 | 52 | 63 | 78 | 91 | 102 | 115 | 130 | 143 | 152 | 167 | 182 | 193 | 204 | 223 | 232 | p.24 |
| 35 | 471 | 41 | 53 | 65 | 82 | 94 | 104 | 117 | 133 | 145 | 158 | 170 | 186 | 199 | 209 | 228 | 239 | p.24 |
| 36 | 485 | 41 | 54 | 68 | 83 | 96 | 109 | 120 | 134 | 147 | 161 | 175 | 189 | 201 | 217 | 231 | 244 | p.24 |
| 37 | 514 | 43 | 57 | 70 | 86 | 102 | 115 | 129 | 143 | 158 | 172 | 186 | 200 | 214 | 231 | 244 | 258 | p.24 |
| 38 | 542 | 44 | 61 | 75 | 91 | 108 | 119 | 134 | 149 | 167 | 182 | 197 | 210 | 226 | 244 | 258 | 273 | p.24 |
| 39 | 572 | 47 | 65 | 77 | 97 | 114 | 127 | 143 | 160 | 175 | 191 | 207 | 223 | 239 | 258 | 270 | 289 | p.24 |
| 40 | 599 | 49 | 69 | 82 | 102 | 118 | 132 | 149 | 170 | 184 | 200 | 218 | 232 | 249 | 270 | 284 | 302 | p.24 |
| 41 | 628 | 53 | 71 | 86 | 105 | 127 | 137 | 159 | 178 | 191 | 210 | 231 | 244 | 262 | 284 | 298 | 316 | p.24 |
| 42 | 659 | 54 | 73 | 91 | 109 | 128 | 145 | 167 | 184 | 201 | 219 | 239 | 258 | 275 | 293 | 312 | 329 | p.24 |
| 43 | 712 | 61 | 78 | 100 | 118 | 135 | 159 | 179 | 199 | 217 | 238 | 258 | 277 | 298 | 316 | 336 | 356 | p.24 |
| 44 | 762 | 65 | 86 | 105 | 127 | 146 | 171 | 192 | 213 | 233 | 254 | 277 | 298 | 318 | 339 | 360 | 383 | p.24 |
| 45 | 816 | 69 | 91 | 114 | 134 | 158 | 184 | 206 | 228 | 248 | 271 | 298 | 318 | 340 | 363 | 385 | 411 | p.24 |
| 46 | 869 | 75 | 99 | 119 | 143 | 167 | 195 | 218 | 241 | 264 | 289 | 316 | 339 | 363 | 386 | 408 | 436 | p.24 |
| 47 | 920 | 78 | 103 | 128 | 149 | 176 | 207 | 232 | 258 | 281 | 305 | 336 | 360 | 385 | 408 | 432 | 461 | p.24 |
| 48 | 970 | 82 | 109 | 134 | 161 | 189 | 217 | 244 | 270 | 298 | 324 | 353 | 378 | 405 | 431 | 458 | 486 | p.24 |
| 49 | 1025 | 86 | 115 | 143 | 172 | 200 | 231 | 258 | 287 | 314 | 342 | 371 | 402 | 429 | 457 | 486 | 516 | p.24 |
| 50 | 1086 | 91 | 119 | 149 | 182 | 210 | 244 | 273 | 302 | 332 | 363 | 393 | 425 | 454 | 484 | 514 | 544 | p.24 |
| 51 | 1141 | 97 | 127 | 160 | 191 | 223 | 258 | 289 | 317 | 353 | 380 | 414 | 446 | 477 | 509 | 542 | 574 | p.24 |
| 52 | 1198 | 102 | 132 | 170 | 200 | 232 | 270 | 302 | 332 | 370 | 402 | 435 | 470 | 502 | 533 | 570 | 604 | p.24 |
| 53 | 1256 | 105 | 137 | 178 | 210 | 244 | 284 | 316 | 349 | 388 | 421 | 455 | 494 | 526 | 559 | 600 | 632 | p.24 |
| 54 | 1317 | 109 | 145 | 184 | 219 | 258 | 293 | 329 | 365 | 403 | 439 | 477 | 513 | 549 | 586 | 622 | 658 | p.24 |
| 55 | 1403 | 117 | 156 | 196 | 234 | 274 | 313 | 353 | 391 | 429 | 469 | 509 | 547 | 586 | 626 | 664 | 703 | p.24 |
| 56 | 1487 | 126 | 167 | 207 | 248 | 291 | 331 | 372 | 415 | 456 | 498 | 541 | 581 | 622 | 664 | 705 | 747 | p.24 |
| 57 | 1574 | 131 | 175 | 219 | 263 | 307 | 353 | 396 | 439 | 484 | 526 | 572 | 616 | 658 | 703 | 747 | 790 | p.24 |
| 58 | 1661 | 137 | 185 | 232 | 278 | 325 | 370 | 419 | 461 | 509 | 556 | 604 | 648 | 695 | 743 | 788 | 835 | p.24 |
| 59 | 1746 | 145 | 195 | 245 | 293 | 341 | 391 | 439 | 487 | 537 | 585 | 634 | 684 | 733 | 779 | 830 | 878 | p.25 |
| 60 | 1835 | 152 | 204 | 255 | 306 | 357 | 408 | 459 | 511 | 561 | 614 | 664 | 716 | 765 | 817 | 867 | 919 | p.25 |
| 61 | 1920 | 160 | 214 | 266 | 322 | 375 | 428 | 481 | 536 | 588 | 642 | 695 | 749 | 803 | 856 | 908 | 963 | p.25 |
| 62 | 2008 | 168 | 224 | 279 | 336 | 392 | 446 | 503 | 559 | 616 | 672 | 729 | 782 | 838 | 894 | 950 | 1007 | p.25 |
| 63 | 2098 | 175 | 233 | 292 | 350 | 408 | 468 | 526 | 583 | 642 | 700 | 759 | 817 | 876 | 934 | 993 | 1051 | p.25 |
| 64 | 2183 | 184 | 244 | 305 | 364 | 427 | 486 | 547 | 607 | 670 | 731 | 790 | 851 | 913 | 973 | 1032 | 1094 | p.25 |
| 65 | 2271 | 191 | 252 | 316 | 379 | 443 | 507 | 569 | 632 | 695 | 759 | 822 | 884 | 949 | 1011 | 1075 | 1138 | p.25 |
| 66 | 2356 | 197 | 262 | 328 | 393 | 458 | 525 | 589 | 656 | 721 | 787 | 852 | 918 | 983 | 1050 | 1114 | 1179 | p.25 |
| 67 | 2446 | 204 | 273 | 341 | 408 | 477 | 544 | 614 | 680 | 749 | 817 | 885 | 954 | 1023 | 1090 | 1158 | 1225 | p.25 |
| 68 | 2540 | 211 | 281 | 355 | 425 | 495 | 566 | 635 | 705 | 777 | 848 | 920 | 992 | 1062 | 1131 | 1202 | 1273 | p.25 |
| 69 | 2629 | 218 | 292 | 369 | 441 | 513 | 586 | 658 | 733 | 804 | 878 | 954 | 1027 | 1100 | 1175 | 1245 | 1318 | p.25 |
| 70 | 2722 | 226 | 302 | 380 | 456 | 532 | 606 | 681 | 758 | 834 | 908 | 988 | 1064 | 1139 | 1215 | 1290 | 1365 | p.25 |
| 71 | 2816 | 233 | 312 | 396 | 472 | 549 | 628 | 705 | 782 | 862 | 939 | 1023 | 1100 | 1178 | 1258 | 1333 | 1409 | p.25 |
| 72 | 2907 | 244 | 324 | 405 | 486 | 566 | 647 | 730 | 810 | 890 | 971 | 1053 | 1132 | 1215 | 1295 | 1377 | 1456 | p.25 |
| 73 | 2993 | 249 | 332 | 419 | 501 | 583 | 669 | 750 | 835 | 916 | 1000 | 1084 | 1168 | 1250 | 1334 | 1419 | 1503 | p.25 |
| 74 | 3081 | 258 | 342 | 429 | 516 | 602 | 687 | 772 | 861 | 944 | 1029 | 1116 | 1202 | 1288 | 1374 | 1458 | 1546 | p.25 |
| 75 | 3167 | 264 | 354 | 442 | 529 | 618 | 705 | 793 | 882 | 970 | 1060 | 1147 | 1235 | 1324 | 1410 | 1501 | 1589 | p.25 |
| 76 | 3254 | 273 | 363 | 454 | 544 | 634 | 727 | 816 | 907 | 997 | 1088 | 1179 | 1270 | 1361 | 1451 | 1541 | 1633 | p.25 |
| 77 | 3337 | 279 | 371 | 464 | 559 | 651 | 746 | 837 | 933 | 1023 | 1117 | 1209 | 1304 | 1396 | 1491 | 1584 | 1677 | p.25 |
| 78 | 3427 | 287 | 380 | 477 | 573 | 669 | 763 | 861 | 954 | 1050 | 1145 | 1241 | 1336 | 1432 | 1526 | 1623 | 1718 | p.25 |
| 79 | 3503 | 292 | 391 | 487 | 585 | 681 | 779 | 878 | 976 | 1073 | 1172 | 1267 | 1366 | 1462 | 1561 | 1656 | 1756 | p.25 |
| 80 | 3577 | 298 | 398 | 500 | 599 | 695 | 798 | 896 | 996 | 1095 | 1196 | 1294 | 1394 | 1495 | 1596 | 1693 | 1794 | p.25 |
| 81 | 3651 | 305 | 407 | 509 | 609 | 713 | 815 | 916 | 1015 | 1118 | 1221 | 1321 | 1423 | 1525 | 1629 | 1728 | 1831 | p.25 |
| 82 | 3724 | 311 | 416 | 520 | 621 | 727 | 832 | 936 | 1037 | 1141 | 1247 | 1347 | 1453 | 1557 | 1663 | 1763 | 1868 | p.25 |
| 83 | 3801 | 316 | 425 | 532 | 633 | 742 | 850 | 956 | 1059 | 1165 | 1274 | 1375 | 1483 | 1589 | 1698 | 1799 | 1906 | p.25 |
| 84 | 3878 | 324 | 431 | 541 | 647 | 757 | 864 | 971 | 1079 | 1189 | 1295 | 1404 | 1511 | 1619 | 1728 | 1835 | 1942 | p.25 |
| 85 | 3960 | 329 | 442 | 551 | 661 | 772 | 881 | 993 | 1103 | 1211 | 1322 | 1433 | 1543 | 1653 | 1763 | 1875 | 1983 | p.25 |
| 86 | 4039 | 339 | 451 | 561 | 674 | 788 | 900 | 1013 | 1126 | 1236 | 1349 | 1461 | 1574 | 1687 | 1801 | 1912 | 2024 | p.25 |
| 87 | 4121 | 345 | 460 | 573 | 688 | 803 | 918 | 1032 | 1149 | 1261 | 1376 | 1492 | 1608 | 1721 | 1837 | 1952 | 2064 | p.25 |
| 88 | 4203 | 354 | 470 | 583 | 701 | 819 | 936 | 1054 | 1173 | 1285 | 1403 | 1520 | 1638 | 1756 | 1875 | 1992 | 2102 | p.25 |
| 89 | 4283 | 360 | 480 | 592 | 716 | 835 | 954 | 1075 | 1194 | 1309 | 1428 | 1550 | 1669 | 1789 | 1911 | 2029 | 2143 | p.25 |
| 90 | 4364 | 364 | 486 | 606 | 730 | 851 | 971 | 1093 | 1215 | 1336 | 1456 | 1579 | 1700 | 1821 | 1942 | 2065 | 2187 | p.25 |
| 91 | 4444 | 371 | 495 | 618 | 743 | 866 | 990 | 1114 | 1237 | 1361 | 1485 | 1610 | 1732 | 1856 | 1979 | 2102 | 2226 | p.26 |
| 92 | 4526 | 379 | 503 | 629 | 755 | 881 | 1008 | 1133 | 1261 | 1385 | 1511 | 1638 | 1763 | 1890 | 2015 | 2142 | 2268 | p.26 |
| 93 | 4607 | 386 | 512 | 641 | 769 | 896 | 1025 | 1155 | 1284 | 1408 | 1537 | 1667 | 1795 | 1925 | 2054 | 2181 | 2307 | p.26 |
| 94 | 4687 | 394 | 520 | 650 | 780 | 914 | 1046 | 1177 | 1308 | 1434 | 1565 | 1697 | 1827 | 1957 | 2088 | 2220 | 2347 | p.26 |
| 95 | 4767 | 402 | 528 | 661 | 795 | 930 | 1064 | 1196 | 1330 | 1456 | 1592 | 1726 | 1859 | 1993 | 2126 | 2259 | 2387 | p.26 |
| 96 | 4849 | 405 | 541 | 674 | 810 | 945 | 1079 | 1215 | 1349 | 1485 | 1619 | 1755 | 1890 | 2024 | 2159 | 2294 | 2430 | p.26 |
| 97 | 4934 | 412 | 549 | 687 | 824 | 962 | 1098 | 1236 | 1375 | 1511 | 1649 | 1785 | 1925 | 2062 | 2199 | 2335 | 2472 | p.26 |
| 98 | 5020 | 420 | 559 | 699 | 838 | 980 | 1118 | 1259 | 1398 | 1537 | 1678 | 1819 | 1957 | 2097 | 2239 | 2377 | 2517 | p.26 |
| 99 | 5106 | 428 | 569 | 713 | 853 | 996 | 1138 | 1280 | 1422 | 1565 | 1707 | 1849 | 1993 | 2136 | 2276 | 2417 | 2562 | p.26 |
| 100 | 5191 | 435 | 577 | 723 | 867 | 1013 | 1158 | 1303 | 1447 | 1592 | 1736 | 1880 | 2025 | 2170 | 2315 | 2461 | 2602 | p.26 |
| 101 | 5276 | 442 | 588 | 736 | 882 | 1029 | 1177 | 1324 | 1470 | 1618 | 1764 | 1912 | 2059 | 2206 | 2354 | 2502 | 2648 | p.26 |
| 102 | 5367 | 448 | 599 | 747 | 895 | 1047 | 1194 | 1344 | 1495 | 1643 | 1793 | 1942 | 2091 | 2242 | 2390 | 2538 | 2690 | p.26 |
| 103 | 5408 | 451 | 603 | 752 | 903 | 1054 | 1204 | 1354 | 1506 | 1655 | 1806 | 1956 | 2108 | 2258 | 2407 | 2560 | 2711 | p.26 |
| 104 | 5447 | 456 | 606 | 759 | 909 | 1064 | 1211 | 1365 | 1517 | 1668 | 1820 | 1970 | 2123 | 2274 | 2428 | 2580 | 2730 | p.26 |
| 105 | 5490 | 459 | 613 | 764 | 918 | 1072 | 1220 | 1375 | 1526 | 1681 | 1833 | 1984 | 2139 | 2292 | 2445 | 2598 | 2752 | p.26 |
| 106 | 5532 | 461 | 617 | 771 | 924 | 1079 | 1230 | 1383 | 1537 | 1693 | 1845 | 1999 | 2155 | 2309 | 2465 | 2619 | 2772 | p.26 |
| 107 | 5573 | 468 | 621 | 777 | 933 | 1088 | 1237 | 1393 | 1550 | 1705 | 1861 | 2013 | 2170 | 2326 | 2481 | 2637 | 2792 | p.26 |
| 108 | 5611 | 469 | 626 | 779 | 937 | 1093 | 1248 | 1406 | 1561 | 1718 | 1875 | 2030 | 2187 | 2341 | 2498 | 2653 | 2812 | p.26 |
| 109 | 5657 | 472 | 631 | 787 | 945 | 1102 | 1260 | 1419 | 1574 | 1733 | 1890 | 2049 | 2203 | 2361 | 2519 | 2677 | 2833 | p.26 |
| 110 | 5702 | 475 | 634 | 793 | 952 | 1111 | 1272 | 1431 | 1588 | 1748 | 1905 | 2065 | 2222 | 2382 | 2538 | 2699 | 2857 | p.26 |
| 111 | 5747 | 478 | 641 | 800 | 959 | 1118 | 1281 | 1441 | 1600 | 1762 | 1923 | 2082 | 2242 | 2400 | 2562 | 2718 | 2881 | p.26 |
| 112 | 5792 | 484 | 644 | 804 | 966 | 1127 | 1293 | 1454 | 1616 | 1776 | 1938 | 2098 | 2259 | 2418 | 2582 | 2742 | 2904 | p.26 |
| 113 | 5840 | 486 | 648 | 810 | 973 | 1134 | 1304 | 1466 | 1628 | 1790 | 1952 | 2114 | 2278 | 2439 | 2601 | 2763 | 2928 | p.26 |
| 114 | 5887 | 493 | 656 | 819 | 983 | 1146 | 1310 | 1475 | 1639 | 1803 | 1966 | 2129 | 2294 | 2457 | 2622 | 2785 | 2949 | p.26 |
| 115 | 5933 | 495 | 659 | 827 | 992 | 1157 | 1322 | 1487 | 1652 | 1818 | 1982 | 2146 | 2313 | 2478 | 2642 | 2809 | 2973 | p.26 |
| 116 | 5979 | 500 | 665 | 832 | 997 | 1167 | 1333 | 1499 | 1666 | 1831 | 1997 | 2164 | 2331 | 2497 | 2661 | 2830 | 2995 | p.26 |
| 117 | 6023 | 502 | 671 | 837 | 1007 | 1177 | 1341 | 1511 | 1680 | 1845 | 2012 | 2181 | 2350 | 2516 | 2685 | 2849 | 3019 | p.26 |
| 118 | 6072 | 507 | 674 | 844 | 1013 | 1186 | 1354 | 1523 | 1693 | 1862 | 2029 | 2199 | 2367 | 2534 | 2703 | 2873 | 3042 | p.26 |
| 119 | 6116 | 509 | 680 | 851 | 1019 | 1194 | 1366 | 1536 | 1706 | 1876 | 2045 | 2215 | 2386 | 2554 | 2726 | 2896 | 3067 | p.26 |
| 120 | 6162 | 514 | 686 | 861 | 1029 | 1202 | 1374 | 1543 | 1715 | 1886 | 2058 | 2228 | 2402 | 2575 | 2745 | 2916 | 3088 | p.26 |
| 121 | 6209 | 517 | 690 | 865 | 1037 | 1209 | 1383 | 1556 | 1730 | 1901 | 2073 | 2246 | 2422 | 2595 | 2767 | 2939 | 3111 | p.26 |
| 122 | 6256 | 522 | 695 | 870 | 1046 | 1218 | 1394 | 1569 | 1743 | 1916 | 2088 | 2265 | 2439 | 2613 | 2787 | 2961 | 3135 | p.26 |
| 123 | 6301 | 526 | 700 | 877 | 1052 | 1226 | 1406 | 1582 | 1756 | 1931 | 2107 | 2282 | 2457 | 2632 | 2809 | 2982 | 3157 | p.27 |
| 124 | 6348 | 528 | 705 | 882 | 1060 | 1235 | 1418 | 1593 | 1769 | 1945 | 2123 | 2299 | 2475 | 2652 | 2829 | 3005 | 3183 | p.27 |
| 125 | 6393 | 533 | 709 | 889 | 1066 | 1244 | 1427 | 1606 | 1781 | 1959 | 2139 | 2315 | 2495 | 2671 | 2847 | 3027 | 3203 | p.27 |
| 126 | 6439 | 538 | 718 | 895 | 1076 | 1256 | 1435 | 1614 | 1793 | 1971 | 2152 | 2331 | 2510 | 2690 | 2870 | 3048 | 3227 | p.27 |
| 127 | 6487 | 542 | 721 | 901 | 1083 | 1264 | 1445 | 1625 | 1806 | 1986 | 2167 | 2349 | 2528 | 2709 | 2889 | 3070 | 3251 | p.27 |
| 128 | 6534 | 544 | 729 | 908 | 1090 | 1275 | 1454 | 1638 | 1820 | 1999 | 2183 | 2366 | 2546 | 2728 | 2910 | 3092 | 3272 | p.27 |
| 129 | 6579 | 549 | 733 | 915 | 1097 | 1284 | 1464 | 1651 | 1833 | 2015 | 2199 | 2384 | 2566 | 2747 | 2930 | 3115 | 3295 | p.27 |
| 130 | 6626 | 552 | 737 | 920 | 1105 | 1294 | 1474 | 1662 | 1845 | 2030 | 2213 | 2400 | 2583 | 2767 | 2952 | 3136 | 3319 | p.27 |
| 131 | 6671 | 556 | 743 | 928 | 1112 | 1304 | 1484 | 1675 | 1861 | 2045 | 2228 | 2416 | 2600 | 2787 | 2971 | 3157 | 3344 | p.27 |
| 132 | 6717 | 560 | 748 | 935 | 1123 | 1309 | 1496 | 1682 | 1871 | 2057 | 2244 | 2431 | 2619 | 2806 | 2992 | 3178 | 3367 | p.27 |
| 133 | 6789 | 566 | 755 | 945 | 1133 | 1323 | 1511 | 1700 | 1890 | 2078 | 2268 | 2457 | 2643 | 2833 | 3023 | 3211 | 3401 | p.27 |
| 134 | 6857 | 573 | 762 | 954 | 1146 | 1336 | 1526 | 1717 | 1910 | 2098 | 2288 | 2481 | 2671 | 2863 | 3054 | 3244 | 3436 | p.27 |
| 135 | 6926 | 577 | 771 | 965 | 1159 | 1349 | 1543 | 1734 | 1929 | 2121 | 2313 | 2507 | 2699 | 2892 | 3084 | 3277 | 3472 | p.27 |
| 136 | 6997 | 585 | 777 | 973 | 1172 | 1364 | 1559 | 1750 | 1949 | 2140 | 2335 | 2532 | 2726 | 2921 | 3115 | 3311 | 3507 | p.27 |
| 137 | 7068 | 590 | 784 | 983 | 1183 | 1377 | 1574 | 1768 | 1967 | 2160 | 2359 | 2558 | 2752 | 2952 | 3144 | 3344 | 3541 | p.27 |
| 138 | 7133 | 593 | 793 | 994 | 1192 | 1390 | 1588 | 1786 | 1984 | 2184 | 2384 | 2582 | 2781 | 2977 | 3177 | 3376 | 3574 | p.27 |
| 139 | 7214 | 604 | 803 | 1003 | 1205 | 1406 | 1608 | 1809 | 2008 | 2208 | 2409 | 2611 | 2812 | 3013 | 3214 | 3414 | 3613 | p.27 |
| 140 | 7294 | 612 | 813 | 1014 | 1218 | 1421 | 1625 | 1829 | 2032 | 2232 | 2437 | 2640 | 2843 | 3046 | 3251 | 3452 | 3653 | p.27 |
| 141 | 7376 | 618 | 823 | 1025 | 1232 | 1438 | 1642 | 1849 | 2056 | 2257 | 2465 | 2668 | 2874 | 3082 | 3286 | 3492 | 3695 | p.27 |
| 142 | 7455 | 626 | 834 | 1037 | 1245 | 1453 | 1661 | 1871 | 2078 | 2282 | 2490 | 2699 | 2905 | 3115 | 3322 | 3531 | 3734 | p.27 |
| 143 | 7539 | 632 | 844 | 1048 | 1259 | 1468 | 1680 | 1891 | 2100 | 2306 | 2517 | 2727 | 2938 | 3149 | 3360 | 3570 | 3775 | p.27 |
| 144 | 7616 | 635 | 850 | 1061 | 1273 | 1485 | 1697 | 1910 | 2122 | 2332 | 2545 | 2757 | 2970 | 3183 | 3393 | 3605 | 3817 | p.27 |
| 145 | 7687 | 642 | 856 | 1071 | 1284 | 1498 | 1713 | 1926 | 2140 | 2354 | 2569 | 2783 | 2995 | 3209 | 3423 | 3637 | 3852 | p.27 |
| 146 | 7756 | 647 | 864 | 1079 | 1296 | 1511 | 1728 | 1942 | 2159 | 2375 | 2592 | 2809 | 3023 | 3240 | 3456 | 3671 | 3888 | p.27 |
| 147 | 7826 | 655 | 870 | 1089 | 1308 | 1524 | 1744 | 1959 | 2180 | 2399 | 2614 | 2832 | 3050 | 3269 | 3487 | 3704 | 3922 | p.27 |
| 148 | 7896 | 659 | 878 | 1098 | 1321 | 1537 | 1760 | 1977 | 2199 | 2418 | 2637 | 2858 | 3075 | 3297 | 3518 | 3736 | 3958 | p.27 |
| 149 | 7967 | 666 | 884 | 1110 | 1333 | 1552 | 1775 | 1994 | 2217 | 2440 | 2660 | 2884 | 3102 | 3329 | 3550 | 3770 | 3993 | p.27 |
| 150 | 8032 | 672 | 894 | 1118 | 1339 | 1565 | 1787 | 2011 | 2238 | 2461 | 2685 | 2907 | 3133 | 3355 | 3579 | 3802 | 4024 | p.27 |
| 151 | 8101 | 677 | 901 | 1129 | 1353 | 1578 | 1805 | 2029 | 2256 | 2481 | 2708 | 2932 | 3157 | 3385 | 3608 | 3834 | 4060 | p.27 |
| 152 | 8170 | 684 | 908 | 1138 | 1366 | 1592 | 1821 | 2048 | 2274 | 2504 | 2729 | 2958 | 3185 | 3413 | 3638 | 3868 | 4095 | p.27 |
| 153 | 8242 | 688 | 916 | 1147 | 1378 | 1606 | 1836 | 2064 | 2294 | 2525 | 2753 | 2983 | 3211 | 3443 | 3671 | 3901 | 4132 | p.27 |
| 154 | 8311 | 695 | 924 | 1158 | 1390 | 1618 | 1851 | 2081 | 2314 | 2547 | 2774 | 3010 | 3238 | 3472 | 3700 | 3934 | 4165 | p.27 |
| 155 | 8382 | 701 | 933 | 1168 | 1403 | 1632 | 1867 | 2097 | 2333 | 2570 | 2799 | 3034 | 3265 | 3501 | 3729 | 3965 | 4202 | p.28 |
| 156 | 8447 | 705 | 942 | 1177 | 1410 | 1646 | 1880 | 2116 | 2351 | 2586 | 2824 | 3059 | 3291 | 3528 | 3764 | 3999 | 4234 | p.28 |
| 157 | 8519 | 713 | 949 | 1186 | 1423 | 1659 | 1895 | 2136 | 2372 | 2609 | 2845 | 3084 | 3319 | 3558 | 3793 | 4031 | 4268 | p.28 |
| 158 | 8587 | 718 | 956 | 1194 | 1436 | 1674 | 1912 | 2152 | 2390 | 2628 | 2870 | 3108 | 3346 | 3586 | 3824 | 4064 | 4303 | p.28 |
| 159 | 8658 | 723 | 963 | 1205 | 1448 | 1685 | 1929 | 2168 | 2409 | 2649 | 2891 | 3135 | 3373 | 3613 | 3854 | 4096 | 4340 | p.28 |
| 160 | 8728 | 731 | 970 | 1215 | 1460 | 1700 | 1944 | 2186 | 2430 | 2668 | 2914 | 3159 | 3400 | 3645 | 3886 | 4131 | 4375 | p.28 |
| 161 | 8799 | 736 | 979 | 1223 | 1472 | 1714 | 1959 | 2202 | 2448 | 2692 | 2938 | 3186 | 3427 | 3673 | 3915 | 4162 | 4410 | p.28 |
| 162 | 8862 | 742 | 987 | 1234 | 1482 | 1728 | 1976 | 2220 | 2467 | 2714 | 2961 | 3206 | 3455 | 3701 | 3948 | 4195 | 4443 | p.28 |
| 163 | 8934 | 747 | 995 | 1244 | 1494 | 1742 | 1992 | 2239 | 2488 | 2734 | 2983 | 3232 | 3480 | 3729 | 3977 | 4227 | 4477 | p.28 |
| 164 | 9003 | 752 | 1001 | 1255 | 1506 | 1755 | 2007 | 2255 | 2505 | 2758 | 3007 | 3258 | 3507 | 3760 | 4008 | 4262 | 4512 | p.28 |
| 165 | 9074 | 759 | 1009 | 1263 | 1519 | 1768 | 2023 | 2271 | 2525 | 2781 | 3030 | 3284 | 3533 | 3789 | 4038 | 4293 | 4548 | p.28 |
| 166 | 9143 | 764 | 1015 | 1274 | 1528 | 1780 | 2038 | 2287 | 2545 | 2802 | 3054 | 3311 | 3563 | 3818 | 4068 | 4327 | 4583 | p.28 |
| 167 | 9213 | 771 | 1023 | 1282 | 1541 | 1795 | 2055 | 2306 | 2566 | 2824 | 3075 | 3335 | 3590 | 3846 | 4102 | 4359 | 4618 | p.28 |
| 168 | 9279 | 774 | 1032 | 1291 | 1551 | 1809 | 2066 | 2325 | 2584 | 2842 | 3099 | 3358 | 3617 | 3875 | 4134 | 4393 | 4650 | p.28 |
| 169 | 9352 | 779 | 1042 | 1302 | 1563 | 1821 | 2082 | 2341 | 2602 | 2863 | 3124 | 3385 | 3643 | 3905 | 4163 | 4425 | 4686 | p.28 |
| 170 | 9420 | 787 | 1048 | 1310 | 1574 | 1835 | 2098 | 2359 | 2623 | 2886 | 3145 | 3409 | 3671 | 3934 | 4194 | 4458 | 4721 | p.28 |
| 171 | 9489 | 793 | 1057 | 1321 | 1586 | 1848 | 2114 | 2375 | 2642 | 2907 | 3168 | 3435 | 3696 | 3962 | 4224 | 4490 | 4755 | p.28 |
| 172 | 9558 | 800 | 1064 | 1330 | 1599 | 1862 | 2129 | 2392 | 2660 | 2929 | 3191 | 3461 | 3723 | 3991 | 4254 | 4525 | 4791 | p.28 |
| 173 | 9631 | 804 | 1071 | 1339 | 1612 | 1876 | 2146 | 2409 | 2682 | 2952 | 3214 | 3486 | 3750 | 4020 | 4283 | 4556 | 4826 | p.28 |
| 174 | 9695 | 810 | 1079 | 1349 | 1619 | 1890 | 2159 | 2430 | 2700 | 2970 | 3240 | 3508 | 3779 | 4049 | 4318 | 4588 | 4857 | p.28 |
| 175 | 9765 | 816 | 1088 | 1360 | 1632 | 1902 | 2176 | 2446 | 2717 | 2990 | 3264 | 3533 | 3807 | 4078 | 4349 | 4620 | 4893 | p.28 |
| 176 | 9835 | 822 | 1094 | 1369 | 1643 | 1916 | 2191 | 2465 | 2740 | 3010 | 3285 | 3561 | 3833 | 4107 | 4381 | 4654 | 4928 | p.28 |
| 177 | 9907 | 829 | 1102 | 1379 | 1655 | 1930 | 2206 | 2481 | 2758 | 3031 | 3308 | 3586 | 3858 | 4136 | 4411 | 4687 | 4965 | p.28 |
| 178 | 9974 | 835 | 1110 | 1390 | 1668 | 1942 | 2222 | 2497 | 2776 | 3053 | 3332 | 3610 | 3887 | 4165 | 4444 | 4720 | 4999 | p.28 |
| 179 | 10042 | 839 | 1116 | 1398 | 1681 | 1956 | 2240 | 2514 | 2797 | 3073 | 3355 | 3637 | 3912 | 4195 | 4476 | 4753 | 5034 | p.28 |
| 180 | 10108 | 844 | 1126 | 1406 | 1689 | 1969 | 2254 | 2532 | 2815 | 3094 | 3377 | 3660 | 3940 | 4222 | 4504 | 4785 | 5066 | p.28 |
| 181 | 10179 | 851 | 1132 | 1418 | 1701 | 1983 | 2269 | 2550 | 2833 | 3119 | 3401 | 3685 | 3967 | 4251 | 4534 | 4819 | 5102 | p.28 |
| 182 | 10250 | 856 | 1140 | 1426 | 1714 | 1996 | 2284 | 2568 | 2855 | 3140 | 3423 | 3710 | 3994 | 4280 | 4565 | 4852 | 5136 | p.28 |
| 183 | 10321 | 863 | 1147 | 1436 | 1726 | 2009 | 2300 | 2584 | 2873 | 3161 | 3448 | 3736 | 4020 | 4311 | 4594 | 4884 | 5171 | p.28 |
| 184 | 10388 | 867 | 1155 | 1446 | 1738 | 2024 | 2315 | 2600 | 2892 | 3184 | 3470 | 3761 | 4047 | 4339 | 4624 | 4916 | 5209 | p.28 |
| 185 | 10458 | 875 | 1162 | 1454 | 1749 | 2037 | 2331 | 2619 | 2913 | 3205 | 3493 | 3787 | 4075 | 4367 | 4657 | 4950 | 5244 | p.28 |
| 186 | 10526 | 879 | 1173 | 1465 | 1758 | 2052 | 2344 | 2637 | 2930 | 3223 | 3516 | 3809 | 4103 | 4396 | 4688 | 4983 | 5275 | p.28 |
| 187 | 10597 | 884 | 1179 | 1475 | 1770 | 2065 | 2360 | 2653 | 2949 | 3246 | 3539 | 3834 | 4131 | 4425 | 4720 | 5014 | 5310 | p.29 |
| 188 | 10666 | 892 | 1188 | 1485 | 1781 | 2078 | 2375 | 2671 | 2970 | 3268 | 3564 | 3859 | 4155 | 4454 | 4751 | 5047 | 5344 | p.29 |
| 189 | 10735 | 896 | 1193 | 1495 | 1795 | 2091 | 2390 | 2688 | 2989 | 3288 | 3586 | 3887 | 4183 | 4483 | 4779 | 5080 | 5381 | p.29 |
| 190 | 10806 | 903 | 1202 | 1505 | 1808 | 2105 | 2407 | 2706 | 3009 | 3312 | 3608 | 3911 | 4210 | 4512 | 4811 | 5113 | 5415 | p.29 |
| 191 | 10875 | 908 | 1208 | 1513 | 1820 | 2118 | 2424 | 2724 | 3027 | 3333 | 3632 | 3938 | 4236 | 4542 | 4840 | 5145 | 5453 | p.29 |
| 192 | 10941 | 915 | 1218 | 1523 | 1828 | 2131 | 2437 | 2742 | 3045 | 3350 | 3656 | 3960 | 4265 | 4570 | 4873 | 5179 | 5482 | p.29 |
| 193 | 11082 | 928 | 1234 | 1543 | 1850 | 2159 | 2468 | 2776 | 3084 | 3393 | 3701 | 4010 | 4320 | 4628 | 4934 | 5244 | 5553 | p.29 |
| 194 | 11217 | 939 | 1249 | 1563 | 1875 | 2187 | 2499 | 2813 | 3125 | 3436 | 3748 | 4060 | 4374 | 4687 | 4998 | 5310 | 5620 | p.29 |
| 195 | 11357 | 950 | 1265 | 1583 | 1895 | 2213 | 2531 | 2847 | 3163 | 3478 | 3793 | 4109 | 4427 | 4745 | 5059 | 5376 | 5691 | p.29 |
| ≥196 | 11496 | 961 | 1280 | 1600 | 1920 | 2241 | 2562 | 2881 | 3200 | 3519 | 3840 | 4160 | 4479 | 4800 | 5120 | 5441 | 5760 | p.29 |

## 5. Sibling-brochure identity check

R6 (the -lr binary, different MD5) was spot-verified against R5 on the
rows ≥196, 145, 146, 160 and full pages 24 and 29: the IN/OUT table
values are identical across both brochures. The pilotage figures of
record are therefore stable across the two archived binaries.

## 6. Worked checkpoints (mandatory builder anchors)

1. **The document's own Example 3** (R1, PDF p. 20, printed pp. 38–39,
   Annex 2): Deepsea container vessel, 75,246 GT, 39,000 t containers,
   ESI 35 → **€28,179.63**. The 11-step machinery: vessel €11,362.15
   (75,246 × 0.151) + cargo capped €14,800.89 (75,246 × 35% × 0.562;
   uncapped €21,918.00, the cap binds, efficiency discount −€7,117.11)
   + sustainability €5,041.48 − ESI 60% €3,024.89 = €2,016.59 →
   total €28,179.63. (The ESI discount percentage applied is 60% for
   ESI 35 per the R1 ESI table — the builder encodes the ESI bands from
   R1's §1.4(B) table in the encoding unit.)
2. **The MAREN MAERSK default call**: the efficiency cap binds on the
   cargo component at **€38,326.80** (194,849 GT × 35% × €0.562 =
   €38,326.7983 → €38,326.80; the encoding unit's fixture; the
   moves→tonnes conversion ruling is stated in that unit's record, not
   silently assumed here).

   Finding (recorded 2026-10-08, the third Unit 2 session): this
   checkpoint previously carried an assistant-side arithmetic slip in
   the first extraction session's relayed figure (a value roughly €20
   above the correct one), never a document figure. Two independent
   sessions refused to reproduce it against the arithmetic (194,849 ×
   0.35 × 0.562 has no reading that rounds to it); this session
   re-verified the correct figure against the archived R1 binary's own
   machinery (Table 2 Deepsea container cargo rate €0.562, §1.4(A)
   container Deepsea 35%) and the example-3 arithmetic on PDF p. 20,
   which reproduces exactly. The ~€20 delta was never a published
   amount at any step.

## 7. Sections to be extended by the encoding units

The seaport-dues rate tables (Annex 1 Table 1 GT tariffs and Table 2
cargo tariffs), the ESI discount band table (§1.4(B)), the towage
tariffs, and the waste-fee figures are encoded in their units and
recorded here as they are pinned; this section is the extension point.

## 7. Dues sections from the 2b line (merged 2026-10-08; fork reconciliation)

Fork reconciliation note: this section is the 2b line's dues record
(vibe/unit2-rotterdam-blueprint-ebb840), appended to this document (the
wip line's version, the authority of record) at the merge of
wip/rotterdam-v0.7.0; the 2b text-extraction archive was superseded by
the archived binaries and every citation below points at the binary.

### 7.1 Annex 1 Tables 1, 2 and 3 (R1, the archived binary)

The dues machinery (R1, port-of-rotterdam/port-tariffs-and-conditions-
port-of-rotterdam-2026.pdf, Annex 1): vessel component EUR 0.151 per GT
(Table 1), sustainability component EUR 0.067 per GT (Table 1), cargo
EUR 0.562 per tonne of Cargo with the GT-efficiency cap — chargeable
tonnage capped at 35% of the vessel's GT for Deepsea container ships
(Article 1.4(A)); waste EUR 220.00 flat + EUR 0.05 per GT (Table 2),
the published maximum EUR 2,000 capping the whole fee (EUR 3,500 the
cruise-shipping maximum, recorded never encoded); public quay EUR 3.86
per metre (or part thereof) LOA per 24 hours (or part thereof), gated on
berth_type: 'quay' — never default-fired (Table 3 and the live quay
surface).

### 7.2 The ESI discount bands (Annex 1 §1.4, live-verified)

| ESI score from | ESI score to | ESI NOx score | Discount % |
|---|---|---|---|
| 1  | 21 | n/a | 5 |
| 21 | 31 | n/a | 10 |
| 31 | 41 | n/a | 60 |
| 41 | 61 | n/a | 80 |
| 61 | —  | n/a | 100 |
| 81 | —  | to 60 | 100 |
| 81 | —  | from 60 | 120 |

The 120 percent NOx variant is recorded here, never encoded (the
least-favourable discipline): the model carries no ESI NOx sub-score
input, so the unconditional 100 percent band at ESI ≥ 61 is the top
encoded band — a benefit is never overstated.

### 7.3 Recorded, never encoded (the container-call scope)

- Green Award discount (requires the certificate attestation — no input).
- The 45 percent Shortsea efficiency variant (Article 1.4(A): Shortsea
  container ships cap at 45% of GT; the Deepsea 35% figure is the
  encoded default; recorded here as the variant of record).
- Inland port dues (§3 — the inland vessel scope).
- The statement surcharges (Articles 9.3/11: 25% on the highest rate —
  a compliance penalty, never a default figure).
- The cruise waste maximum EUR 3,500 (the container maximum 2,000 is
  the encoded cap; the 3,500 figure is the cruise column of record).
- Towage and pilotage (third-party billers; pilotage is Units 3-5, the
  S/TC tables in section 4 above).

### 7.4 The quay dues (R1 Table 3, live-verified)

EUR 3.86 per metre per commenced 24-hour period under
berth_type: 'quay' (a 50-hour call prices three commenced periods);
the default call carries no quay line — the condition gate never fires
without the berth_type input.

### 7.5 The worked examples (R1 Annex 2)

The Annex 2 worked examples, reproduced in the blueprint's rounding
design: Example 3 (75,246 GT, 39,000 t, ESI 35) — vessel 11,362.15,
cargo uncapped 21,918.00 capped 14,800.89 (delta 7,117.11), sustainability
printed 5,041.48 with ESI discount 3,024.89, net 2,016.59, dues total
28,179.63. The MAREN and VISTULA fixtures (the blueprint's verified
design record) reproduce cent-exact against the encoded machinery.

## 8. Towage and mooring (Unit 4, recorded 2026-10-08; R3 the archived binary)

### 8.1 Towage - the three operators' tables (R3, PDF p. 2 Fairplay and Svitzer; p. 3 Boluda; all re-read positionally from the binary this session)

Fairplay Towage (assistance from river to berth or vice versa, rates in
EUR per tug; base rates for City/Waalhaven/Botlek/Europoort/Maasvlakte I;
plus 25% for the Maasvlakte II or Brittanienhaven Area):
  <=130: 3,345 | 131-160: 3,345 | 161-190: 3,729 | 191-220: 4,329 |
  221-250: 5,363 | 251-280: 5,940 | 281-310: 6,254 | 311-340: 6,875 |
  341-370: 7,524 | 371-425: 8,250.
Maximum assistance time 2 h (2.5 h Maasvlakte II); hourly rate 1,650 per
commenced hour; no night/weekend/holiday surcharges; dead ships +50%;
visibility < 500 m +50%; LNG carriers +150%; tidal-restricted vessels +50%.

Svitzer Euromed B.V. (zones: A Berthing/Sailing Maasvlakte; B Europoort;
C Rotterdam area; AII shifting within the same zone; rates per tug, EUR):
LOA bands <=164 / 164-175 / 175-187 / 187-212 / 212-236 / 236-260 /
260-285 / 285-309 / 309-334 / 334-358 / 358-383 / 383+.
Zone A (Maasvlakte): 2,041 / 2,269 / 2,446 / 2,983 / 3,308 / 3,740 /
4,209 / 4,571 / 4,976 / 5,241 / 5,453 / 5,737.
Zone B: 2,188 / 2,414 / 2,590 / 3,129 / 3,454 / 3,884 / 4,354 / 4,717 /
5,120 / 5,387 / 5,597 / 5,881.
Zone C: 2,771 / 2,998 / 3,175 / 3,712 / 4,037 / 4,468 / 4,937 / 5,561 /
6,120 / 6,427 / 6,699 / 7,204.
AII: 2,822 / 3,183 / 3,337 / 3,774 / 4,235 / 4,609 / 5,266 / 6,230 /
6,786 / 6,973 / 7,561 / 8,401.
Waiting/additional time 2,722/h; dead ships 200%; cancellation tiers.

Boluda Towage Rotterdam B.V. (ROTTERDAM/EUROPOORT from the river to or
from: row 1 the Rotterdam and Europoort area, max 2 h; row 2 the
Maasvlakte 2 area, max 2.5 h; rates per move and for each tug employed,
EUR; LOA bands <=163 / 164-175 / 176-187 / 188-212 / 213-236 / 237-260 /
261-285 / 286-309 / 310-334 / 335-358 / 359-383 / 384-425):
Row 1: 2,983 / 3,389 / 3,795 / 4,225 / 5,125 / 5,810 / 6,180 / 6,223 /
6,775 / 7,581 / 7,854 / 8,191.
Row 2 (Maasvlakte 2): 3,729 / 4,236 / 4,743 / 5,281 / 6,406 / 7,263 /
7,725 / 7,779 / 8,469 / 9,477 / 9,818 / 10,239.
Waiting 1,625/h; dead ships +50%; fog +50%; LNG restrictions +150%;
deep-draught restrictions +50%; holidays +25%; shifting within area +50%.

Adjudication (the Unit 4 directive's rule, applied to the MV2 rates - the
model's default berth is 2e Maasvlakte, the Maasvlakte II area): at the
MAREN reference LOA band the three MV2 per-tug rates are Fairplay
8,250 x 1.25 = 10,312.50 (the base band rate plus the area surcharge),
Svitzer zone A 5,737, Boluda row 2 10,239 - not identical, so the median
rule applies: the median of {10,312.50, 5,737, 10,239} is 10,239 and
Boluda is the default operator. Cross-check on the base rates (the
operators' own tables before area surcharges): median of {8,250, 5,737,
8,191} is 8,191 - also Boluda. Both readings select Boluda; the choice
is recorded, the other two operators' figures above are the record.
The tug count rides the estimated-parameter convention (the settled
shared LOA-class default: <150 m: 0; 150-250 m: 1; >250 m: 2,
user-overridable, never re-flagged, never re-invented).

### 8.2 KRVE mooring (R3, PDF p. 4, printed p. 7, the A1 table)

Koninklijke Roeiers Vereeniging Eendracht, rates per sea-going vessel in
the Rotterdam harbour-area (EUR), by LOA band; three class columns:
mooring, unmooring, shifting. The full A1 base table runs from <=99.99 m
(mooring 199, unmooring 186, shifting 289) to the last base band
345.00-349.99 m (mooring 3,576, unmooring 3,327, shifting 5,178).
Beyond it, per additional 5 meters or part thereof in excess of 350
meters: mooring +126, unmooring +117, shifting +183. Weekend/public-
holiday surcharge 35% (C1); waiting time per A4; cancellation per A5;
lock variants per A1a-e (recorded); A2 assistance 79.00 per man per hour,
minimum 2 hours (recorded). All figures re-read from the binary this
session.

Adjudication (the Unit 4 directive's rule): the document designates no
standard class; the median of {3,576, 3,327, 5,178} at the last base band
is 3,576 - the mooring class is the default; the other two classes are
recorded above. The model's call prices mooring and unmooring (the call's
two compulsory boatmen services at the berth; shifting is a within-port
movement case, priced by its own column only when a shift occurs - not a
default-call service). Mooring is default-fired: the KRVE concession is
mandatory in practice. A vessel LOA below the table's lower bound is a
stop-and-report, never an extrapolated figure.
