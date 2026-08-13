# Decision 001 — Table 9 annual energy unit

Date: 2026-08-12
Status: accepted

## Decision

Represent the scenario-modeling paper's Table 9 energy values as `annualEnergyUseJ` and display
them as joules per year.

## Evidence

Table 9 does not print a unit beside its `Energy use` column. Its caption and surrounding text say
that the authors calculate annual energy use from 75 GJ per person per year. Multiplying each
reported population by 75 GJ and converting to joules reproduces the displayed magnitudes to the
table's precision. For example, S1 gives approximately `3e10 × 75 GJ = 2.25e21 J`, displayed as
`2e21` in the paper.

The previous contract named these unchanged magnitudes `annualEnergyUseGj`, causing the frontend
to label `2e21` as gigajoules and overstate annual energy by a factor of one billion.

## Contract change

- Canonical field: `annualEnergyUseGj` → `annualEnergyUseJ`.
- TypeScript schema and all current consumers change with the canonical record.
- The reported numbers remain unchanged; only their explicit unit and field name are corrected.
- Source remains `JANUS-PAPER-01`, `arXiv:2409.00067v3`, page 18, Table 9.

## Remaining review

This correction should be included in the source-versus-normalized scientific review artifact and
signed off before a reviewed canonical data release.
