# Documentary photo assets

[Documentation index](README.md) · [Drive/Sheet source map](sources.md) · [Illustrated scenery pipeline](scenery.md)

## Source and runtime owners

- `data/sources/selected-place-photos.json`: current 18-stop/23-photo selection, original/stored-copy links, rights, illustrative flags and captions.
- `place_photos.json`, `backgrounds.json`, `coverage_status.json`: 14 October 2026 catalog snapshots; source order is not itinerary order.
- `asset-import.json`: original filenames, SHA-256, download method, credits and derivative paths. `assets.js` is the generated classic-script runtime subset; do not hand-edit it.
- Runtime photos live in `figures/places/`; `main.js:photo()` supplies responsive variants, dimensions, crop, alt and captions. B01–B05 in `figures/backgrounds/` are archived wallpapers, not live scenery.

## Import / replacement workflow

1. Read the current selected JSON/catalog. Download original bytes using recorded original/stored-copy URLs; Drive previews/ZIPs can be resized. Match ZIP images by the guide heading, never numeric `imageN` order.
2. Make an external cache with originals plus `import-results.json`, an array of `{ "id":"P01", "path":"/absolute/original.jpg", "method":"<download method>" }` records. The previous `/tmp/taxua-assets` cache is ephemeral and not guaranteed to exist.
3. Update selection/provenance for replacements, then run from `taxua-2026/` (Pillow required):

   ```sh
   python3 scripts/prepare_assets.py /path/to/original-cache
   ```

4. Supply the complete import set: the helper rebuilds all of `assets.js`/`asset-import.json` and expects specific selected IDs, so a one-photo cache is insufficient. It also writes a cache contact sheet. Review generated metadata, dimensions, credits and rendered crops.
5. Regenerate `itinerary.html` if content changed; run the relevant [checks](verification.md). Do not retain credentials or temporary signed download URLs.

Conversion applies EXIF orientation, preserves aspect ratio, never upscales and produces WebP at quality 82 (photos) / 79 (archived backgrounds). Photo targets: 480/960/1440px where possible; background targets: 640/1280/1920px. Keep watermarks and intentional full frames/signage/room compositions.

Current **P01** is user-uploaded `IMG_6884.JPG`, renamed `P01_Song_Lung_Khung_Long_Original.jpg` in Drive: 1159×773 original, 480/960/1159px derivatives, full-frame display. Its old Wikimedia choice remains provenance only. Supplied P12–P18 originals were downloaded as complete bytes, including both Best view room files.

## Required captions and rights

