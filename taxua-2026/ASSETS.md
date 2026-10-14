# Asset preparation and source records

The live Drive catalog, selected-photo JSON and Lịch trình A1:J33 were read on 2026-10-14. The raw source snapshots in `data/sources/` preserve their contents. Their authority is the detailed schedule, not the asset array order or stale day headings. The original external sources were left unchanged.

## Import and reproducibility

All 23 selected place/meal photo entries and five atmospheric backgrounds were downloaded from their originals. P12-P18 were downloaded as complete raw bytes through the connected Google Drive tool, including the two full-resolution Best view room files. No preview fallback was used. The three Drive preview packs were also downloaded and their HTML guides checked; `imageN.jpg` was matched by the preceding asset heading, never by numeric order.

Original downloads and preview ZIPs were cached outside runtime delivery at `/tmp/taxua-assets` for this work session. This cache is ephemeral. `data/sources/asset-import.json` records original filenames, SHA-256 hashes, method, source/original URLs, credits, rights labels and every local variant. No expiring signed download URLs or authentication tokens are stored in the repository.

To reproduce conversions, download the original files using the recorded URLs (Drive files through the connected raw-file download), recreate `import-results.json` in a cache directory with `{id, path, method}` per file, then run:

```sh
python3 scripts/prepare_assets.py /path/to/original-cache
```

The optional helper requires Pillow. It applies EXIF orientation, preserves the full aspect ratio, never upscales, and writes WebP at quality 82 for place images / 79 for backgrounds with method 6. Place widths are 480, 960 and 1440 where the original permits; background widths are 640, 1280 and 1920. Source watermarks remain. Natural full frames are used for the lake, Tháng 10 signage, Vị Nhà food/view, exterior and room photographs; the remaining crop hints are centered and reviewed in a browser. The replacement ridge photo is resized/re-encoded and displayed in its full natural frame. On 14 October 2026, user-uploaded `IMG_6884.JPG` replaced P01 and was renamed `P01_Song_Lung_Khung_Long_Original.jpg` in Drive. Its 1159×773 original produces 480, 960 and 1159px WebP variants without upscaling; the prior Wikimedia selection is retained as provenance in `selected-place-photos.json`.

## Selected credits and rights

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

## Required illustrative captions

- F01 / combined Làng Văn Hóa Café: **Ảnh minh họa.**
- F02 / Lán Cô Đơn: **Ảnh minh họa.**
- F03 / central-town lunch: **Ảnh minh họa.**

F01/B01 and F02/B04 are generic atmospheric scenery, not photographs of the named café or hut. F03 is a Đồi Mây food photo illustrating an unnamed central-town meal. B02 is generic forest mist; B03 is a portrait night sky; B05 is a warm cloud valley. The background source notes identify non-Tà Xùa locations where known. Scenery is an interpretation, not a forecast.

## Retained licenses and artwork

- Previous P01 selection: NKSTTSSHNVN, [Sống lưng khủng long Tà Xùa](https://commons.wikimedia.org/wiki/File:Sống_lưng_khủng_long_Tà_Xùa.jpg), CC BY-SA 4.0. The old source and full license remain recorded for historical attribution; this is not the current P01 photo. The current user-supplied photo keeps its recorded project-use status.
- Unsplash backgrounds and F01/F02: the [Unsplash License](https://unsplash.com/license) recorded by the catalog. A fresh full-license fetch returned HTTP 403; the source links and recorded license status are retained.
- C01-C07/C09/C10: supplied original project scenery/code retained as source assets. The current redesign uses the five photographic backgrounds directly; artificial ridges, cloud banks, mist, grain, glow, stars and route overlays are no longer rendered. Existing small stickers remain in use.
- C08: official Tabler symbols with complete embedded MIT notice, retained in the SVG and inlined HTML. Existing menu icon and `figures/icons/LICENSE.txt` are retained. Symbols reference same-document IDs, so they work under `file://`.
- GSAP core and ScrollTrigger: **3.15.0**, downloaded from the npm distribution tarball; source/version in `vendor/version.json`. Headers remain intact. The applicable [GSAP Standard License](https://gsap.com/standard-license/) was read and retained in `vendor/GSAP-STANDARD-LICENSE.txt`. This license is not MIT.
- Existing gogo logo, favicon, all 11 day/night sticker pairs and source sheets remain. Stickers are small journal accents rather than full-screen scenery.
- Existing Be Vietnam Pro, Fraunces and Patrick Hand WOFF2 files and their corresponding OFL text files remain in `figures/fonts/`.

## Publication-related rights

The catalog marks several venue/editorial references as permission not established. This status is preserved; downloading or optimizing an image does not establish a new right to publish it. Supplied P01 and P12-P18 retain the recorded project-use status and original photographer rights; no photographer names were invented. Before a public release, obtain the necessary approval for the reference photos or replace them with approved originals. This does not prevent local implementation and review. No production site was published by this task.

The catalog, original mapping and import manifest provide the per-image details; venue-link buttons are not required.

## Interface icons

The current interface uses 22 official Lucide 1.23.0 symbols serialized from the same pinned UMD source bundle as Hue, using `scripts/prepare_icons.cjs`. Icon geometry is unchanged; the 402 KiB full bundle is not requested by visitors. The ISC license and source checksum are recorded in `vendor/README.md`. No icon CDN or runtime build is required.
