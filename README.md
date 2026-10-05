**Languages:** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

# After the Burn · MiniDisc Label Studio

A static label editor for MiniDisc cartridges: six-language UI, zero runtime dependencies,
designed for exact 300 DPI printing on SELPHY-sized paper. All covers and projects stay on
your machine — no backend, no analytics, no external font requests. Optional online metadata
lookup is OFF by default; when enabled, your typed search terms go directly to the provider
you choose. [Open the live site](https://bithostgits.github.io/md-label-studio/).

The code is an independent implementation. The original MiniDisc logo is kept as a separate
asset with rights reserved to its owner; see `THIRD-PARTY-NOTICES.txt`.

## Highlights

- **Four independent label sets (A/B/C/D)**: album, artist, year, cover, fonts, theme,
  uppercase, hidden header and sizes per set. Default printing is four sets per sheet; the
  classic two-set A/B layout remains available. Switching never loses C/D.
- **Original geometry**: fronts 38×54 mm, header 5 mm, cover 38×38 mm; spines 58×3.5 mm.
  Every generated label carries built-in **0.10 mm cut lines**.
- **300 DPI exports**: four-set sheet 100×148 mm → 1181×1748 px; true-millimetre fronts
  449×638 and spines 685×41; legacy pixel-compatible 448×637; uncorrected dual-axis
  calibration PNG. All carry `pHYs` = 11811 px/m.
- **Optional Hi-MD marks** per set (front horizontal mark beside the MiniDisc logo, spine
  bar right-aligned), using the genuine Hi-MD wordmark with rights reserved.
- **Six-language UI** (English default, 简体中文, 繁體中文, Español, Français, 日本語)
  with per-language offline font choices; switching language never changes label content or
  exported bytes.
- **Optional online album lookup** (off by default): MusicBrainz two-stage search or
  iTunes metadata-only suggestions, stage-wise progress with per-stage retry buttons,
  optional Cover Art Archive import with resolution warnings, manual cover upload always
  available. Direct browser-to-provider requests only; no proxy, no keys.
- Local project JSON v2 save/load (four sets with uploaded covers), backward-compatible
  with older two-set projects.

## Run locally

From `app/` (or the unpacked release root):

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/`. Do not open via `file://` (ES modules/font manifests are
blocked). No `npm install` needed. Development tests: `npm test`, `npm run test:browser`,
`npm run test:fixes`, `npm run test:logo`, `npm run test:four-set`, `npm run test:spine`,
`npm run test:himd`, `npm run test:i18n`, `npm run test:autocomplete`. Build:
`npm run build` (copies the allowlisted files to `dist/` with a SHA-256 manifest).

## Printing notes

- Default sheet is **finished-size 100×148 mm** (not 100×177 with tear-off margins).
  Front anchors: A(9,6) B(53,6) C(9,62) D(9,62)→(53,62); spines at x21, y118/123.5/129/134.5.
  At least 6 mm safety margin; invalid custom layouts are rejected, never auto-shrunk.
- Optional true 4×6 in (101.6×152.4 mm → 1200×1800 px) is available; it is not claimed to
  be SELPHY paper.
- Calibration is uncorrected by default; print the test sheet, measure, then apply
  `factor = 50 / measured`. Physical fit is not guaranteed without a trial print.

## Rights and differences

Code is independently written (MIT for the application; original generated artwork MIT).
The original MiniDisc logo and Hi-MD marks are separate assets whose trademark/artwork
rights remain with their owner (Sony-associated); no redistribution permission is claimed.
The original site's Futura is replaced by the OFL-licensed Atkinson; CJK faces are
OFL-licensed offline fonts. Nine bundled faces total 23.43 MiB with full license files in
`assets/fonts/`. No pixel-identical claim is made against the original site. Dimension
sources (Elecom/A-one/SWHarden) are linked in the research report; those links are only
visited on click.

See the language pages above for the same introduction in 简体中文, 繁體中文, Español,
Français and 日本語.