- F01 / combined Làng Văn Hóa Café, F02 / Lán Cô Đơn, F03 / unnamed central-town lunch: **“Ảnh minh họa.”** stays immediately below the image, visible on phones (minimum 0.75rem per selection rules).
- F01/F02 depict generic mountains, not the named café/hut; F03 is a Đồi Mây food photo illustrating another unnamed meal. Do not imply location identity.
- Supplied assets retain original photographer rights/project-use labels. Several venue/editorial images have permission not established; optimization does not change that label. Preserve per-image attribution.
- Previous P01: NKSTTSSHNVN, [Wikimedia source](https://commons.wikimedia.org/wiki/File:Sống_lưng_khủng_long_Tà_Xùa.jpg), CC BY-SA 4.0; [retained license](../data/sources/licenses/cc-by-sa-4.0.txt). It is no longer displayed as P01.
- Unsplash sources keep their recorded [Unsplash License](https://unsplash.com/license) status. Background records may name non-Tà Xùa locations; scenery is interpretation, not a forecast.
- Logo, generated paintings, stickers, fonts and icon/library licenses: [identity](identity.md), [scenery](scenery.md), [vendor notes](vendor.md).

## Per-image credits

| ID | Credit as recorded | Reuse status | Original source |
| --- | --- | --- | --- |
| B01 | ki Zhang / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/mountains-emerge-from-a-sea-of-clouds-at-dawn-Nk9AlZ5WPu8) |
| B02 | Arindam Saha / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/misty-mountains-covered-in-dense-evergreen-forest-khTsH7UlcsE) |
| B03 | Filip Kvasnak / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/milky-way-galaxy-over-silhouetted-mountains-at-night-UeRIcbTthwE) |
| B04 | Willian Justen de Vasconcellos / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/landscape-photography-of-mountains-with-fog-_MMP5j_fCqw) |
| B05 | Lucas Gallone / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/the-sun-is-setting-over-the-mountains-with-fog-GisayocrbK0) |
| F01 | ki Zhang / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/mountains-emerge-from-a-sea-of-clouds-at-dawn-Nk9AlZ5WPu8) |
| F02 | Willian Justen de Vasconcellos / Unsplash | Unsplash License | [Source](https://unsplash.com/photos/landscape-photography-of-mountains-with-fog-_MMP5j_fCqw) |
| F03 | Đồi Mây / Homestay Tà Xùa; photographer not specified | Source reference; reuse permission not established | [Source](https://www.homestaytaxua.com/nha-hang/nha-hang-doi-may) |
| P01 | User-supplied Sống Lưng Khủng Long photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/1kxnfke4YFP-EtSBHVaS7MVHdcbnk5mjA/view) |
| P02 | k.ng_03, as credited by 24h | Reference; permission not established | [Source](https://www.24h.com.vn/du-lich-24h/thac-chua-ty-toa-do-an-minh-khien-dan-me-du-lich-ru-nhau-san-tim-c76a1706408.html) |
| P03 | Cáo Lang Thang / BAB Local | Reference; permission not established | [Source](https://bablocal.com/post/ameii-hill-diem-check-in-moi-noi-o-ta-xua?lang=en) |
| P04 | Dân trí / original photographer to confirm | Reference; permission not established | [Source](https://dantri.com.vn/du-lich/thao-nguyen-xanh-muot-nhu-troi-au-cach-ha-noi-chi-5-tieng-di-chuyen-20240719112323740.htm) |
| P05 | PYS Travel / original photographer to confirm | Reference; permission not established | [Source](https://pystravel.vn/tin/18075-cay-co-don-ta-xua.html) |
| P06 | Vietnam Airlines travel guide / original photographer to confirm | Reference; permission not established | [Source](https://www.vietnamairlines.com/dk/vi/plan-book/travel/travel-guide/du-lich-ta-xua) |
| P07 | Lao Động / source article credits | Reference; permission not established | [Source](https://baoquangninh.vn/san-may-ta-xua-ngam-hoang-hon-o-ban-khe-cai-3333032.html) |
| P08 | Thào Coffee Tà Xùa, as credited by Vietnamese Specialty Coffee | Reference; permission not established | [Source](https://www.vietnamesespecialtycoffee.com/vi/blog/discover-the-best-coffee-spots-with-stunning-mountain-views-in-ta-xua-son-la-vietnam) |
| P08b | Thào Coffee Tà Xùa, as credited by Vietnamese Specialty Coffee | Reference; permission not established | [Source](https://www.vietnamesespecialtycoffee.com/vi/blog/discover-the-best-coffee-spots-with-stunning-mountain-views-in-ta-xua-son-la-vietnam) |
| P10 | Taxua.vn / A Phủ; photographer to confirm | Reference; permission not established | [Source](https://taxua.vn/nha-hang-a-phu-dia-diem-am-thuc-ly-tuong-tai-ta-xua.html) |
| P11 | Taxua.vn / A Phủ; photographer to confirm | Reference; permission not established | [Source](https://taxua.vn/nha-hang-a-phu-dia-diem-am-thuc-ly-tuong-tai-ta-xua.html) |
| P12 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/1GVcnB5sE3gRMURtxo_Gq8LwQNuawZIx5/view) |
| P13 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/1wVKqlbZ72X49HURFWlbz-2wUUzObnqhn/view) |
| P14 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/145sX-w_gVjYL5FwdwYT_qyOiPa_E1Dk6/view) |
| P15 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/1kRFDQvFe-4eSUWENSih5ch45cQjoiY_z/view) |
| P16 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/11X9HFOhTo3Q_8ozAelbmsJwTI_6-hFQJ/view) |
| P17 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/1nRvSI-VYnBVK_G_k_T6sjM2ZOFJhOuCk/view) |
| P18 | User-supplied Additional / Homestay photo | Supplied for this project; original photographer rights and attribution retained | [Source](https://drive.google.com/file/d/19B8ieje6hTB9H0_QhmOJOwyGevRZXd3h/view) |
| P19 | Đồi Mây / Homestay Tà Xùa; photographer not specified | Source reference; reuse permission not established | [Source](https://www.homestaytaxua.com/nha-hang/nha-hang-doi-may) |
| P20 | Đồi Mây / Homestay Tà Xùa; photographer not specified | Source reference; reuse permission not established | [Source](https://www.homestaytaxua.com/nha-hang/nha-hang-doi-may) |
