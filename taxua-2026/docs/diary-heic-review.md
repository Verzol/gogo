# Diary HEIC upload review · 28 October 2026

[Diary](diary.md) · [Decoder and licenses](vendor.md#optional-heic-decoder) · [Verification](verification.md)

The picker and file drop now accept HEIC/HEIF. Extension, MIME and bounded HEIF
header checks recognize uppercase names, empty types and incorrectly labeled
JPEG/octet-stream files. Native decoding is attempted first, including images
that iOS pickers have already transcoded but still name HEIC. A lazy, local,
classic worker decodes unsupported HEIC using the vendored CSP libheif build.
It chooses the primary still image in a collection, checks the source dimensions
before allocating RGBA pixels, and transfers a bitmap resized to at most 1600px.
An older-browser pixel-transfer fallback is also present.

The normal JPEG canvas step, two-MiB output limit and authenticated server pipeline
remain. Original EXIF is removed, source inputs stay limited to 20 MiB/50 MP,
and the nine-photo/30-MiB stored-photo limits remain. No original HEIC, secondary
collection frames, Live Photo video or private test data is added to the site.
No external conversion endpoint, backend migration or Edge deployment is needed.

Conversion has Vietnamese progress/error feedback and a 60-second timeout.
Workers terminate on completion, failure, timeout, editor close or session loss.
Closing/cancelling before decoding finishes cannot reserve an upload or modify
the existing draft. Existing memory-only recovery and publication still apply.

## Validation

Five targeted Chromium suites passed **317 assertions**:

| Suite | Passed |
| --- | ---: |
| `verify_diary_heic.cjs` | 70 |
| `verify_diary_heic_worker.cjs` | 7 |
| `verify_diary_page_editing.cjs` | 68 |
| `verify_diary_refinements.cjs` | 91 |
| `verify_diary.cjs` | 81 |

The HEIC upload suite uses real encoded color-chart fixtures at 1440/390/320px.
It exercises picker/drop, source-header detection, empty MIME, portrait pixels,
2400×1600 → 1600×1067 conversion, EXIF removal, primary-image selection,
corrupt/oversized files, missing decoder assets, close/logout during decoding,
retry, mixed HEIC/WebP batches, the tenth-file boundary and publication. Captured
upload Blobs are JPEG, at most two MiB and at most 1600px per side. No uncaught
browser errors were recorded. All nine converted JPEG previews hydrate; the media fixture serves the actual
converted bytes back to the editor. Desktop/phone editor screenshots were inspected.

The worker suite verifies the 50-MP allocation boundary with an isolated header
fixture, real decoding under a worker CSP allowing only same-origin scripts
and no connections/unsafe-eval, native decoding of an already-transcoded image,
and a stalled worker's timeout/re-enabled controls without reserving a photo.
It uses a virtual page clock for the timeout; no 60-second blocking wait is needed.
Existing suites verify normal uploads, writing, editor exit/recovery, photo sizing,
continuous touch/mouse movement and authentication/publication interactions.

Syntax checks and `git diff --check` passed. Vendored decoder, source archive
and license SHA-256 hashes match `vendor/heif/version.json`. Synthetic inputs
are under `scripts/fixtures/diary_heic/`; the optional generator requires Pillow
and pillow-heif in a development environment, not the website.

All sessions, uploads and backend responses are browser-local fixtures. Real
crew accounts, private media and Supabase data were not mutated. These results
cover Chromium desktop/mobile emulation; they do not claim physical iPhone,
Safari, Firefox, HDR preservation or every camera's HEIF encoding was tested.
The pixel-transfer compatibility fallback is not exercised by this Chromium run.

Evidence:

- `/tmp/taxua-diary-heic/`: reports and desktop/phone screenshots.
- `/tmp/taxua-heic-test.log`, `/tmp/taxua-heic-worker-test.log`.
- `/tmp/taxua-heic-page-editing.log`, `/tmp/taxua-heic-refinements.log`,
  `/tmp/taxua-heic-diary.log`.
