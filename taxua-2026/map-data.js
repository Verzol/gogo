// Geographic registry, independent of the authoritative schedule.
// verified = named source match or organizer-supplied coordinates, not an on-site audit.
const TRIP_MAP_DATA = {
  "center": [
    21.28,
    104.47
  ],
  "navigationBounds": [
    [8.0, 102.0],
    [23.5, 110.0]
  ],
  "tileUrl": "https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
  "tileAttribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener noreferrer\">OpenStreetMap</a> · <a href=\"https://www.openstreetmap.fr/\" target=\"_blank\" rel=\"noopener noreferrer\">OSM France</a>",
  "places": {
    "song_lung_khung_long": {
      "name": "Sống Lưng Khủng Long",
      "category": "landmark",
      "art": "decor/dino_ridge_day.webp",
      "lat": 21.3045713,
      "lng": 104.464087,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=16915634236047948939"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "thao_coffee": {
      "name": "Thào Coffee",
      "category": "cafe",
      "art": "decor/painted/cloud_coffee_sticker.webp",
      "lat": 21.2778895,
      "lng": 104.4331195,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.openstreetmap.org/node/13724983101"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim cộng đồng OpenStreetMap; lối vào cần kiểm tra tại chỗ."
    },
    "thac_chua_ty": {
      "name": "Thác Chua Tỳ",
      "category": "waterfall",
      "art": "decor/painted/map_waterfall.webp",
      "lat": 21.3805341,
      "lng": 104.3829268,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=2885022385867650888"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "vi_nha_tiem_com": {
      "name": "Vị Nhà Tiệm Cơm",
      "category": "meal",
      "art": "decor/painted/map_vi_nha.webp",
      "lat": 21.2759998,
      "lng": 104.4341393,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=15021195531137429615"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "bep_cui": {
      "name": "Bếp Củi",
      "category": "meal",
      "art": "decor/painted/map_bep_cui.webp",
      "lat": 21.2796322,
      "lng": 104.4320664,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=13051535917208680876"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "mua_tru_homestay": {
      "name": "Mùa Trứ Homestay",
      "category": "stay",
      "art": "decor/painted/map_home_base.webp",
      "lat": 21.2777435,
      "lng": 104.4333062,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=13623207350557074921"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "ameii_hill": {
      "name": "Ameii Hill",
      "category": "landmark",
      "art": "decor/painted/map_ameii_hill.webp",
      "lat": 21.2711785,
      "lng": 104.4230839,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=8990298849778649003"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "a_phu": {
      "name": "Nhà hàng A Phủ",
      "category": "meal",
      "art": "decor/painted/map_a_phu.webp",
      "lat": 21.2799562,
      "lng": 104.4264168,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=9549024332074645625"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "ho_mat_ngoc": {
      "name": "Hồ Mắt Ngọc",
      "category": "landmark",
      "art": "scenery/painted/lake.webp",
      "lat": 21.2836986,
      "lng": 104.4502696,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=15482996879672750094"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "thao_nguyen_ta_xua": {
      "name": "Thảo nguyên Tà Xùa",
      "category": "landmark",
      "art": "decor/painted/map_thao_nguyen.webp",
      "lat": 21.2645162,
      "lng": 104.5231778,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=10571900951094084594"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "cay_co_don": {
      "name": "Cây Cô Đơn",
      "category": "landmark",
      "art": "decor/lone_tree_day.webp",
      "lat": 21.2653138,
      "lng": 104.5384429,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.openstreetmap.org/node/13724978102"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim cộng đồng OpenStreetMap; lối vào cần kiểm tra tại chỗ."
    },
    "lan_co_don": {
      "name": "Lán Cô Đơn",
      "category": "landmark",
      "art": "decor/painted/map_lan_co_don.webp",
      "lat": 21.2638784,
      "lng": 104.5370201,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=227635560843641153"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "mom_ca_heo": {
      "name": "Mỏm Cá Heo",
      "category": "landmark",
      "art": "decor/dolphin_rock_day.webp",
      "lat": 21.2623818,
      "lng": 104.5303513,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=18442060060740083199"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "doi_may": {
      "name": "Đồi Mây Tà Xùa",
      "category": "meal",
      "art": "decor/painted/map_doi_may.webp",
      "lat": 21.2773854,
      "lng": 104.4335432,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=4492946359045402379"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "ca_phe_thang_10": {
      "name": "Cà phê Tháng 10",
      "category": "cafe",
      "art": "decor/painted/cloud_coffee_sticker.webp",
      "lat": 21.2795397,
      "lng": 104.4278366,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=17931017884983763766"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "khe_cai": {
      "name": "Khe Cải",
      "category": "landmark",
      "art": "decor/mountain_sky_day.webp",
      "lat": 21.27347304583251,
      "lng": 104.42839746119542,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://maps.app.goo.gl/TtAiAhR4eie9UuGS7"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim Khe Cải theo tọa độ và liên kết do nhóm xác nhận; lối vào cần kiểm tra tại chỗ."
    },
    "lang_van_hoa_cafe": {
      "name": "Làng Văn Hóa Café",
      "category": "cafe",
      "art": "decor/painted/cloud_coffee_sticker.webp",
      "lat": 21.2863822,
      "lng": 104.416911,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=2507578269952744816"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Ghim theo địa danh đã công bố; lối vào cần kiểm tra tại chỗ."
    },
    "trung_tam_ta_xua": {
      "name": "Trung tâm Tà Xùa",
      "category": "area",
      "art": "decor/painted/map_trung_tam.webp",
      "lat": 21.27516,
      "lng": 104.43396,
      "status": "approximate",
      "precision": "area",
      "sourceUrls": [
        "https://maps.apple.com/place?auid=5952950460681155788"
      ],
      "verifiedAt": "2026-10-16",
      "note": "Khu vực Tà Xùa để định hướng; chưa chốt quán ăn hay điểm dừng cụ thể."
    },
    "hanoi_pickup": {
      "name": "68 Mạc Thái Tông",
      "category": "transfer",
      "art": "decor/painted/bus_sticker.webp",
      "lat": 21.0137554,
      "lng": 105.7936235,
      "status": "verified",
      "precision": "point",
      "sourceUrls": [
        "https://www.google.com/maps?cid=14141617352243748642"
      ],
      "verifiedAt": "2026-10-22",
      "note": "Điểm tập trung và lên xe do nhóm xác nhận. Có mặt lúc 21:00, xe xuất phát lúc 22:00."
    }
  }
};
