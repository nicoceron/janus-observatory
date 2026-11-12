# Decision 037 — Nostromo titles

2026-11-10. Scope: the display face for titles and headings, the heading sizes and leading that
follow from it, and six shortened titles. Supersedes the headline face (Newsreader) of Decision 036.
Body text stays in Hanken Grotesk. Canonical data, the 3D worlds, story choreography and the
scientific rules in `AGENTS.md` are unchanged.

## Request

The project owner asked for titles and headings to use Nostromo Bold, a sci-fi display face they
chose, and for the titles to be shortened a bit so the wide face sits well.

## Licence status: unconfirmed

The font's name table credits Great Scott (designer Daniel Feldt, greatscott.se), a commercial
foundry. The file arrived without a licence, and its OS/2 `fsType` 8 (editable embedding) is a
document flag, not a web licence. **A web-font licence must be confirmed before this ships
publicly.** The [typography ledger](qa/release-polish/typography-ledger.json) records it as
`pending_license`, with the original and derivative checksums and the subsetting command. The
Sources page credits the foundry and designer and makes no licence claim. If no licence can be
obtained, revert `apps/web/app/layout.tsx`'s display font. The size and leading changes in this
decision were tuned for an all-caps wide face and would need retuning for a serif.

## The face

- One cut (family "Nostromo Regular", style "Bold"), unicase: lowercase glyphs are capitals, so
  every title reads in capitals while the DOM text keeps its normal case for screen readers,
  search and copy-paste. No `text-transform` is used.
- Subset to Latin-1 plus general punctuation with `pyftsubset` (fontTools 4.62.1): an 8,536-byte
  WOFF2 (from a 51,576-byte OTF) at `apps/web/app/fonts/nostromo-bold-latin.woff2`. Kerning,
  `case`, `locl` and the figure features survive. Every character currently rendered in the face
  was checked against the subset.
- Served by `next/font/local`, so the bundler fingerprints and preloads it, as it did Newsreader's
  131,848-byte Latin file. The home page's critical font payload drops by about 123 KB.
- The `@font-face` declares `font-weight: 100 900` so every existing heading weight matches the
  single cut, and headings set `font-synthesis: none`, so browsers never fake a weight or slant.

## Size

Nostromo is about 1.68× as wide as Newsreader at the same font size, and its cap height is 0.70 em
against Newsreader's 0.67. `size-adjust: 70%` on the face scales every heading at once:
capitals land between Newsreader's x-height and cap height, and lines run about 18% wider than
before. Font sizes in CSS still read as the old nominal scale.

`adjustFontFallback` is off because next/font would size its Arial fallback to the unadjusted
face. `globals.css` declares `Janus Display Fallback` instead: Arial at 108.09% (Nostromo's average
advance is 1.544× Arial's, times 0.70), with matching ascent and descent overrides.

## Layout

- **Leading.** Capitals have no descenders, so the old serif leading (0.95–1.1) left wide gaps.
  Large titles now use 0.82–0.86, mid-size headings 0.88–0.9, small ones 0.95–1: about 1.2×
  the rendered em between baselines.
- **Story headlines** are designed as two short lines. Their size steps down (desktop
  `clamp(40px, 4.4vw, 68px)`, phone 42px), with matching steps for the hero, section intros, the
  epilogue and the footer wordmark, so the hero title clears the opening Earth.
- **Information pages** set section titles in a 309px column; they step down to
  `clamp(1.75rem, 2.6vw, 2.6rem)` so "Possibilities, not predictions" sets in two lines.
- **Long source titles stay in the text face**: Sources ledger entries, the five paper titles on
  Research, and the atlas object titles. They are citations and source names, which cannot be
  shortened, and at 70–85 characters they would run five or six lines in capitals. Numerals,
  callouts, the header wordmark and the 404 page use the new face.

## Shortened titles

Each keeps its meaning and key word, and no wording ranks or predicts scenarios.

| Where                       | Before                                             | After                                       |
| --------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Story, S9 telescope chapter | A quiet world. / A vast civilization.              | Quiet world. / Vast civilization.           |
| Story, signal matrix        | One sky. / Different evidence.                     | One sky. / Different clues.                 |
| Story, growth chart         | Growth is only / part of the story.                | Growth isn’t / everything.                  |
| Story, epilogue             | The universe / doesn’t owe us / an obvious answer. | The universe / owes us no / obvious answer. |
| Atlas scenario pages        | What a telescope could see.                        | What could be seen.                         |
| Observatory matrix          | All ten futures, all five instruments.             | Ten futures, five instruments.              |

## Removed

`public/licenses/newsreader-OFL.txt`: Newsreader is no longer served.

## Verification

See [the QA report](qa/nostromo-titles/REPORT.md). A Playwright sweep measured every heading on 20
routes at 1440×900 and 375×812, counting rendered lines with `Range.getClientRects()` and checking
horizontal overflow. A second pass checked the header and titles at seven widths from 700 to 1280
px. Visual-regression baselines change with the face and must be re-rendered by the pinned CI
container and reviewed, as in Decision 036.
