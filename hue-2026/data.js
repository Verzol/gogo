const TRIP_DATA = {

  // ---------- THÔNG TIN CHUNG ----------
  tripName: "Huế x gogo",
  subtitle: "3 ngày 2 đêm rong ruổi đuổi nhau ở Huế",
  dateRange: "16-20/07 · Thứ 5 đến Thứ 2",
  intro: "3 ngày lượn lờ từ Đại Nội ra tới biển, mục tiêu ăn sập Huế và có những kỷ niệm đẹp together. Let's goooo!",
  reflectionOpensAt: "2026-07-19T00:00:00+07:00",

  // ---------- THÀNH VIÊN ----------
  members: [
    { name: "mạnh", role: "" },
    { name: "san", role: "" },
    { name: "thảo", role: "" },
    { name: "mi", role: "" },
    { name: "linh", role: "" },
    { name: "tamle", role: "" },
    { name: "dan", role: "" },
    { name: "quanlele", role: "" },
    { name: "minhtran", role: "" },
    { name: "gtm", role: "" }
  ],

  // ---------- NOTE ĐỒ CẦN MANG ----------
  packingList: {
    groups: [
      {
        title: "Trong vali",
        icon: "luggage",
        tone: "green",
        items: [
          "Đồ lót, đồ ngủ và tất dự phòng",
          "3-4 bộ đồ đi chơi, đủ thay sau buổi biển",
          "Áo khoác mỏng hoặc khăn choàng",
          "Giày đi bộ êm và một đôi dép"
        ]
      },
      {
        title: "Giấy tờ & điện thoại",
        icon: "wallet-cards",
        tone: "gold",
        items: [
          "CCCD, tiền mặt và thẻ ngân hàng",
          "Thông tin vé xe, giờ đón và số liên hệ",
          "Điện thoại, sạc và pin dự phòng",
          "Tai nghe, gối cổ hoặc bịt mắt cho chuyến xe đêm"
        ]
      },
      {
        title: "Chăm sóc cá nhân",
        icon: "heart-pulse",
        tone: "pink",
        items: [
          "Bàn chải, kem đánh răng, khăn mặt",
          "Đồ skincare, dầu gội và lăn khử mùi",
          "Thuốc đang dùng, thuốc đau đầu, đau bụng và băng cá nhân",
          "Kính, lens và nước ngâm lens nếu dùng",
          "Gel rửa tay khô"
        ]
      },
      {
        title: "Nắng mưa ngoài đường",
        icon: "cloud-sun-rain",
        tone: "blue",
        items: [
          "Kem chống nắng và xịt chống muỗi",
          "Ô gấp gọn hoặc áo mưa mỏng",
          "Bình nước cá nhân, khăn giấy và khẩu trang",
          "Túi đeo nhỏ để cầm theo đồ quan trọng",
          "Quạt mini hoặc khăn làm mát"
        ]
      },
      {
        title: "Biển & picnic",
        icon: "waves",
        tone: "blue",
        items: [
          "Đồ bơi hoặc bộ đồ thay ngay sau khi ướt",
          "Khăn tắm và túi đựng đồ ướt",
          "Túi chống nước cho điện thoại",
          "Mũ, kính râm và dây buộc tóc"
        ]
      },
      {
        title: "Hội chị em nếu cần",
        icon: "sparkles",
        tone: "pink",
        items: [
          "Băng vệ sinh hoặc tampon và thuốc theo chu kỳ",
          "Túi makeup, tẩy trang và bông tẩy trang",
          "Áo dán, miếng lót hoặc phụ kiện cho set đồ chụp ảnh",
          "Lược, kẹp tóc và dây buộc tóc dự phòng"
        ]
      },
      {
        title: "Hội anh em nếu cần",
        icon: "scissors",
        tone: "green",
        items: [
          "Đồ cạo râu, sáp tóc và lược",
          "Lăn khử mùi hoặc nước hoa",
          "Đồ lót và tất dự phòng",
          "Thuốc cá nhân hoặc đồ chăm sóc da đang dùng"
        ]
      },
      {
        title: "Đồ dùng chung",
        icon: "users-round",
        tone: "shared",
        note: "Chốt người mang trước khi đi!",
        items: [
          "Máy ảnh, hắt sáng và tripod",
          "Bạt hoặc khăn picnic lớn",
          "Loa mini và dây sạc",
          "Ổ cắm kéo dài hoặc sạc nhiều cổng",
          "Bộ bài, trò chơi, túi rác nhỏ, khăn ướt",
          "Thùng nước"
        ]
      }
    ]
  },

  // ---------- GOOGLE MAPS ----------
  locations: {
    inn91: {
      name: "INN91 Homestay",
      mapsUrl: "https://maps.app.goo.gl/bqz6FHiSViWebT477",
      image: "figures/places/homestay.png",
      desc: "91 Đinh Tiên Hoàng"
    },
    cho_dong_ba: {
      name: "Chợ Đông Ba",
      mapsUrl: "https://maps.app.goo.gl/eYzzkGC7ziLgiXiN8",
      image: "figures/places/cho_dong_ba.jpg",
      desc: "2 Trần Hưng Đạo, Phú Xuân"
    },
    lang_khai_dinh: {
      name: "Lăng Khải Định",
      mapsUrl: "https://maps.app.goo.gl/5omSWVP1GtpuSTT77",
      image: "figures/places/lang_khai_dinh.jpg",
      desc: "Thủy Bằng, Hương Thủy"
    },
    com_hen_hoa_dong: {
      name: "Cơm hến Hoa Đông",
      mapsUrl: "https://maps.app.goo.gl/rZSw4jHgNeq7Yik6A",
      image: "figures/food/com_hen_hoa_dong.jpg",
      desc: "64 Kiệt 7 Ưng Bình"
    },
    nem_lui_ba_ty: {
      name: "Nem lụi Bà Tý",
      mapsUrl: "https://maps.app.goo.gl/vGsJBqUWKG34EAz27",
      image: "figures/food/nem_lui_ba_ty.jpg",
      desc: "81 Đào Duy Từ, tổ 1"
    },
    dai_noi: {
      name: "Đại Nội Huế",
      mapsUrl: "https://maps.app.goo.gl/72VsdLE8GNwVmKpK7",
      image: "figures/places/dai_noi_hue.jpg",
      desc: "Đường 23 tháng 8, Thuận Hòa"
    },
    chua_thien_mu: {
      name: "Chùa Thiên Mụ",
      mapsUrl: "https://maps.app.goo.gl/mBPmUHe5GZZmmJjV9",
      image: "figures/places/chua_thien_mu.jpg",
      desc: "Đồi Hà Khê, phường Hương Long"
    },
    ca_hue: {
      name: "Ca Huế trên sông Hương",
      mapsUrl: "https://maps.app.goo.gl/nD1mwo72odrW3qLw6",
      image: "figures/places/ca_hue_tren_song_huong.jpg",
      desc: "Điểm lên thuyền nghe ca Huế."
    },
    ca_phe_dang_thai_than: {
      name: "Cà phê Đặng Thái Thân",
      image: "figures/food/ca_phe_dang_thai_than.jpg",
      desc: "Đặng Thái Thân, Phú Xuân"
    },
    bun_canh_ca_loc_binh: {
      name: "Bún canh cá lóc Bình",
      mapsUrl: "https://maps.app.goo.gl/mwqh2GaBt9ipoxYu5",
      image: "figures/food/bun_canh_ca_loc_binh.jpg",
      desc: "140 Trường Chinh, An Cựu"
    },
    bien_tan_an: {
      name: "Biển Tân An",
      mapsUrl: "https://maps.app.goo.gl/QJBDW2YXVbb4kF578",
      image: "figures/places/bien_tan_an.jpg",
      desc: "Phong Quảng"
    },
    bun_hanh: {
      name: "Bún Hạnh",
      mapsUrl: "https://maps.app.goo.gl/BVuDtZSc1qpTn5er9",
      image: "figures/food/quan_bun_hanh.png",
      desc: "35 Nguyễn Thái Học, Thuận Hóa"
    },
    lang_tu_duc: {
      name: "Lăng Tự Đức",
      mapsUrl: "https://maps.app.goo.gl/Wu2HW9tApSQgD8bW9",
      image: "figures/places/lang_tu_duc.jpg",
      desc: "Ấp Trâm Bái, làng Dương Xuân, phường Thủy Xuân"
    },
    banh_ep_hue: {
      name: "Bánh Ép Huệ",
      mapsUrl: "https://maps.app.goo.gl/DHZz3REqpuA4AyUaA",
      image: "figures/food/banh_ep_hue.jpg",
      desc: "1 Kiệt 145 Điện Biên Phủ."
    },
    cong_vien_phu_xuan: {
      name: "Công viên Phú Xuân",
      mapsUrl: "https://maps.app.goo.gl/nrwtHuVbpSuZ45oK7",
      image: "figures/places/cong_vien_phu_xuan.jpg",
      desc: "Phường Phú Thuận"
    },
    banh_loc_dao_tan: {
      name: "Bánh lọc Đào Tấn dì Huệ",
      mapsUrl: "https://maps.app.goo.gl/iMVML5rChfnwAwBY9",
      image: "figures/food/banh_loc_dao_tan.jpg",
      desc: "47 Đào Tấn, Thuận Hóa"
    },
    banh_canh_o_buom: {
      name: "Bánh canh O Bướm",
      mapsUrl: "https://maps.app.goo.gl/qtWh42i8urNnHqty9",
      image: "figures/food/banh_canh_o_buom.jpg",
      desc: "3 Trịnh Công Sơn, Phú Xuân"
    },
    che_thanh: {
      name: "Chè Thanh",
      mapsUrl: "https://maps.app.goo.gl/kifg4J74RdPb9GDS7",
      image: "figures/food/che_thanh.jpg",
      desc: "76-78 Mai Thúc Loan, Phú Xuân"
    },
    banh_mi_lo_cui: {
      name: "Bánh mì lò củi",
      mapsUrl: "https://maps.app.goo.gl/iP96k69Xqr6L96Rh7",
      image: "figures/food/banh_mi_lo_cui.jpg",
      desc: "149b Nhật Lệ."
    },
    lang_gia_long: {
      name: "Lăng Gia Long",
      mapsUrl: "https://maps.app.goo.gl/BaVt3tcZTfCymCc2A",
      image: "figures/places/lang_gia_long.jpg",
      desc: "Xã Hương Thọ, thị xã Hương Trà"
    },
    cung_an_dinh: {
      name: "Cung An Định",
      mapsUrl: "https://maps.app.goo.gl/dwrCpHXd38jcVjyD8",
      image: "figures/places/cung_an_dinh.jpg",
      desc: "179 Phan Đình Phùng, Thuận Hóa"
    },
    quan_banh_chi: {
      name: "Quán bánh Chi",
      mapsUrl: "https://maps.app.goo.gl/DmnHDajsCnXG86P76",
      image: "figures/food/quan_banh_chi.jpg",
      desc: "52 Lê Viết Lượng, Vỹ Dạ"
    },
    donald_trung: {
      name: "Cuộn thịt heo Donald Trung",
      mapsUrl: "https://maps.app.goo.gl/mLL4xn1m8g948KB76",
      image: "figures/food/donald_trung.jpg",
      desc: "28 Hoàng Văn Thụ, Vỹ Dạ, Huế"
    },
    quoc_hoc_hue: {
      name: "Trường Quốc Học Huế",
      mapsUrl: "https://maps.app.goo.gl/rgeY6MSQwcfEQhcSA",
      image: "figures/places/truong_quoc_hoc_hue.jpg",
      desc: "12 Lê Lợi, Thuận Hóa"
    }
  },

  weatherDates: [
    { label: "17-19/07", start: "2026-07-17", end: "2026-07-19" },
    { label: "17/07", start: "2026-07-17", end: "2026-07-17" },
    { label: "18/07", start: "2026-07-18", end: "2026-07-18" },
    { label: "19/07", start: "2026-07-19", end: "2026-07-19" }
  ],

  weatherPlaces: [
    { key: "hue_center", name: "Trung tâm Huế", lat: 16.4637, lng: 107.5909 },
    { key: "inn91", name: "INN91 Homestay", lat: 16.4765113, lng: 107.5762252 },
    { key: "cho_dong_ba", name: "Chợ Đông Ba", lat: 16.4726918, lng: 107.5875342 },
    { key: "lang_khai_dinh", name: "Lăng Khải Định", lat: 16.3990976, lng: 107.588257 },
    { key: "dai_noi", name: "Đại Nội Huế", lat: 16.4702226, lng: 107.5745753 },
    { key: "chua_thien_mu", name: "Chùa Thiên Mụ", lat: 16.4531024, lng: 107.5431506 },
    { key: "ca_hue", name: "Ca Huế trên sông Hương", lat: 16.4702946, lng: 107.5908665 },
    { key: "bien_tan_an", name: "Biển Tân An", lat: 16.605387, lng: 107.5679205 },
    { key: "lang_tu_duc", name: "Lăng Tự Đức", lat: 16.4330969, lng: 107.5639918 },
    { key: "cong_vien_phu_xuan", name: "Công viên Phú Xuân", lat: 16.4660045, lng: 107.5806269 },
    { key: "lang_gia_long", name: "Lăng Gia Long", lat: 16.3620049, lng: 107.5943581 },
    { key: "cung_an_dinh", name: "Cung An Định", lat: 16.4566559, lng: 107.5957067 },
    { key: "quoc_hoc_hue", name: "Trường Quốc Học Huế", lat: 16.4600498, lng: 107.5807772 }
  ],

  // ---------- LỊCH TRÌNH ----------
  days: [
    {
      day: 1,
      title: "Khởi hành & ngày đầu ở Huế",
      date: "Thứ 5 (16/7) - Thứ 6 (17/7)",
      blocks: [
        { time: "17:00 (16/7)", activity: "Xuất phát từ Hà Nội đi Huế", note: "Ngủ lấy sức trên xe nha mấy má" },
        { time: "05:30", activity: "Có mặt tại Huế, về homestay cất đồ", note: "INN91 Homestay - 91 Đinh Tiên Hoàng", location: "inn91" },
        { time: "06:00", activity: "Ăn sáng tại chợ Đông Ba", note: "Tranh thủ lượn sắm áo Huế cho bằng bạn bằng bè", location: "cho_dong_ba" },
        { time: "07:30", activity: "Cà phê Đặng Thái Thân", note: "Sống ảo nhẹ nhàng buổi sáng", location: "ca_phe_dang_thai_than" },
        { time: "09:00", activity: "Tham quan Lăng Khải Định", note: "Dresscode: áo Huế + quần jeans nha", location: "lang_khai_dinh", outfit: "Áo Huế + Jeans" },
        { time: "12:15", activity: "Ăn trưa: Cơm hến Hoa Đông, Nem lụi Bà Tý", note: "81 Đào Duy Từ", locations: ["com_hen_hoa_dong", "nem_lui_ba_ty"] },
        { time: "13:45", activity: "Về khách sạn nghỉ trưa", note: "Ngủ xíu chiều còn sức lượn tiếp", location: "inn91" },
        { time: "14:45", activity: "Tham quan Đại Nội (Hoàng thành Huế)", note: "Dresscode: tông pastel bánh bèo", location: "dai_noi", outfit: "Random\nƯu tiên Pastel" },
        { time: "17:00", activity: "Chùa Thiên Mụ", note: "Ai bào nổi thì đi tiếp, không thì dạt về =))", location: "chua_thien_mu" },
        { time: "18:30", activity: "Ăn tối: Bún canh cá lóc Bình", note: "Quán chỉ mở buổi tối", location: "bun_canh_ca_loc_binh" },
        { time: "20:30", activity: "Nghe ca Huế trên sông Hương", note: "Chill chill", location: "ca_hue" },
        { time: "21:45", activity: "Trò chơi tối", note: "Bí mật, cấm tò mò nha" }
      ]
    },
    {
      day: 2,
      title: "Bình minh biển Tân An & khám phá Huế",
      date: "Thứ 7 (18/7)",
      blocks: [
        { time: "04:15", activity: "Ra biển Tân An đón bình minh", note: "Đứa nào cao su là bỏ lại nha, nhớ ngủ sớm!", location: "bien_tan_an", outfit: "Xanh dương\nTrắng" },
        { time: "04:50-08:25", activity: "Team Building trên biển", note: "6 trò chơi - vui không thì không biết", location: "bien_tan_an" },
        { time: "10:00", activity: "Ăn sáng muộn: Bún Hạnh", note: "Bù đắp calo vừa mất", location: "bun_hanh" },
        { time: "11:00", activity: "Về khách sạn nghỉ ngơi", note: "Tranh thủ sạc pin cho người và điện thoại" },
        { time: "14:00", activity: "Tham quan Lăng Tự Đức", note: "Tiện đường rẽ vô Làng Hương sống ảo 7749 tấm", location: "lang_tu_duc" },
        { time: "15:30", activity: "Ăn vặt: Bánh ép Huệ", note: "Giải lao giữa giờ", location: "banh_ep_hue" },
        { time: "16:30", activity: "Picnic & ngắm hoàng hôn ở Công viên Phú Xuân", note: "Ra bãi cỏ chèo SUP chill chill", location: "cong_vien_phu_xuan", outfit: "Nâu\nBe\nVàng\nTrắng" },
        { time: "19:00-21:00", activity: "Lang thang ăn tối: bánh lọc, bánh canh, chè Thanh", note: "Ăn sập cái đất Huế này", locations: ["banh_loc_dao_tan", "banh_canh_o_buom", "che_thanh"] },
        { time: "22:00", activity: "Trò chơi tối", note: "Tiếp tục chuyên mục tấu hài" },
      ]
    },
    {
      day: 3,
      title: "Tham quan cuối & lên đường về",
      date: "Chủ Nhật (19/7) - Thứ 2 (20/7)",
      blocks: [
        { time: "07:30", activity: "Ăn sáng: Bánh mì lò củi", note: "149 Nhật Lệ", location: "banh_mi_lo_cui" },
        { time: "08:00", activity: "Tham quan Lăng Gia Long", note: "Hơi xa tí nhưng lên hình bao nghệ", location: "lang_gia_long", outfit: "Random\nƯu tiên pastel" },
        { time: "09:45", activity: "Cung An Định", note: "Ai thích thì nhích", location: "cung_an_dinh" },
        { time: "11:00", activity: "Ăn trưa: bánh bèo - nậm - lọc, cuốn thịt heo", note: "Cố ăn nốt đồ Huế rồi về", locations: ["quan_banh_chi", "donald_trung"] },
        { time: "13:00", activity: "Ghé Trường Quốc Học Huế", note: "Dresscode bao xịn: jeans / đen / be", location: "quoc_hoc_hue", outfit: "Jeans\nĐen\nBe" },
        { time: "15:00", activity: "Cà phê hoặc dạo công viên ven sông Hương", note: "Tiêu nốt số tiền còn lại", location: "song_huong" },
        { time: "17:30", activity: "Lên xe khởi hành về Hà Nội", note: "Tạm biệt Huế nhaa" },
        { time: "Trên xe", activity: "Tổng kết chuyến đi", note: "Tâm sự tuổi hồng" },
        { time: "05:00 (20/7)", activity: "Có mặt tại Hà Nội", note: "Kết thúc chuyến đi bão táp" }
      ]
    }
  ],

  itineraryPlaces: [
    {
      key: "cho_dong_ba",
      day: "Ngày 1",
      time: "06:00",
      title: "Chợ Đông Ba",
      image: "figures/places/cho_dong_ba.jpg",
      detailUrl: "https://slowtravelhue.com/vi/lich-su-va-sac-mau-cua-cho-dong-ba/",
      meta: "Chợ trung tâm bên sông Hương",
      desc: "Chợ Đông Ba gắn với nhịp sống Huế hơn một thế kỷ, từng là nơi buôn bán lớn của kinh đô bên bờ sông Hương. Ghé chợ buổi sáng sẽ thấy Huế rất đời thường: hàng ăn, vải vóc, mắm, mè xửng và đủ thứ quà địa phương."
    },
    {
      key: "lang_khai_dinh",
      day: "Ngày 1",
      time: "09:00",
      title: "Lăng Khải Định",
      image: "figures/places/lang_khai_dinh.jpg",
      detailUrl: "https://eticket.hueworldheritage.org.vn/diem-den/lang-khai-dinh",
      meta: "Lăng vua triều Nguyễn",
      desc: "Lăng Khải Định xây đầu thế kỷ 20 cho vị vua thứ 12 triều Nguyễn. Công trình nổi bật vì cách pha trộn kiến trúc cung đình Việt với ảnh hưởng châu Âu, đặc biệt là nội thất khảm sành sứ và thủy tinh rất cầu kỳ."
    },
    {
      key: "dai_noi",
      day: "Ngày 1",
      time: "14:45",
      title: "Đại Nội Huế",
      image: "figures/places/dai_noi_hue.jpg",
      detailUrl: "https://eticket.hueworldheritage.org.vn/diem-den/dai-noi-hue",
      meta: "Trung tâm Hoàng thành",
      desc: "Đại Nội là phần quan trọng nhất của Kinh thành Huế, nơi triều Nguyễn đặt hoàng cung và bộ máy triều đình trong hơn 100 năm. Đi qua Ngọ Môn, sân điện Thái Hòa và các cung điện là đi vào lớp lịch sử rõ nhất của cố đô."
    },
    {
      key: "chua_thien_mu",
      day: "Ngày 1",
      time: "17:00",
      title: "Chùa Thiên Mụ",
      image: "figures/places/chua_thien_mu.jpg",
      detailUrl: "https://hue.gov.vn/Du-khach/Thong-tin-du-khach/Kham-pha-Hue/tb/Chua-Thien-Mu-485886",
      meta: "Ngôi chùa bên đồi Hà Khê",
      desc: "Chùa Thiên Mụ được xem là một trong những ngôi chùa biểu tượng của Huế, nằm trên đồi Hà Khê nhìn xuống sông Hương. Tháp Phước Duyên và không gian chùa gắn với nhiều câu chuyện lịch sử, tôn giáo và văn hóa của vùng đất cố đô."
    },
    {
      key: "ca_hue",
      day: "Ngày 1",
      time: "20:30",
      title: "Ca Huế trên sông Hương",
      image: "figures/places/ca_hue_tren_song_huong.jpg",
      detailUrl: "https://cahuetrensonghuong.com/nghe-ca-hue-tren-song-huong/",
      meta: "Trải nghiệm buổi tối trên thuyền",
      desc: "Ca Huế hình thành từ dòng nhạc cung đình và dân gian xứ Huế, thường được nghe trên thuyền rồng giữa sông Hương. Đây là đoạn chậm lại của chuyến đi: nghe giọng Huế, tiếng đàn và những làn điệu đã đi cùng đời sống cố đô."
    },
    {
      key: "bien_tan_an",
      day: "Ngày 2",
      time: "04:15",
      title: "Biển Tân An",
      image: "figures/places/bien_tan_an.jpg",
      detailUrl: "https://luhanhvietnam.com.vn/du-lich/bai-bien-tan-an-hue.html",
      meta: "Bình minh và team building",
      desc: "Biển Tân An nằm phía ngoài trung tâm Huế, không phải kiểu điểm di tích cổ nhưng là một lát cắt khác của vùng đất này: làng biển, bình minh và nhịp sống ven phá. Chỗ này hợp để đổi gió sau một ngày đi lăng tẩm, rồi chơi team building trên cát."
    },
    {
      key: "lang_tu_duc",
      day: "Ngày 2",
      time: "14:00",
      title: "Lăng Tự Đức",
      image: "figures/places/lang_tu_duc.jpg",
      detailUrl: "https://eticket.hueworldheritage.org.vn/diem-den/lang-tu-duc",
      meta: "Không gian lăng tẩm, hồ và vườn",
      desc: "Lăng Tự Đức là nơi vua Tự Đức cho xây như một không gian nghỉ ngơi, làm thơ và sau này là nơi an táng. Khác với vẻ đồ sộ của nhiều công trình khác, lăng nghiêng về sự trầm lắng, có hồ, nhà tạ và kiến trúc gần với tâm trạng của vị vua nhiều chữ nghĩa."
    },
    {
      key: "cong_vien_phu_xuan",
      day: "Ngày 2",
      time: "16:30",
      title: "Công viên Phú Xuân",
      image: "figures/places/cong_vien_phu_xuan.jpg",
      detailUrl: "https://cautruongtien.vn/cong-vien-phu-xuan/",
      meta: "Picnic ven sông Hương",
      desc: "Công viên Phú Xuân nằm trong không gian đô thị ven sông Hương, nơi Huế hiện đại gặp nhịp sông rất cũ. Sau các điểm di tích, đây là chỗ để ngồi lại, nhìn thành phố chậm xuống và gom sức cho buổi tối."
    },
    {
      key: "lang_gia_long",
      day: "Ngày 3",
      time: "08:00",
      title: "Lăng Gia Long",
      image: "figures/places/lang_gia_long.jpg",
      detailUrl: "https://eticket.hueworldheritage.org.vn/diem-den/lang-gia-long",
      meta: "Lăng vị vua đầu triều Nguyễn",
      desc: "Lăng Gia Long là nơi an nghỉ của vị vua sáng lập triều Nguyễn. Khu lăng nằm xa trung tâm hơn, trải trong thế núi đồi và sông nước rộng, nên cảm giác rất khác: ít ồn, nhiều khoảng trống và có dáng vẻ mở đầu cho cả một triều đại."
    },
    {
      key: "cung_an_dinh",
      day: "Ngày 3",
      time: "09:45",
      title: "Cung An Định",
      image: "figures/places/cung_an_dinh.jpg",
      detailUrl: "https://eticket.hueworldheritage.org.vn/diem-den/cung-an-dinh",
      meta: "Cung điện phong cách giao thoa",
      desc: "Cung An Định là công trình đầu thế kỷ 20, gắn với giai đoạn cuối triều Nguyễn và đời sống hoàng gia sau thời hoàng cung truyền thống. Kiến trúc Á - Âu, màu vàng nổi bật và các mảng trang trí cầu kỳ làm nơi này có vẻ rất khác so với Đại Nội."
    },
    {
      key: "quoc_hoc_hue",
      day: "Ngày 3",
      time: "13:00",
      title: "Trường Quốc Học Huế",
      image: "figures/places/truong_quoc_hoc_hue.jpg",
      detailUrl: "https://hue.gov.vn/Du-khach/Thong-tin-du-khach/Kham-pha-Hue/tb/Di-tich-Truong-Quoc-Hoc-Hue-Di-tich-lich-su-cap-Quoc-gia-dac-biet-991564",
      meta: "Ngôi trường đỏ bên đường Lê Lợi",
      desc: "Quốc Học Huế là một trong những ngôi trường lâu đời và nổi tiếng nhất Việt Nam, gắn với nhiều nhân vật lịch sử, trí thức và học trò xứ Huế. Dãy nhà đỏ bên đường Lê Lợi vừa đẹp để chụp ảnh, vừa là điểm kết có nhiều ký ức học đường."
    }
  ],

  // ---------- ĐIỂM ĐẾN ----------
  destinations: [
    {
      name: "Chợ Đông Ba",
      image: "figures/places/cho_dong_ba.jpg",
      lat: 16.4711, lng: 107.5850,
      desc: "Khu chợ lâu đời của Huế, hợp để mở màn bằng đồ ăn sáng và quà vặt."
    },
    {
      name: "Lăng Khải Định",
      image: "figures/places/lang_khai_dinh.jpg",
      lat: 16.3853, lng: 107.5772,
      desc: "Lăng tẩm pha trộn kiến trúc Việt, Á Đông và châu Âu, nhiều chi tiết khảm sành sứ."
    },
    {
      name: "Đại Nội Huế",
      image: "figures/places/dai_noi_hue.jpg",
      lat: 16.4698, lng: 107.5796,
      desc: "Phần lõi của Quần thể di tích Cố đô Huế, nơi từng đặt triều đình nhà Nguyễn."
    },
    {
      name: "Chùa Thiên Mụ",
      image: "figures/places/chua_thien_mu.jpg",
      lat: 16.4539, lng: 107.5452,
      desc: "Chùa cổ bên sông Hương, view xịn xò chill chill."
    },
    {
      name: "Biển Tân An",
      image: "figures/places/bien_tan_an.jpg",
      lat: 16.5480, lng: 107.7000,
      desc: "Chỗ để tụi mình đón bình minh và chơi team building trên cát."
    },
    {
      name: "Lăng Tự Đức",
      image: "figures/places/lang_tu_duc.jpg",
      lat: 16.4272, lng: 107.5711,
      desc: "View kiểu sân vườn siêu thơ, sống ảo thì hết sảy."
    },
    {
      name: "Công viên Phú Xuân",
      image: "figures/places/cong_vien_phu_xuan.jpg",
      lat: 16.4685, lng: 107.5765,
      desc: "Bãi cỏ ven sông Hương - chỗ lý tưởng để picnic, chèo SUP và ngắm hoàng hôn."
    },
    {
      name: "Lăng Gia Long",
      image: "figures/places/lang_gia_long.jpg",
      lat: 16.3306, lng: 107.5474,
      desc: "Hơi xa trung tâm xíu nhưng vắng vẻ, tha hồ tạo nét mà không sợ dính người."
    },
    {
      name: "Cung An Định",
      image: "figures/places/cung_an_dinh.jpg",
      lat: 16.4636, lng: 107.5910,
      desc: "Cung điện mang phong cách châu Âu pha trộn kiến trúc cung đình, một góc rất khác của Huế."
    },
    {
      name: "Trường Quốc Học Huế",
      image: "figures/places/truong_quoc_hoc_hue.jpg",
      lat: 16.4653, lng: 107.5936,
      desc: "Trường cấp 3 màu đỏ mận xinh xỉu, toạ độ sống ảo không thể bỏ qua."
    }
  ],

 // ---------- ĐỒ ĂN ----------
food: [
  { name: "Bún bò O Loan", image: "figures/food/bun_bo_o_loan.jpg", address: "158B Phan Chu Trinh", desc: "Bún bò Huế đậm vị, hợp mở màn một ngày đi chơi." },
  { name: "Vịt lộn um bầu", image: "figures/food/vit_lon_um_bau.jpg", address: "9 Nguyễn Khuyến", desc: "Nghe lạ lạ mà ăn cuốn xỉu, béo ngậy cay cay." },
  { name: "Bánh canh O Bướm", image: "figures/food/banh_canh_o_buom.jpg", address: "3 Trịnh Công Sơn", desc: "Bánh canh chuẩn vị Huế luônnn.", note: "Chỉ bán tối thôi nha" },
  { name: "Bún canh cá lóc Bình", image: "figures/food/bun_canh_ca_loc_binh.jpg", address: "Gần trung tâm Huế", desc: "Tô nóng buổi tối, ăn xong ngủ là vừa." },
  { name: "Quán bánh Chi", image: "figures/food/quan_banh_chi.jpg", address: "52 Lê Viết Lượng", desc: "Bèo, nậm, lọc ngon rẻ tụt quần.", note: "Nhớ ra sớm kẻo hết" },
  { name: "Cuộn thịt heo Donald Trung", image: "figures/food/donald_trung.jpg", address: "28 Hoàng Văn Thụ", desc: "Cực phẩm nha mấy bà, không ăn phí nửa đời người!" },
  { name: "Bánh mì O Tho", image: "figures/food/banh_mi_o_tho.jpg", address: "14 Trần Cao Vân", desc: "Ổ bánh mì thịt nướng giòn rụm, cắn miếng là ghiền." },
  { name: "Bánh mì lò củi", image: "figures/food/banh_mi_lo_cui.jpg", address: "149 Nhật Lệ", desc: "Bữa sáng nhanh gọn trước khi chạy lịch ngày cuối." },
  { name: "Bún mắm nêm", image: "figures/food/bun_mam_nem.jpg", address: "Chợ Đông Ba", desc: "Rẻ bèo nhèo mà ngon dính cái nách." },
  { name: "Bánh ép Huệ", image: "figures/food/banh_ep_hue.jpg", address: "1 Kiệt 145 Điện Biên Phủ", desc: "Bánh ép nóng hổi vừa thổi vừa ăn." },
  { name: "Bánh lọc Đào Tấn dì Huệ", image: "figures/food/banh_loc_dao_tan.jpg", address: "Đào Tấn", desc: "Điểm ăn tối ngày 2, gọi thêm là hết đường về." },
  { name: "Cơm hến Hoa Đông", image: "figures/food/com_hen_hoa_dong.jpg", address: "81 Đào Duy Từ", desc: "Cơm hến đúng mood Huế, ăn ít thui không ngon." },
  { name: "Nem lụi Bà Tý", image: "figures/food/nem_lui_ba_ty.jpg", address: "81 Đào Duy Từ", desc: "Ăn kèm bữa trưa ngày đầu cho đủ bộ." },
  { name: "Bún Hạnh", image: "figures/food/quan_bun_hanh.png", address: "Huế", desc: "Ăn sáng muộn sau team building, bù calo vừa mất." },
  { name: "Chè Hẻm", image: "figures/food/che_hem.jpg", address: "1 Kiệt 29 Hùng Vương", desc: "Cú chốt với chè bột lọc heo quay độc lạ Bình Dương." },
  { name: "Chè Thanh", image: "figures/food/che_thanh.jpg", address: "Huế", desc: "Chốt ngọt buổi tối, nhẹ nhàng mà đã." },
  { name: "Cà phê Đặng Thái Thân", image: "figures/food/ca_phe_dang_thai_than.jpg", address: "Đặng Thái Thân", desc: "Sống ảo nhẹ nhàng buổi sáng trước khi đi lăng." }
],

  // ---------- TRÒ CHƠI ----------
games: [
  {
    key: "ma-soi",
    name: "Ma Sói",
    occasion: "Tối ngày 1",
    teaser: "10 mống, một đêm hehe",
    format: "Cá nhân theo phe",
    duration: "45-60 phút mỗi ván",
    scoring: "Mỗi người thuộc phe thắng nhận 1 điểm.",
    rules: [
      "Có 2 Ma Sói, 1 Thầy Bói, 1 Bác Sĩ và những người còn lại là Dân.",
      "Ban đêm mọi người nhắm mắt. Ma Sói chọn người bị loại, Thầy Bói kiểm tra một người và Bác Sĩ chọn một người để cứu.",
      "Ban ngày cả nhóm thảo luận rồi bỏ phiếu loại một người bị nghi là Ma Sói.",
      "Phe Dân thắng khi loại hết Ma Sói. Phe Ma Sói thắng khi số Sói còn lại bằng số người phe Dân."
    ],
    prep: ["Chơi 2-3 ván.", "Quản trò đọc vai rõ ràng và giữ kín mọi lựa chọn ban đêm."]
  },
  {
    key: "anh-challenge-binh-minh",
    name: "Ảnh Challenge Bình Minh",
    occasion: "Sáng ngày 2",
    teaser: "Bốc dáng, chạy máy, chốt ảnh",
    format: "2 hoặc 3 đội",
    duration: "7 phút mỗi đội",
    teamCount: 2,
    teamCountOptions: [2, 3],
    photoPoseCount: 2,
    poseImages: [
      "figures/games/photo/1.jpg",
      "figures/games/photo/2.jpg",
      "figures/games/photo/3.jpg",
      "figures/games/photo/4.jpg",
      "figures/games/photo/5.jpg"
    ],
    scoring: "Mỗi thành viên đội có ảnh được vote cao nhất nhận 1 điểm.",
    rules: [
      "Chia người chơi thành 2 hoặc 3 đội theo cấu hình của quản trò.",
      "Mỗi đội bốc ngẫu nhiên 2 trong bộ 5 ảnh tạo dáng và phải thực hiện đủ 2 dáng đã nhận.",
      "Mỗi đội có 7 phút để tạo dáng và chụp ảnh tại bãi biển, sau đó thành viên trong đội upload ảnh vào album chung của đội.",
      "Khi quản trò mở vote, mỗi người chơi chọn một đội mình thích nhất. Đội nhận nhiều phiếu nhất thắng."
    ],
    prep: ["Dùng camera điện thoại và có thể dùng bộ lọc.", "Mỗi đội kiểm tra đủ 2 dáng trước khi quản trò mở vote."]
  },
  {
    key: "co-caro-tiep-suc",
    name: "Cờ Caro Tiếp Sức",
    occasion: "Sáng ngày 2",
    teaser: "Ngu lắm mới thua =))",
    format: "2 đội",
    duration: "Khoảng 25 phút",
    teamCount: 2,
    scoring: "Mỗi thành viên đội thắng nhận 1 điểm.",
    rules: [
      "Mỗi đội lần lượt cử một người chạy lên đặt một quân cờ vào ô trống rồi chạy về đập tay người tiếp theo.",
      "Mỗi đội chỉ có 3 quân cờ trên bàn.",
      "Khi đã đặt đủ 3 quân mà chưa thắng, lượt tiếp theo phải di chuyển một quân cũ sang ô trống khác.",
      "Đội đầu tiên tạo được một hàng ngang, dọc hoặc chéo gồm 3 quân là đội thắng."
    ],
    prep: ["Chuẩn bị 3 dây đỏ và 3 dây xanh.", "Kẻ bàn cờ đủ lớn để chạy và đặt quân an toàn."]
  },
  {
    key: "rong-san-duoi",
    name: "Rồng Săn Đuôi",
    occasion: "Sáng ngày 2",
    teaser: "MỆT.",
    format: "2 đội",
    duration: "3 trận, 7 phút mỗi trận",
    teamCount: 2,
    scoring: "Mỗi thành viên đội thắng chung cuộc nhận 1 điểm.",
    rules: [
      "Mỗi đội xếp thành một hàng dọc, người sau giữ người trước và không được buông hàng.",
      "Người đầu hàng tìm cách chạm vào người cuối của đội đối phương, đồng thời bảo vệ đuôi đội mình.",
      "Không kéo, đẩy hoặc va chạm nguy hiểm với đội đối phương.",
      "Sau 3 trận, đội ghi nhiều điểm hơn hoặc giữ được nhiều thành viên hơn là đội thắng."
    ],
    prep: ["Chọn khu vực cát phẳng, không có vật sắc.", "Dừng ngay nếu hàng bị ngã hoặc có va chạm mạnh."]
  },
  {
    key: "vuot-ai-song-bien",
    name: "Vượt Ải Sóng Biển",
    occasion: "Sáng ngày 2",
    teaser: "MẶC ĐỒ BƠI đi cho mát",
    format: "Cá nhân",
    duration: "Khoảng 20 phút",
    scoring: "Ba người trụ lại cuối cùng nhận 1 điểm.",
    rules: [
      "Cả nhóm đứng thành hàng ngang tại mép nước, ở khu vực an toàn do quản trò chọn.",
      "Khi quản trò hô, mọi người phải nhảy đồng loạt để tránh con sóng đang vào.",
      "Người để sóng chạm chân hoặc không nhảy đúng hiệu lệnh sẽ bị loại.",
      "Trò chơi kết thúc khi còn lại 3 người."
    ],
    prep: ["Chỉ chơi khi sóng nhỏ và thời tiết an toàn.", "Không tiến ra vùng nước sâu, ưu tiên an toàn hơn kết quả."]
  },
  {
    key: "truyen-nuoc",
    name: "Truyền Nước",
    occasion: "Sáng ngày 2",
    teaser: "Hài lắm",
    format: "2 đội",
    duration: "Khoảng 20 phút",
    teamCount: 2,
    scoring: "Mỗi thành viên đội có nhiều nước hơn nhận 1 điểm.",
    rules: [
      "Hai đội nằm hoặc ngồi thành hai hàng dọc.",
      "Người đầu hàng lấy nước bằng đĩa và truyền lần lượt qua đầu cho người phía sau.",
      "Người cuối hàng đổ phần nước nhận được vào bình của đội mình.",
      "Khi hết giờ, đội có lượng nước trong bình cao hơn là đội thắng."
    ],
    prep: ["Chuẩn bị 2 đĩa nông và 2 bình trong suốt.", "Mặc đồ có thể bị ướt và tránh dùng bình thủy tinh ở khu vực chơi."]
  },
  {
    key: "doan-tau-mu",
    name: "Đoàn Tàu Mù",
    occasion: "Sáng ngày 2",
    teaser: "Erhhhh...",
    format: "3 đội",
    duration: "Khoảng 30 phút",
    teamCount: 3,
    scoring: "Mỗi thành viên đội hoàn thành đường đi nhanh và đúng luật nhất nhận 1 điểm.",
    rules: [
      "Mỗi đội xếp thành hàng dọc, người sau đặt tay lên vai người trước.",
      "Tất cả nhắm mắt, chỉ người cuối hàng được mở mắt.",
      "Người cuối truyền tín hiệu hướng đi bằng cách vỗ vai. Tín hiệu phải được truyền lần lượt lên đầu tàu.",
      "Đội phối hợp vượt chướng ngại vật và về đích đúng luật nhanh nhất là đội thắng."
    ],
    prep: ["Một đội chơi, hai đội còn lại đứng làm chướng ngại vật an toàn rồi đổi lượt.", "Không dùng chướng ngại vật cứng hoặc sắc."]
  },
  {
    key: "who-is-the-imposter",
    name: "Who Is The Imposter?",
    occasion: "Tối ngày 2",
    teaser: "Trò này hay lắm (gtm spoil)",
    format: "Cá nhân",
    duration: "15-20 giây mỗi lượt nghe",
    scoring: "Người tìm đúng imposter hoặc imposter sống sót nhận 1 điểm theo quyết định của Quản trò.",
    rules: [
      "Mọi người đeo tai nghe. Quản trò bật cùng một bài nhạc cho đa số và một bài khác cho imposter.",
      "Khi nhạc chạy, mọi người phải nhún nhảy hoặc dùng động tác để thể hiện bài mình nghe.",
      "Không được nói hoặc hát thành tiếng.",
      "Sau mỗi lượt, cả nhóm thảo luận và vote người bị nghi là imposter."
    ],
    prep: ["Mỗi người dùng tai nghe và bấm Sẵn sàng trên web trước khi Quản trò bắt đầu.", "Quản trò chuẩn bị link YouTube, mốc bắt đầu và thời lượng nghe cho từng bài.", "Âm lượng vừa đủ, không nghe quá lớn trong thời gian dài."]
  },
  {
    key: "su-that-va-loi-noi-doi",
    name: "Sự Thật & Lời Nói Dối",
    occasion: "Tối ngày 2",
    teaser: "Bịa cho khéo, đoán cho chuẩn",
    format: "Cá nhân",
    duration: "Khoảng 20 phút",
    rules: [
      "Theo vòng tròn, mỗi người nói một sự thật và một lời nói dối về bản thân.",
      "Cả nhóm được thảo luận ngắn trước khi chọn câu nào là thật.",
      "Người nói công bố đáp án sau khi mọi người đã chốt lựa chọn.",
      "Quản trò ghi lại số lần đoán đúng. Người có nhiều đáp án đúng nhất thắng."
    ],
    prep: ["Nghĩ trước một lời nói dối đủ hợp lý để khó bị phát hiện."]
  },
  {
    key: "truth-or-dare",
    name: "Truth or Dare",
    occasion: "Tối ngày 2",
    teaser: "Thảo tâm huyết trò này lắm đừng ai bỏ lỡ",
    format: "Cá nhân",
    duration: "30-45 phút",
    rules: [
      "Xoay chai hoặc dùng ứng dụng để chọn người chơi.",
      "Người được chọn phải chọn Truth hoặc Dare.",
      "Truth phải trả lời thật. Dare phải hoàn thành thử thách được rút.",
      "Nếu từ chối cả hai, người chơi nhận một hình phạt vui do nhóm thống nhất."
    ],
    prep: ["Không hỏi hoặc yêu cầu điều quá riêng tư, nguy hiểm hay gây khó chịu.", "Hình phạt gợi ý là ăn một lát chanh."]
  },
  {
    name: "Ai Là Gián Điệp?",
    occasion: "Xuyên suốt chuyến đi",
    teaser: "Trông thế mà lại hay",
    key: "spy-game",
    format: "Cá nhân theo phe",
    duration: "Xuyên suốt chuyến đi",
    scoring: "Dân thắng nhận 1 điểm mỗi người. Gián điệp thắng nhận 3 điểm mỗi người.",
    rules: [
      "Có 2 gián điệp, các thành viên còn lại là Dân. Quản trò không tham gia và không xuất hiện trên bảng xếp hạng.",
      "Mỗi gián điệp nhận 3-5 nhiệm vụ bí mật và phải hoàn thành mà không bị phát hiện.",
      "Dân tìm gián điệp qua 2 vòng vote. Mỗi người chọn tối đa 2 người ở mỗi vòng.",
      "Dân thắng khi loại đủ 2 gián điệp. Gián điệp thắng khi còn sống và hoàn thành nhiệm vụ."
    ],
    prep: ["Vai trò và nhiệm vụ được giữ kín cho tới khi game kết thúc."]
  }
],

  // ---------- AI LÀ GIÁN ĐIỆP ----------
spyGame: {
  missions: [
    "Chụp lén 3 tấm ảnh nhóm đang cười mà không ai biết.",
    "Rủ ít nhất 2 người đổi chỗ ngồi trong một bữa ăn.",
    "Làm cả nhóm nói từ \"Huế\" ít nhất 10 lần trong 30 phút.",
    "Gài một câu hát vào cuộc nói chuyện mà không bị bắt bài.",
    "Thuyết phục một người chụp ảnh sống ảo ở địa điểm bất kỳ."
  ],
  rules: [
    "Mỗi game mới có 2 gián điệp; người còn lại không phải quản trò là dân.",
    "Dân tìm gián điệp qua 2 vòng vote.",
    "Vòng 1 vote 2 người, loại 1 người.",
    "Vòng 2 vote 2 người; nếu vòng 1 loại trúng gián điệp thì vòng 2 loại 1, nếu trượt thì vòng 2 loại 2.",
    "Dân thắng khi loại đủ 2 gián điệp. Nếu còn gián điệp sống và nhiệm vụ đã xong, gián điệp thắng."
  ]
}
};
