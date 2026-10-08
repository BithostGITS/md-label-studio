**Languages:** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

> **Documentation scope:** This English page describes the current coordinated layout and project schema6. The five translated README links above preserve historical documentation unchanged; their two-set layout, square artwork region, schema2 and npm-script guidance are **not current operating instructions**. The runtime interface is available in six languages; that does not mean the preserved translated documentation has been updated.

# After the Burn · MiniDisc Label Studio

A static, offline-capable MiniDisc label editor with an English-default six-language interface. Covers and saved projects remain local. Optional online album lookup is disabled by default; enabling it sends your search terms directly to your chosen provider. No analytics or external font requests.

[Open the website](https://bithostgits.github.io/md-label-studio/).

## Labels and printing

- Four independent sets A–D. Two sheet layouts: four front/spine sets, or one selected CASE/J-card set with its front and spine.
- Standard front: 38 × 54 mm; spine: 58 × 3.5 mm; CASE: 71 × 60 mm; J-card: 68 × 64 mm with a fold 5 mm from the top. Preset paper placements and dimensions are unchanged.
- SELPHY 100 × 148 mm: 1181 × 1748 pixels; 4 × 6 inch paper: 1200 × 1800 pixels. Exports carry 300 DPI metadata and built-in cutting lines. Compatible front exports retain the historical pixel dimensions; physical mode rounds millimetres at 300 DPI.
- Printer scaling, margins, and paper handling still need real-world validation. Use 100% / actual size; do not assume DPI metadata proves physical fit. The uncorrected 50 mm dual-axis ruler supplies calibration measurements. Calibration transforms label content about the paper centre, never the ruler.

## Cover composition

New projects use the coordinated layout and **contain** by default: the complete source image is kept proportional, with padding in the current label background colour. Front and full-image CASE/J-card also offer **cover**, an explicit proportional centred crop.

Front headers (arrow, INSERT instruction, and logo together) and the complete album metadata group are centred in the actual upper and lower space left by the fitted artwork, not fixed legacy boxes. The coordinated front image is inset from the inside cutting stroke by the shared0.10mm stroke plus one300DPI raster pixel (about0.18467mm); this protects its outer source boundary without changing label trim, placement, DPI or calibration. Image-and-tracks uses native-ratio artwork and a separate track column; no square intermediate crop. The J-card spine region is reserved before fitting its body artwork in every coordinated image mode; it does not mask the cover's top edge.

Coordinated background-and-tracks now reserves separate image and track-panel columns, with a separate title region and protected spine/logo space. Its panels and text never cover the fitted artwork. Contain preserves the whole source image with current-label-background padding; cover is an explicitly selected centred proportional crop in that same protected image region. Historical revision1 background layouts retain their saved crop/overlay appearance only in legacy mode. More than13 rows, overflowing new-layout text, and detected logo collisions block unsafe case exports instead of silently dropping content. Individual export readiness is independent where possible.

## Saved projects and languages

Project schema `md-studio-project/6` stores each set's layout revision and image fit. Versions 1–5 import with the legacy layout. The layout selector explicitly changes a set to coordinated composition and back; artwork, metadata, tracks, fonts, and dimensions are not discarded. Save a backup before changing an old project.

English, Simplified Chinese, Traditional Chinese, Spanish, French, and Japanese change the interface, not your album text or printed content. Offline Latin and CJK fonts include their original OFL licences; see [font documentation](./assets/fonts/README.md). Case layout controls retain imported font choices even where the new selector is simplified.

## Local use and build

The deployed static payload can be served with a local static HTTP server; open its index page. It contains runtime assets and documentation, **not** build.mjs, package.json or the tests. Build/npm/test instructions apply only to the full **development source tree**, not the deployed site or a downloaded static payload. From that development tree, `node build.mjs` produces a fresh `dist/` from an explicit runtime allowlist and writes file sizes and SHA-256 hashes to `build-manifest.json`. Preserved translated npm instructions are historical, not a promise of commands available in the static payload. A cached page can export without internet after its local fonts and assets load; first-load browser-offline support is not promised.

Only runtime assets belong in the published tree. Never publish private covers, saved user projects, screenshots, task reports, generated test fixtures, monitor state, or `artifacts/`.

## Rights

Independent implementation, MIT code: [LICENSE](./LICENSE). Fonts have separate SIL OFL licences. MiniDisc/Hi-MD logo artwork and other third-party assets retain their respective owners' rights: [THIRD-PARTY-NOTICES.txt](./THIRD-PARTY-NOTICES.txt).
