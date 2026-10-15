// Live schedule: Lịch trình A1:J33, refreshed 2026-10-14.
// Exact/null times and sourceRow are authoritative; phase is an editorial lighting cue.
// Classic script, loaded before main.js. Edit trip content here.
const TRIP_DATA = {
  "tripName": "Tà Xùa",
  "subtitle": "Có một đồng bọn bí mật đi cùng hội mình.",
  "hero": {
    "memberLabel": "đồng bọn,",
    "title": "một biển mây.",
    "scrollAction": "Cuộn xuống để biết",
    "scrollNote": "+1 là ai? Bật mí ở cuối chuyến đi."
  },
  "dateRange": "22-25/10/2026 · 3 ngày 2 đêm",
  "weather": {
    "latitude": 21.27516,
    "longitude": 104.43396,
    "timezone": "Asia/Ho_Chi_Minh",
    "title": "Trời trên Tà Xùa",
    "region": "Dự báo khu vực Tà Xùa",
    "reset": "Trời ban đầu",
    "loading": "Đang lấy dự báo…",
    "unavailable": "Chưa lấy được dự báo. Thử lại sau nhé.",
    "future": "Chưa có dự báo ngày này",
    "past": "Ngày đã qua",
    "missing": "Chưa có dữ liệu ngày này",
    "retry": "Thử lại",
    "pause": "Dừng chuyển động",
    "resume": "Bật chuyển động"
  },
  "intro": "Một cuốn nhật ký săn mây cho hội bạn thân, đủ lạnh, đủ no, đủ mây.",
  "countdown": {
    "title": "Chạm Tà Xùa trong…",
    "arrived": "Đã đến giờ hẹn trên núi!",
    "arrivalNote": "Dự kiến tới nơi",
    "timezoneLabel": "giờ Việt Nam",
    "units": [
      "ngày",
      "giờ",
      "phút",
      "giây"
    ]
  },
  "fund": {
    "eyebrow": "+1 đây rồi · Quỹ vi vu",
    "title": "Thành viên thứ 8: Heo đất!",
    "intro": "Heo đất cũng đi Tà Xùa.",
    "contributionIntro": "Mỗi đứa góp",
    "contributionOutro": "vào heo chung nhé.",
    "reminder": "Ai chưa góp thì ghé heo một chút nha!",
    "amountPerPerson": 2400000,
    "amountLabel": "mỗi người",
    "action": "Góp quỹ vi vu",
    "actionHint": "Mở quỹ trên MoMo",
    "scribble": "Nuôi heo, nuôi chuyến đi.",
    "pigNote": "thành viên thứ 8 của hội mình",
    "url": "https://quy.momo.vn/v2/YTavDjFUV4?cover=6749"
  },
  "masthead": [
    "Nhật ký săn mây",
    "Bắc Yên, Sơn La"
  ],
  "members": [
    {
      "name": "san",
      "role": "Thợ săn mây chính"
    },
    {
      "name": "thảo",
      "role": "Stylist áo phao"
    },
    {
      "name": "mi",
      "role": "Báo thức 4 giờ sáng"
    },
    {
      "name": "linh",
      "role": "Phó nháy biển mây"
    },
    {
      "name": "quanlele",
      "role": "Cây hài trên đèo"
    },
    {
      "name": "gtm",
      "role": "Người bí ẩn"
    },
    {
      "name": "trường",
      "role": "Đồng bọn săn mây"
    }
  ],
  "wheel": {
    "eyebrow": "Một vòng cho cả hội",
    "title": "Vòng quay trên mây",
    "intro": "Hôm nay mây gọi ai? Quay một vòng, chọn một đồng bọn.",
    "spin": "Quay nào",
    "spinning": "Đang quay…",
    "again": "Quay nữa",
    "participants": "Ai có mặt?",
    "noRepeat": "Không lặp trong lượt",
    "reset": "Bắt đầu lại",
    "waiting": "Mây đang chờ…",
    "waitingNote": "Mỗi đồng bọn một cơ hội. Chạm nút giữa vòng quay nhé.",
    "winner": "Mây gọi tên",
    "celebration": "Mây gọi tên:",
    "winnerNote": "Nhân vật chính của lượt này đây rồi.",
    "complete": "Đủ một vòng đồng bọn!",
    "completeNote": "Ai cũng đã được mây gọi. Bắt đầu lại để mở lượt mới nhé.",
    "empty": "Mây chưa thấy ai cả.",
    "emptyNote": "Chọn ít nhất một đồng bọn để quay nhé.",
    "fairness": "Cơ hội như nhau cho những người còn trong lượt."
  },
  "packingList": {
    "title": "Đóng gói trước khi lên núi",
    "note": "Trên đỉnh sáng sớm có thể xuống dưới 10°C, gió mạnh. Mặc nhiều lớp.",
    "items": [
      {
        "text": "Áo phao, áo giữ nhiệt, khăn len",
        "why": "săn mây lúc 5 giờ sáng là lạnh thật"
      },
      {
        "text": "Giày trekking đế bám",
        "why": "sống lưng khủng long dốc và trơn"
      },
      {
        "text": "Đèn pin / đèn đội đầu",
        "why": "đi lên lúc trời còn tối"
      },
      {
        "text": "Áo mưa mỏng"
      },
      {
        "text": "Sạc dự phòng đầy pin",
        "why": "chụp mây là hết pin"
      },
      {
        "text": "Thuốc say xe",
        "why": "đường đèo lên Tà Xùa nhiều cua"
      },
      {
        "text": "Tiền mặt",
        "why": "homestay và quán bản ít quẹt thẻ"
      }
    ]
  },
  "itinerary": {
    "sourceUrl": "https://docs.google.com/spreadsheets/d/1avQi4rDVT2_d2PAj-XphaUORJtsvHB64wNt44CQcOdA/edit#gid=20009742",
    "dateLabel": "22-25/10/2026",
    "duration": "3 ngày 2 đêm",
    "stay": "Mùa Trứ Homestay",
    "stayQuery": "HomeStay Mùa Trứ Tà Xùa",
    "outbound": {
      "label": "Xe đêm 22/10",
      "detail": "Đón 21:30, đi 22:00"
    },
    "inbound": {
      "label": "Xe về 25/10",
      "detail": "Xuất phát 12:30"
    },
    "costNote": "Giá dự kiến theo lịch nhóm, chưa gồm mọi khoản phát sinh. Dự toán trong lịch nhóm tính cho 7 người.",
    "costs": [
      {
        "label": "Homestay, 2 đêm",
        "value": 3600000,
        "scope": "Cả nhóm",
        "sourceRow": 3
      },
      {
        "label": "Xe khứ hồi",
        "value": 3700000,
        "scope": "Cả nhóm",
        "sourceRow": 4
      },
      {
        "label": "4 xe máy và xăng, 2,5 ngày",
        "value": 1800000,
        "scope": "Cả nhóm",
        "sourceRow": 5
      }
    ]
  },
  "days": [
    {
      "label": "Đêm đi",
      "date": "22/10",
      "dateISO": "2026-10-22",
      "weekday": "Thứ Năm",
      "title": "Hẹn nhau, lên xe",
      "summary": "Tập trung ở Hà Nội, ngủ một giấc là tới Tà Xùa.",
      "image": "figures/decor/cloud_1_day.png",
      "blocks": [
        {
          "sourceRow": 7,
          "period": "Đêm",
          "time": "21:30",
          "activity": "Tập trung, lên xe đi Tà Xùa",
          "location": "Tập đoàn Viettel",
          "mapQuery": "Tập đoàn Viettel Hà Nội",
          "note": "Xe đón lúc 21:30 tại Tập đoàn Viettel và xuất phát lúc 22:00. Cần xác nhận vị trí đón cụ thể với nhà xe.",
          "id": "departure",
          "kind": "transit",
          "phase": "night",
          "description": "Hẹn nhau ở Hà Nội. Lên xe lúc 21:30, xuất phát 22:00, ngủ một giấc rồi gặp núi.",
          "annotation": "Mang áo ấm lên xe nhé.",
          "sticker": "cloud_1",
          "storyTitle": "Hẹn nhau, lên xe",
          "storyCue": "Hà Nội → Tà Xùa · xe xuất phát 22:00",
          "storyNote": "Xác nhận vị trí đón cụ thể với nhà xe.",
          "sceneryChapter": "road"
        }
      ],
      "sceneryChapter": "road"
    },
    {
      "label": "Ngày 1",
      "date": "23/10",
      "dateISO": "2026-10-23",
      "weekday": "Thứ Sáu",
      "title": "Thác, cà phê & hoàng hôn",
      "summary": "Gửi đồ ở home, ghé thác rồi dành buổi chiều cho Ameii Hill.",
      "image": "figures/decor/shan_tea_day.png",
      "blocks": [
        {
          "sourceRow": 9,
          "period": "Sáng",
          "time": "03:00",
          "activity": "Tới Tà Xùa, gửi đồ và nhận xe",
          "location": "Mùa Trứ Homestay",
          "mapQuery": "HomeStay Mùa Trứ Tà Xùa",
          "note": "Vệ sinh cá nhân, gửi đồ tại homestay và nhận xe máy. Chưa phải giờ nhận phòng.",
          "id": "arrival",
          "kind": "rest",
          "phase": "predawn",
          "stopId": "mua_tru_homestay",
          "photoIds": [
            "P16"
          ],
          "description": "03:00 đến nơi, gửi hành lý ở Mùa Trứ, vệ sinh cá nhân và nhận xe máy.",
          "annotation": "Gửi đồ trước. 14:00 mới nhận phòng.",
          "storyTitle": "Chạm Tà Xùa",
          "storyCue": "Gửi hành lý ở Mùa Trứ, vệ sinh cá nhân và nhận xe máy.",
          "storyNote": null,
          "sceneryChapter": "road",
          "showPlaceGuide": false
        },
        {
          "sourceRow": 10,
          "period": "Sáng",
          "time": "05:00-06:00",
          "activity": "Ăn sáng tại Thào Coffee",
          "location": "Thào Coffee Tà Xùa",
          "cost": 50000,
          "id": "thao-coffee",
          "kind": "cafe",
          "phase": "dawn",
          "stopId": "thao_coffee",
          "photoIds": [
            "P08b",
            "P08"
          ],
          "description": "Bát mì nóng và tách cà phê đầu tiên. Chờ núi sáng lên cùng nhau.",
          "annotation": "Một chút ấm trước khi lên đường.",
          "sticker": "shan_tea",
          "storyTitle": "Thào Coffee",
          "storyCue": "Ăn sáng & cà phê đầu ngày",
          "storyNote": null,
          "sceneryChapter": "first-morning"
        },
        {
          "sourceRow": 11,
          "period": "Sáng",
          "time": "06:00-12:00",
          "activity": "Thác Chua Tỳ / Thác Không Tên",
          "location": "Thác Chua Tỳ",
          "cost": 0,
          "note": "Lịch nhóm ghi tên địa điểm là Thác Chua Tỳ. Đây là điểm xa; cần cân nhắc quỹ thời gian để chiều vẫn kịp cà phê và hoàng hôn.",
          "id": "waterfall",
          "kind": "portrait",
          "phase": "morning",
          "stopId": "thac_chua_ty",
          "photoIds": [
            "P02"
          ],
          "description": "Rời biển mây, ghé thác giữa núi rừng. Buổi sáng dành cho một cung đường xa hơn.",
          "annotation": "Đổi tiếng báo thức lấy tiếng nước.",
          "storyTitle": "Thác Chua Tỳ",
          "storyCue": "Ghé thác ở Xím Vàng",
          "storyNote": "Điểm xa; cân nhắc quỹ thời gian để kịp buổi chiều.",
          "sceneryChapter": "first-morning",
          "warning": "Điểm xa, cần cân đối thời gian di chuyển."
        },
        {
          "sourceRow": 12,
          "period": "Trưa",
          "time": "12:00",
          "activity": "Ăn trưa tại Vị Nhà",
          "location": "Vị Nhà Tiệm Cơm Tà Xùa",
          "cost": 70000,
          "id": "vi-nha",
          "kind": "meal",
          "phase": "noon",
          "stopId": "vi_nha_tiem_com",
          "photoIds": [
            "P14"
          ],
          "description": "Dừng chân bên mâm cơm, nhìn ra thung lũng. Ăn no rồi về nghỉ.",
          "storyTitle": "Vị Nhà Tiệm Cơm",
          "storyCue": "Bữa trưa bên núi",
          "storyNote": null,
          "sceneryChapter": "first-morning"
        },
        {
          "sourceRow": 13,
          "period": "Chiều",
          "time": "14:00",
          "activity": "Nhận phòng và nghỉ ngơi",
          "location": "Mùa Trứ Homestay",
          "mapQuery": "HomeStay Mùa Trứ Tà Xùa",
          "id": "check-in",
          "kind": "stay",
          "phase": "afternoon",
          "stopId": "mua_tru_homestay",
          "photoIds": [
            "P16",
            "P17",
            "P18"
          ],
          "description": "Nhận phòng lúc 14:00. Cất đồ, nghỉ một chút rồi lại đi.",
          "note": "Ảnh căn Best view 2 và Best view 4 do nhóm cung cấp. Tên căn không xác định thứ tự chuyển phòng.",
          "annotation": "Có cửa sổ nhìn ra núi là vui rồi.",
          "storyTitle": "Mùa Trứ Homestay",
          "storyCue": "Nhận phòng & nghỉ một chút",
          "storyNote": "Ảnh căn Best view 2 và Best view 4 do nhóm cung cấp. Tên căn không xác định thứ tự chuyển phòng.",
          "sceneryChapter": "first-afternoon",
          "showPlaceGuide": true
        },
        {
          "sourceRow": 14,
          "period": "Chiều",
          "time": "15:30",
          "activity": "Cà phê, ngắm hoàng hôn ở Ameii Hill",
          "location": "Ameii Hill",
          "mapQuery": "Ameii Hill Tà Xùa",
          "cost": 30000,
          "note": "Có thể vào quán dù không mua nước. Đường bê tông hẹp và dốc; xe ôm khoảng 40.000 ₫/người khứ hồi theo lịch nhóm.",
          "id": "ameii",
          "kind": "portrait",
          "phase": "afternoon",
          "stopId": "ameii_hill",
          "photoIds": [
            "P03"
          ],
          "description": "Một mái nhà nhỏ, một khoảng trời rộng. Buổi chiều ngồi ngắm mây ở Ameii Hill.",
          "annotation": "Để dành buổi chiều cho mây.",
          "sticker": "peach_branch",
          "storyTitle": "Ameii Hill",
          "storyCue": "Cà phê & ngắm hoàng hôn",
          "storyNote": "Đường bê tông hẹp và dốc. Xe ôm dự kiến 40.000 ₫/người khứ hồi theo lịch nhóm; kiểm tra phí vào quán khi tới.",
          "sceneryChapter": "first-afternoon",
          "warning": "Đường hẹp và dốc; chỉ tự lái khi vững tay."
        },
        {
          "sourceRow": 15,
          "period": "Tối",
          "time": "19:15",
          "activity": "Ăn lẩu tại A Phủ",
          "location": "Nhà Hàng A Phủ",
          "mapQuery": "Nhà Hàng A Phủ Tà Xùa",
          "cost": 250000,
          "note": "Ăn tối xong về home nghỉ ngơi.",
          "id": "a-phu",
          "kind": "meal",
          "phase": "evening",
          "stopId": "a_phu",
          "photoIds": [
            "P11",
            "P10"
          ],
          "description": "Quây quanh nồi lẩu ở A Phủ. Ăn tối rồi về home nghỉ ngơi.",
          "storyTitle": "Nhà hàng A Phủ",
          "storyCue": "Quây quanh nồi lẩu",
          "storyNote": null,
          "sceneryChapter": "first-afternoon"
        },
        {
          "sourceRow": 16,
          "period": "Tối",
          "time": null,
          "activity": "Ngắm sao, chụp Milky Way",
          "location": "Quanh homestay hoặc Khe Cải",
          "mapQuery": "Khe Cải Tà Xùa",
          "note": "Lịch nhóm gợi ý chụp 18:30-20:30; Khe Cải cách home khoảng 800 m. Khung này trùng bữa tối 19:15, cần sắp xếp lại với cả nhóm.",
          "warning": "Cần thống nhất giờ với bữa tối.",
          "id": "stars",
          "kind": "note",
          "phase": "night",
          "optional": true,
          "description": "Nếu trời quang và cả nhóm còn sức, ngắm sao quanh home hoặc Khe Cải.",
          "annotation": "Không cần cố thức. Mai còn săn mây.",
          "storyTitle": "Một tối nhìn lên trời",
          "storyCue": "Ngắm sao quanh home hoặc Khe Cải, nếu trời quang.",
          "storyNote": "Khe Cải cách home khoảng 800 m theo lịch nhóm. Cả nhóm cần sắp xếp giờ ngắm sao với bữa tối.",
          "sceneryChapter": "second-night"
        }
      ],
      "sceneryChapter": "road"
    },
    {
      "label": "Ngày 2",
      "date": "24/10",
      "dateISO": "2026-10-24",
      "weekday": "Thứ Bảy",
      "title": "Một ngày trên biển mây",
      "summary": "Sống Lưng Khủng Long buổi sáng, thảo nguyên và các điểm check-in buổi chiều.",
      "image": "figures/decor/dino_ridge_day.png",
      "blocks": [
        {
          "sourceRow": 18,
          "period": "Sáng",
          "time": "04:30",
          "activity": "Dậy đón bình minh tại phòng",
          "optional": true,
          "note": "Có thể săn bình minh và săn mây ngay tại phòng của mình.",
          "id": "room-clouds",
          "kind": "note",
          "phase": "predawn",
          "description": "Ai muốn thì dậy sớm săn bình minh và mây ngay từ phòng. Ai cần ngủ thêm cứ ngủ.",
          "sticker": "mountain_sky",
          "storyTitle": "Bình minh bên cửa sổ",
          "storyCue": "Ai thích thì dậy săn mây tại phòng, ai buồn ngủ cứ ngủ thêm.",
          "storyNote": null,
          "sceneryChapter": "second-night"
        },
        {
          "sourceRow": 19,
          "period": "Sáng",
          "time": "05:15",
          "activity": "Ăn sáng tại home",
          "location": "Mùa Trứ Homestay",
          "mapQuery": "HomeStay Mùa Trứ Tà Xùa",
          "cost": 20000,
          "id": "home-breakfast",
          "kind": "rest",
          "phase": "dawn",
          "stopId": "mua_tru_homestay",
          "description": "Ăn sáng tại Mùa Trứ. Nạp năng lượng trước khi ra sống núi.",
          "storyTitle": "Bữa sáng ở Mùa Trứ",
          "storyCue": "Nạp năng lượng trước khi ra sống núi.",
          "storyNote": null,
          "sceneryChapter": "second-night",
          "showPlaceGuide": false
        },
        {
          "sourceRow": 20,
          "period": "Sáng",
          "time": null,
          "activity": "Săn mây ở Sống Lưng Khủng Long",
          "location": "Sống Lưng Khủng Long",
          "mapQuery": "Sống Lưng Khủng Long điểm Săn Mây Tà Xùa",
          "cost": 30000,
          "note": "Lịch nhóm gợi ý buổi sáng 06:00-08:00 để săn mây, ánh sáng dịu; các khung chiều được ghi là 14:00-15:00 hoặc 15:00-17:00. Cách trung tâm khoảng 10 km, 500 m cuối khó đi. Xe ôm khoảng 100.000 ₫/người khứ hồi.",
          "id": "dinosaur-ridge",
          "kind": "wide",
          "phase": "morning",
          "stopId": "song_lung_khung_long",
          "photoIds": [
            "P01"
          ],
          "description": "Con đường nhỏ chạy dọc sống núi. Chậm một chút để ngắm hai bên, chụp một tấm cho cả hội.",
          "annotation": "Bảy đứa, đứng gọn trong một khung hình.",
          "sticker": "dino_ridge",
          "storyTitle": "Sống Lưng Khủng Long",
          "storyCue": "Săn mây trên sống núi",
          "storyNote": "Gợi ý ghé buổi sáng 06:00-08:00; chưa chốt giờ. Theo lịch nhóm, 500 m cuối khó đi, xe ôm khoảng 100.000 ₫/người khứ hồi.",
          "sceneryChapter": "ridge-day",
          "warning": "500 m cuối khó đi; cân nhắc đi bộ hoặc xe ôm."
        },
        {
          "sourceRow": 21,
          "period": "Sáng",
          "time": null,
          "activity": "Ghé Hồ Mắt Ngọc",
          "location": "Hồ Mắt Ngọc",
          "mapQuery": "Hồ Mắt Ngọc Tà Xùa",
          "cost": 0,
          "optional": true,
          "note": "Hồ nhân tạo giữa núi, cách home khoảng 4 km. Đây là điểm được nhóm gợi ý thêm trong lịch nhóm.",
          "id": "lake",
          "kind": "portrait",
          "phase": "morning",
          "stopId": "ho_mat_ngoc",
          "photoIds": [
            "P12"
          ],
          "description": "Một khoảng hồ yên giữa núi, cách home khoảng 4 km. Ghé nếu cả nhóm còn thời gian.",
          "annotation": "Điểm ghé thêm, không cần vội.",
          "storyTitle": "Hồ Mắt Ngọc",
          "storyCue": "Ghé thêm nếu còn thời gian",
          "storyNote": "Cách home khoảng 4 km theo lịch nhóm; đây là điểm tùy chọn.",
          "sceneryChapter": "ridge-day"
        },
        {
          "sourceRow": 22,
          "period": "Trưa",
          "time": "11:00",
          "activity": "Ăn trưa tại Bếp Củi",
          "location": "Bếp Củi - cơm nhà, lẩu và nướng",
          "mapQuery": "Bếp Củi Tà Xùa",
          "cost": 70000,
          "id": "bep-cui",
          "kind": "meal",
          "phase": "noon",
          "stopId": "bep_cui",
          "photoIds": [
            "P15"
          ],
          "description": "Bữa trưa ở Bếp Củi. Ngồi cùng một mâm, kể lại buổi sáng trên núi.",
          "storyTitle": "Bếp Củi",
          "storyCue": "Một mâm cơm trưa",
          "storyNote": null,
          "sceneryChapter": "ridge-day"
        },
        {
          "sourceRow": 23,
          "period": "Trưa",
          "time": "12:00",
          "activity": "Về home nghỉ ngơi, chuyển phòng",
          "location": "Mùa Trứ Homestay",
          "mapQuery": "HomeStay Mùa Trứ Tà Xùa",
          "note": "Nhớ chuyển đồ sang phòng mới.",
          "id": "room-change",
          "kind": "rest",
          "phase": "noon",
          "stopId": "mua_tru_homestay",
          "description": "Về Mùa Trứ nghỉ ngơi. Nhớ gom và chuyển hành lý sang phòng mới.",
          "annotation": "Đếm đủ đồ rồi mới đi tiếp.",
          "storyTitle": "Về home một chút",
          "storyCue": "Nghỉ ngơi & chuyển hành lý sang phòng mới.",
          "storyNote": null,
          "sceneryChapter": "ridge-day",
          "showPlaceGuide": false
        },
        {
          "sourceRow": 24,
          "period": "Chiều",
          "time": "13:30-17:30",
          "activity": "Dạo Thảo nguyên Tà Xùa",
          "location": "Thảo nguyên Tà Xùa",
          "cost": 35000,
          "id": "meadow",
          "kind": "wide",
          "phase": "afternoon",
          "stopId": "thao_nguyen_ta_xua",
          "photoIds": [
            "P04"
          ],
          "description": "Khoảng cỏ rộng, gió thổi qua sườn núi. Buổi chiều thong thả trên thảo nguyên.",
          "annotation": "Cất điện thoại một chút cũng được.",
          "storyTitle": "Thảo nguyên Tà Xùa",
          "storyCue": "Dạo đồi cỏ buổi chiều",
          "storyNote": null,
          "sceneryChapter": "second-afternoon"
        },
        {
          "sourceRow": 25,
          "period": "Chiều",
          "time": null,
          "activity": "Cây Cô Đơn, Lán Cô Đơn & Mỏm Cá Heo",
          "location": "Cây cô đơn Tà Xùa",
          "cost": 20000,
          "note": "Các điểm check-in trong buổi chiều. Lịch nhóm chưa tách giờ cho từng điểm.",
          "id": "afternoon-cluster",
          "kind": "cluster",
          "phase": "afternoon",
          "description": "Ba điểm ghé trong cùng buổi chiều. Chưa chốt giờ riêng cho từng nơi.",
          "places": [
            {
              "stopId": "cay_co_don",
              "name": "Cây Cô Đơn",
              "photoIds": [
                "P05"
              ],
              "description": "Một tán cây bên khoảng hồ và núi."
            },
            {
              "stopId": "lan_co_don",
              "name": "Lán Cô Đơn",
              "photoIds": [
                "F02"
              ],
              "description": "Một điểm dừng trong cung đường buổi chiều."
            },
            {
              "stopId": "mom_ca_heo",
              "name": "Mỏm Cá Heo",
              "photoIds": [
                "P06"
              ],
              "description": "Mỏm đá nhô ra giữa khung cảnh núi. Chụp ảnh nhớ giữ khoảng cách an toàn."
            }
          ],
          "storyTitle": "Ba lần dừng chân.",
          "storyCue": "Cây Cô Đơn · Lán Cô Đơn · Mỏm Cá Heo",
          "storyNote": null,
          "sceneryChapter": "second-afternoon"
        },
        {
          "sourceRow": 26,
          "period": "Chiều",
          "time": "17:30",
          "activity": "Ăn mẹt đồ Tây Bắc tại Đồi Mây",
          "location": "Đồi Mây Tà Xùa",
          "cost": 150000,
          "id": "doi-may",
          "kind": "meal",
          "phase": "evening",
          "stopId": "doi_may",
          "photoIds": [
            "P20",
            "P19"
          ],
          "description": "Mẹt đồ Tây Bắc giữa một khoảng trời mở. Bữa tối lúc 17:30, trước khi ghé cà phê.",
          "annotation": "Ăn tối sớm, ngắm núi thêm lâu.",
          "storyTitle": "Đồi Mây Tà Xùa",
          "storyCue": "Mẹt đồ Tây Bắc",
          "storyNote": null,
          "sceneryChapter": "second-afternoon"
        },
        {
          "sourceRow": 27,
          "period": "Tối",
          "time": "19:30",
          "activity": "Nghe live music ở Cà phê Tháng 10",
          "location": "Cà phê Tháng 10 - Tà Xùa",
          "cost": 90000,
          "note": "Lịch ghi live music từ 19:30; kiểm tra lịch diễn với quán. Ghi chú pháo hoa nói về Mộc Châu, chưa phải hoạt động được xác nhận trong chuyến Tà Xùa.",
          "id": "thang-10",
          "kind": "wide",
          "phase": "night",
          "stopId": "ca_phe_thang_10",
          "photoIds": [
            "P13"
          ],
          "description": "Hẹn ở Tháng 10 lúc 19:30. Cà phê, nghe nhạc rồi về nghỉ.",
          "annotation": "Một tối nghe nhạc trên núi.",
          "storyTitle": "Cà phê Tháng 10",
          "storyCue": "Cà phê & hẹn nghe live music",
          "storyNote": "Kiểm tra lịch diễn với quán trước khi ghé; live music chưa được xác nhận.",
          "sceneryChapter": "last-night"
        }
      ],
      "sceneryChapter": "second-night"
    },
    {
      "label": "Ngày 3",
      "date": "25/10",
      "dateISO": "2026-10-25",
      "weekday": "Chủ Nhật",
      "title": "Thêm một sáng, rồi về",
      "summary": "Ghé Khe Cải và Làng Văn Hóa, ăn trưa rồi lên xe về Hà Nội.",
      "image": "figures/decor/mountain_sky_day.png",
      "blocks": [
        {
          "sourceRow": 29,
          "period": "Sáng",
          "time": "04:30",
          "activity": "Săn mây tại Khe Cải",
          "location": "Khe Cải",
          "mapQuery": "Khe Cải Tà Xùa",
          "note": "Điểm săn mây được ghi trong lịch nhóm; cần kiểm tra thêm vị trí ngắm bình minh.",
          "warning": "Cần kiểm tra điểm ngắm bình minh.",
          "id": "khe-cai",
          "kind": "wide",
          "phase": "predawn",
          "stopId": "khe_cai",
          "photoIds": [
            "P07"
          ],
          "description": "Thêm một lần dậy sớm. Ghé Khe Cải lúc 04:30 và chờ núi thức giấc.",
          "annotation": "Bình minh thứ hai của cả hội.",
          "phaseEnd": "dawn",
          "storyTitle": "Khe Cải",
          "storyCue": "Chờ bình minh cuối chuyến",
          "storyNote": "Kiểm tra vị trí ngắm bình minh trước khi đi.",
          "sceneryChapter": "last-night",
          "sceneryChapterEnd": "last-morning"
        },
        {
          "sourceRow": 30,
          "period": "Sáng",
          "time": null,
          "activity": "Ăn sáng",
          "cost": 20000,
          "id": "last-breakfast",
          "kind": "rest",
          "phase": "morning",
          "description": "Ăn sáng sau khi săn mây. Giờ và quán chưa chốt.",
          "storyTitle": "Bữa sáng cuối",
          "storyCue": "Ăn sáng sau khi săn mây; quán chưa chốt.",
          "storyNote": null,
          "sceneryChapter": "last-morning"
        },
        {
          "sourceRow": 31,
          "period": "Sáng",
          "time": null,
          "activity": "Làng Văn Hóa Café",
          "location": "Làng Văn Hóa Cafe Tà Xùa",
          "cost": 60000,
          "note": "Lịch nhóm mô tả một cụm cà phê và điểm ngắm cảnh; Núi Đôi cách quán khoảng 400 m đi bộ. Có ghi chú ngắm hoàng hôn, nhưng lịch ghé là buổi sáng, chưa chốt giờ.",
          "id": "village-cafe",
          "kind": "wide",
          "phase": "morning",
          "stopId": "lang_van_hoa_cafe",
          "photoIds": [
            "F01"
          ],
          "description": "Một buổi sáng cà phê và ngắm cảnh. Núi Đôi và Đồi Công viên Mây nằm trong cùng điểm ghé.",
          "nearby": [
            "Núi Đôi",
            "Đồi Công viên Mây"
          ],
          "annotation": "Một điểm ghé, thêm vài góc nhìn.",
          "storyTitle": "Làng Văn Hóa Café",
          "storyCue": "Cà phê & dạo ngắm cảnh",
          "storyNote": "Núi Đôi cách quán khoảng 400 m đi bộ theo lịch nhóm.",
          "sceneryChapter": "last-morning"
        },
        {
          "sourceRow": 32,
          "period": "Trưa",
          "time": "11:15",
          "activity": "Ăn cơm lam, thịt nướng tại trung tâm",
          "location": "Trung tâm xã Tà Xùa",
          "cost": 100000,
          "note": "Check-in và mua kem ở trung tâm Tà Xùa, đối diện Hmong Cafe.",
          "id": "town-lunch",
          "kind": "meal",
          "phase": "noon",
          "stopId": "trung_tam_ta_xua",
          "photoIds": [
            "F03"
          ],
          "description": "Cơm lam, thịt nướng ở trung tâm Tà Xùa. Nhớ ghé mua kem đối diện Hmong Cafe.",
          "storyTitle": "Trung tâm Tà Xùa",
          "storyCue": "Cơm lam & thịt nướng",
          "storyNote": "Ghé mua kem đối diện Hmong Cafe theo lịch nhóm.",
          "sceneryChapter": "last-morning"
        },
        {
          "sourceRow": 33,
          "period": "Trưa",
          "time": "12:30",
          "activity": "Lên xe về Hà Nội",
          "note": "Xe xuất phát từ Tà Xùa lúc 12:30. Lịch nhóm chưa có giờ tới Hà Nội.",
          "id": "homeward",
          "kind": "transit",
          "phase": "noon",
          "description": "Xe xuất phát lúc 12:30. Mang ảnh về, hẹn nhau chuyến sau. Giờ đến Hà Nội chưa chốt.",
          "annotation": "Hẹn chuyến sau, gogo.",
          "sticker": "cloud_2",
          "storyTitle": "Mang một trời mây về",
          "storyCue": "Tà Xùa → Hà Nội · giờ đến chưa chốt",
          "storyNote": null,
          "sceneryChapter": "last-morning"
        }
      ],
      "sceneryChapter": "last-night"
    }
  ],
  "destinations": [
    {
      "name": "Sống Lưng Khủng Long",
      "desc": "Sống núi hẹp, hai bên là biển mây. Điểm săn mây chính.",
      "image": "figures/decor/dino_ridge_day.png"
    },
    {
      "name": "Mỏm Cá Heo",
      "desc": "Hai phiến đá tạo hình cá heo giữa cảnh núi. Chụp từ vị trí đứng an toàn.",
      "image": "figures/decor/dolphin_rock_day.png"
    },
    {
      "name": "Cây Cô Đơn",
      "desc": "Một tán cây riêng lẻ nhìn ra hồ Suối Sập. Ảnh profile mới của cả nhóm.",
      "image": "figures/decor/lone_tree_day.png"
    },
    {
      "name": "Bình minh trên mây",
      "desc": "Mặt trời lên sau dãy núi, mây tràn dưới chân.",
      "image": "figures/decor/mountain_sky_day.png"
    }
  ],
  "food": [
    {
      "name": "Lợn bản nướng",
      "desc": "Nướng than, chấm chẩm chéo.",
      "image": "figures/decor/pork_skewer_day.png"
    },
    {
      "name": "Gà đen",
      "desc": "Đặc sản của người Mông, luộc hoặc nướng.",
      "image": "figures/decor/black_chicken_day.png"
    },
    {
      "name": "Táo mèo & rượu táo mèo",
      "desc": "Chua chát, mua về làm quà.",
      "image": "figures/decor/tao_meo_day.png"
    },
    {
      "name": "Chè Shan tuyết",
      "desc": "Trà từ cây chè cổ thụ trên núi.",
      "image": "figures/decor/shan_tea_day.png"
    }
  ],
  "sourceVerified": "2026-10-14",
  "placeGuides": {
    "song_lung_khung_long": {
      "name": "Sống Lưng Khủng Long",
      "paragraphs": [
        "Một sống núi hẹp ở Háng Đồng, tựa vào dãy Tà Xùa và mở ra thung lũng sâu phía trước. Đường mòn uốn theo lưng núi khiến cả dải đồi trông như lưng một con khủng long khổng lồ.",
        "Có mây thì như đi giữa trời; ít mây lại thấy rõ ruộng bậc thang và những nếp nhà trên sườn núi."
      ],
      "source": {
        "label": "Vietnam Tourism",
        "url": "https://vietnam.travel/things-to-do/ta-xua-staircase-thousand-clouds"
      }
    },
    "thao_coffee": {
      "name": "Thào Coffee",
      "paragraphs": [
        "Thào là một trong những quán cà phê đầu tiên ở Tà Xùa, nằm ngay khu trung tâm. Khoảng ngồi hướng ra thung lũng khiến một tách cà phê cũng thành cái cớ để ngắm núi thật lâu.",
        "Mây có thể đến rồi đi trong lúc mình còn đang nhâm nhi. Chỗ này hợp với một buổi sáng chậm hơn thường ngày."
      ],
      "source": {
        "label": "VnExpress",
        "url": "https://vnexpress.net/48-gio-o-ta-xua-4805169.html"
      }
    },
    "thac_chua_ty": {
      "name": "Thác Chua Tỳ",
      "paragraphs": [
        "Chua Tỳ nằm ở Xím Vàng, giữa núi rừng Sơn La. Dòng nước đổ xuống khoảng nước trong dưới chân thác, tạo nên một điểm dừng khác hẳn những triền núi săn mây.",
        "Ở đây, tiếng nước thay cho tiếng xe. Một góc rừng để đứng lại, nhìn dòng chảy và hít thở thật sâu."
      ],
      "source": {
        "label": "Foxes’ Adventure",
        "url": "https://www.foxesadventure.com/camping-thac-chua-ty"
      }
    },
    "vi_nha_tiem_com": {
      "name": "Vị Nhà Tiệm Cơm",
      "paragraphs": [
        "Vị Nhà là tiệm cơm gần trung tâm Tà Xùa, có ban công nhìn ra dãy núi. Quán theo kiểu cơm nhà, với những món quen thuộc để ăn cùng nhau trong một mâm.",
        "Điều đáng yêu là cảnh núi vẫn ở ngay trước mặt trong lúc ăn. Nếu gặp ngày có mây, bữa cơm có thêm một vị khách trắng bồng bềnh."
      ],
      "source": {
        "label": "BAB Local",
        "url": "https://bablocal.com/post/top-5-quan-com-ngon-gia-hssv-o-ta-xua-ma-cao-tam-dac-sau-nhieu-lan-di-ta-xua"
      }
    },
    "bep_cui": {
      "name": "Bếp Củi",
      "paragraphs": [
        "Bếp Củi là quán cơm nhà ở khu trung tâm Tà Xùa, với không gian mộc mạc và những món ăn gia đình. Gà luộc, thịt kho, rau và canh là những món được nhắc đến trong bài giới thiệu quán.",
        "Một khoảng ấm cúng để ngồi cùng mâm, chuyền nhau bát canh và kể chuyện trên đường."
      ],
      "source": {
        "label": "BAB Local",
        "url": "https://bablocal.com/post/top-5-quan-com-ngon-gia-hssv-o-ta-xua-ma-cao-tam-dac-sau-nhieu-lan-di-ta-xua"
      }
    },
    "mua_tru_homestay": {
      "name": "Mùa Trứ Homestay",
      "paragraphs": [
        "Mùa Trứ là homestay có không gian gỗ mộc mạc, với khoảng hiên hướng ra núi đồi. Điểm dễ thương ở đây là cảm giác cảnh núi ở rất gần, ngay bên chỗ mình nghỉ.",
        "Với hội mình, đây là căn cứ của hai đêm trên núi. Cửa sổ, hiên nhà và một chiếc áo ấm: đủ đồ nghề cho một buổi ngồi ngắm trời."
      ],
      "source": {
        "label": "Homestay Tà Xùa",
        "url": "https://www.homestaytaxua.com/homestay/homestay-ta-xua-mua-tru"
      }
    },
    "ameii_hill": {
      "name": "Ameii Hill",
      "paragraphs": [
        "Ameii Hill nằm ở khu Khe Cải, với những mái nhà gỗ nhỏ giữa bãi cỏ và núi trập trùng. Không gian mở giữ cảnh mây và sườn núi làm nhân vật chính.",
        "Hàng rào gỗ, mái nhà thấp và khoảng trời rộng tạo nhiều góc nhìn khác nhau. Một nơi để ngồi lâu hơn một ly nước."
      ],
      "source": {
        "label": "BAB Local",
        "url": "https://bablocal.com/post/ameii-hill-diem-check-in-moi-noi-o-ta-xua?lang=en"
      }
    },
    "a_phu": {
      "name": "Nhà hàng A Phủ",
      "paragraphs": [
        "A Phủ là nhà hàng ở trung tâm Tà Xùa, có không gian nhà sàn gỗ kết hợp cửa kính. Quán giới thiệu các món lẩu, nướng và món ăn Tây Bắc như gà bản, lợn đen, rau rừng.",
        "Gỗ, ánh đèn và hơi nóng từ nồi lẩu làm buổi tối trên núi thấy ấm hơn. Cả hội ngồi sát lại một chút là vừa."
      ],
      "source": {
        "label": "Taxua.vn",
        "url": "https://taxua.vn/nha-hang-a-phu-dia-diem-am-thuc-ly-tuong-tai-ta-xua.html"
      }
    },
    "ho_mat_ngoc": {
      "name": "Hồ Mắt Ngọc",
      "paragraphs": [
        "Hồ Mắt Ngọc là một điểm ngắm mặt nước giữa núi rừng Tà Xùa. Mặt hồ và các sườn núi bao quanh tạo một khoảng lặng khác với những góc nhìn xuống biển mây.",
        "Ánh sáng và mây thay đổi thì sắc nước cũng đổi theo. Thử tìm một góc thấy cả mặt hồ lẫn núi phía sau."
      ],
      "source": {
        "label": "TaxiGo",
        "url": "https://www.taxigo.vn/tin-tuc/item/ho-mat-ngoc-ta-xua"
      }
    },
    "thao_nguyen_ta_xua": {
      "name": "Thảo nguyên Tà Xùa",
      "paragraphs": [
        "Một khoảng đồi cỏ mở giữa những dãy núi Tà Xùa, được nhiều người tìm đến để dạo chơi và chụp ảnh. Những triền cỏ nối nhau làm khung cảnh mềm hơn các sống núi dựng đứng.",
        "Không cần một phông dựng sẵn: đường cong của đồi, gió và núi xa đã đủ. Đứng xa nhau một chút, mình sẽ thấy cả hội nhỏ xíu giữa khoảng xanh."
      ],
      "source": {
        "label": "Dân trí",
        "url": "https://dantri.com.vn/du-lich/thao-nguyen-xanh-muot-nhu-troi-au-cach-ha-noi-chi-5-tieng-di-chuyen-20240719112323740.htm"
      }
    },
    "cay_co_don": {
      "name": "Cây Cô Đơn",
      "paragraphs": [
        "Một tán cây đứng riêng giữa khoảng trời rộng, nhìn ra hồ thủy điện Suối Sập và những dãy núi nối nhau. Chính dáng cây đơn lẻ trong khung cảnh ấy khiến nơi này được gọi là Cây Cô Đơn.",
        "Cái cây chỉ đứng yên, còn nước, mây và ánh sáng luôn đổi. Cùng một góc chụp mà mỗi lần ghé lại là một bức ảnh khác."
      ],
      "source": {
        "label": "Cùng Phượt",
        "url": "https://cungphuot.info/kinh-nghiem-di-phuot-ta-xua-post23894.cp"
      }
    },
    "lan_co_don": {
      "name": "Lán Cô Đơn",
      "paragraphs": [
        "Lán Cô Đơn là một điểm chụp ảnh trong cung ghé thảo nguyên, Cây Cô Đơn và Mỏm Cá Heo. Một căn lán nhỏ giữa cảnh núi rộng làm bức ảnh có thêm cảm giác về kích thước và khoảng cách.",
        "Thử đứng lùi lại để lấy cả mái lán lẫn những lớp núi phía sau. Người càng nhỏ, trời càng rộng."
      ],
      "source": {
        "label": "Ghi chép du khách",
        "url": "https://www.lemon8-app.com/@ngocvufoto/7552344676130095634?region=vn"
      }
    },
    "mom_ca_heo": {
      "name": "Mỏm Cá Heo",
      "paragraphs": [
        "Tên gọi đến từ hai phiến đá lớn có hình giống một chú cá heo đang bơi giữa biển mây. Những mảng rêu trên đá và núi xa khiến hình dáng ấy càng nổi bật trong cảnh tự nhiên.",
        "Chọn góc đứng vững để ngắm và chụp ảnh; giữ khoảng cách với mép đá. Chú cá heo vẫn lên hình đẹp khi mình đứng ở chỗ an toàn."
      ],
      "source": {
        "label": "Báo Tin tức",
        "url": "https://baotintuc.vn/suc-hut-du-lich-ta-xua-son-la-voi-diem-den-song-lung-khung-long-mom-ca-heo-n20241114224534413.htm"
      }
    },
    "doi_may": {
      "name": "Đồi Mây Tà Xùa",
      "paragraphs": [
        "Đồi Mây là tổ hợp quán ăn, cà phê và homestay ở khu trung tâm Tà Xùa. Mẹt nướng Tây Bắc là món được giới thiệu với cơm lam, gà, cá nướng và các món ăn kèm.",
        "Thay vì mỗi người một đĩa, cả mâm thành chỗ gặp nhau của nhiều hương vị. Một bữa để gắp qua gắp lại, vừa ăn vừa chuyện trò."
      ],
      "source": {
        "label": "Lữ Hành Việt Nam",
        "url": "https://luhanhvietnam.com.vn/du-lich/nhung-quan-an-ngon-tai-ta-xua-co-view-xin.html"
      }
    },
    "ca_phe_thang_10": {
      "name": "Cà phê Tháng 10",
      "paragraphs": [
        "Tháng 10 là một quán cà phê ở khu trung tâm Tà Xùa. Những bài đánh giá nhắc đến không gian rộng và ánh đèn vàng khi sương xuống buổi tối.",
        "Một kiểu ngắm núi khác: ngồi cùng bạn bè, giữ ấm bằng ly nước và đợi những ánh đèn hiện ra trong sương."
      ],
      "source": {
        "label": "Tôi Đi Đâu",
        "url": "https://toididau.net/place/ca-phe-thang-10-ta-xua/31099"
      }
    },
    "khe_cai": {
      "name": "Khe Cải",
      "paragraphs": [
        "Khe Cải là khu vực gần trung tâm Tà Xùa, có các điểm ngắm cảnh hướng xuống thung lũng. Nơi này được chú ý nhiều hơn từ mùa săn mây 2025, với những ảnh mây tràn qua sườn núi.",
        "Biển mây vẫn tùy thời tiết, nên không buổi sáng nào giống hệt buổi sáng nào. Có khi cảnh đẹp nhất là lúc mình ngồi yên chờ ánh sáng thay đổi."
      ],
      "source": {
        "label": "VnExpress",
        "url": "https://vnexpress.net/san-may-bat-bai-o-ta-xua-5112894.html"
      }
    },
    "lang_van_hoa_cafe": {
      "name": "Làng Văn Hóa Café",
      "paragraphs": [
        "Làng Văn Hóa là một điểm tham quan được nhắc đến trong các hoạt động du lịch Tà Xùa. Trong lịch nhóm, đây là cụm cà phê và ngắm cảnh, ghé cùng Núi Đôi và Đồi Công viên Mây.",
        "Một ly nước, vài bước đi và thêm một góc nhìn về núi. Mình dành buổi sáng cuối cho những khoảng ngồi thong thả như thế."
      ],
      "source": {
        "label": "Báo Sơn La",
        "url": "https://baosonla.vn/du-lich/ta-xua-huong-toi-khu-du-lich-cap-tinh-vao-nam-2030-96ZwrhXvg.html"
      }
    },
    "trung_tam_ta_xua": {
      "name": "Trung tâm Tà Xùa",
      "paragraphs": [
        "Khu trung tâm tập trung các quán cơm, cà phê và chỗ dừng chân giữa những cung đường trên núi. Đây cũng là nơi để gặp nhịp sống thường ngày bên cạnh những điểm săn mây.",
        "Ẩm thực vùng này có cơm lam, thịt nướng và các món ăn miền núi. Một bữa trưa nhỏ để mang thêm hương vị Tà Xùa về trong trí nhớ."
      ],
      "source": {
        "label": "VnExpress",
        "url": "https://vnexpress.net/48-gio-o-ta-xua-4805169.html"
      }
    }
  }
};
