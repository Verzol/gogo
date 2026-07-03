const TRIP_DATA = {

  // ---------- THÔNG TIN CHUNG ----------
  tripName: "Huế x gogo",
  subtitle: "3 ngày 2 đêm rong ruổi đuổi nhau ở Huế",
  dateRange: "16 – 20/07 · Thứ 5 đến Thứ 2",
  intro: "3 ngày lượn lờ từ Đại Nội ra tới biển, mục tiêu ăn sập Huế và có những kỷ niệm đẹp together. Let's goooo!",

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

  // ---------- LỊCH TRÌNH ----------
  days: [
    {
      day: 1,
      title: "Khởi hành & ngày đầu ở Huế",
      date: "Thứ 5 (16/7) — Thứ 6 (17/7)",
      blocks: [
        { time: "17:00 (16/7)", activity: "Xuất phát từ Hà Nội đi Huế", note: "Ngủ lấy sức trên xe nha mấy má" },
        { time: "05:30", activity: "Có mặt tại Huế, về homestay cất đồ", note: "INN91 Homestay — 91 Đinh Tiên Hoàng" },
        { time: "06:00", activity: "Ăn sáng tại chợ Đông Ba", note: "Tranh thủ lượn sắm áo Huế cho bằng bạn bằng bè" },
        { time: "07:30", activity: "Cà phê Đặng Thái Thân", note: "Sống ảo nhẹ nhàng buổi sáng" },
        { time: "09:00", activity: "Tham quan Lăng Khải Định", note: "Dresscode: áo Huế + quần jeans nha" },
        { time: "12:15", activity: "Ăn trưa: Cơm hến Hoa Đông, Nem lụi Bà Tý", note: "81 Đào Duy Từ" },
        { time: "13:45", activity: "Về khách sạn nghỉ trưa", note: "Ngủ xíu chiều còn sức lượn tiếp" },
        { time: "14:45", activity: "Tham quan Đại Nội (Hoàng thành Huế)", note: "Dresscode: tông pastel bánh bèo" },
        { time: "17:00", activity: "Chùa Thiên Mụ", note: "Ai bào nổi thì đi tiếp, không thì dạt về =))" },
        { time: "18:30", activity: "Ăn tối: Bún canh cá lóc Bình", note: "Quán chỉ mở buổi tối" },
        { time: "20:30", activity: "Nghe ca Huế trên sông Hương", note: "Chill chill" },
        { time: "21:45", activity: "Trò chơi tối", note: "Bí mật, cấm tò mò nha" }
      ]
    },
    {
      day: 2,
      title: "Bình minh biển Tân An & khám phá Huế",
      date: "Thứ 7 (18/7)",
      blocks: [
        { time: "04:15", activity: "Ra biển Tân An đón bình minh", note: "Đứa nào cao su là bỏ lại nha, nhớ ngủ sớm!" },
        { time: "04:50 – 08:25", activity: "Team Building trên biển", note: "6 trò chơi - vui không thì không biết" },
        { time: "10:00", activity: "Ăn sáng muộn: Bún Hạnh", note: "Bù đắp calo vừa mất" },
        { time: "11:00", activity: "Về khách sạn nghỉ ngơi", note: "Tranh thủ sạc pin cho người và điện thoại" },
        { time: "14:00", activity: "Tham quan Lăng Tự Đức", note: "Tiện đường rẽ vô Làng Hương sống ảo 7749 tấm" },
        { time: "15:30", activity: "Ăn vặt: Bánh ép Huệ", note: "Giải lao giữa giờ" },
        { time: "16:30", activity: "Picnic & ngắm hoàng hôn ở Công viên Phú Xuân", note: "Ra bãi cỏ chèo SUP chill chill. Dresscode: nâu / be / trắng" },
        { time: "19:00 – 21:00", activity: "Lang thang ăn tối: bánh lọc, bánh canh, chè Thanh", note: "Ăn sập cái đất Huế này" },
        { time: "22:00", activity: "Trò chơi tối", note: "Tiếp tục chuyên mục tấu hài" },
      ]
    },
    {
      day: 3,
      title: "Tham quan cuối & lên đường về",
      date: "Chủ Nhật (19/7) — Thứ 2 (20/7)",
      blocks: [
        { time: "07:30", activity: "Ăn sáng: Bánh mì lò củi", note: "149 Nhật Lệ" },
        { time: "08:00", activity: "Tham quan Lăng Gia Long", note: "Hơi xa tí nhưng lên hình bao nghệ" },
        { time: "09:45", activity: "Cung An Định", note: "Ai thích thì nhích" },
        { time: "11:00", activity: "Ăn trưa: bánh bèo – nậm – lọc, cuốn thịt heo", note: "Cố ăn nốt đồ Huế rồi về" },
        { time: "13:00", activity: "Ghé Trường Quốc Học Huế", note: "Dresscode bao xịn: jeans / đen / be" },
        { time: "15:00", activity: "Cà phê hoặc dạo công viên ven sông Hương", note: "Tiêu nốt số tiền còn lại" },
        { time: "17:30", activity: "Lên xe khởi hành về Hà Nội", note: "Tạm biệt Huế nhaa" },
        { time: "Trên xe", activity: "Tổng kết chuyến đi", note: "Tâm sự tuổi hồng" },
        { time: "05:00 (20/7)", activity: "Có mặt tại Hà Nội", note: "Kết thúc chuyến đi bão táp" }
      ]
    }
  ],

  // ---------- ĐIỂM ĐẾN ----------
  destinations: [
    {
      name: "Chợ Đông Ba",
      image: "figures/cho_dong_ba.jpg",
      lat: 16.4711, lng: 107.5850,
      desc: "Tấp vô làm bữa sáng rồi sắm vội cái áo huế xịn xò."
    },
    {
      name: "Lăng Khải Định",
      image: "figures/lang_khai_dinh.jpg",
      lat: 16.3853, lng: 107.5772,
      desc: "Chỗ này pha trộn kiến trúc Âu - Á đỉnh lắm (AI bảo thế), lên hình là auto ngầu (cũng AI)."
    },
    {
      name: "Đại Nội Huế",
      image: "figures/dai_noi_hue.jpg",
      lat: 16.4698, lng: 107.5796,
      desc: "Trung tâm quyền lực một thời. (AI nốt)"
    },
    {
      name: "Chùa Thiên Mụ",
      image: "figures/chua_thien_mu.jpg",
      lat: 16.4539, lng: 107.5452,
      desc: "Chùa cổ bên sông Hương, view xịn xò chill chill."
    },
    {
      name: "Biển Tân An",
      image: "figures/bien_tan_an.jpg",
      lat: 16.5480, lng: 107.7000,
      desc: "Chỗ để tụi mình phơi sương đón bình minh và lặn ngụp với mấy trò vận động cười ra nước mắt. (văn AI)"
    },
    {
      name: "Lăng Tự Đức",
      image: "figures/lang_tu_duc.jpg",
      lat: 16.4272, lng: 107.5711,
      desc: "View kiểu sân vườn siêu thơ, sống ảo thì hết sảy."
    },
    {
      name: "Công viên Phú Xuân",
      image: "figures/cong_vien_phu_xuan.jpg",
      lat: 16.4685, lng: 107.5765,
      desc: "Bãi cỏ ven sông Hương — chỗ lý tưởng để picnic, chèo SUP và ngắm hoàng hôn."
    },
    {
      name: "Lăng Gia Long",
      image: "figures/lang_gia_long.jpg",
      lat: 16.3306, lng: 107.5474,
      desc: "Hơi xa trung tâm xíu nhưng vắng vẻ, tha hồ tạo nét mà không sợ dính người."
    },
    {
      name: "Cung An Định",
      image: "figures/cung_an_dinh.jpg",
      lat: 16.4636, lng: 107.5910,
      desc: "Cung điện mang phong cách châu Âu pha trộn kiến trúc cung đình, một góc rất khác của Huế."
    },
    {
      name: "Trường Quốc Học Huế",
      image: "figures/truong_quoc_hoc_hue.jpg",
      lat: 16.4653, lng: 107.5936,
      desc: "Trường cấp 3 màu đỏ mận xinh xỉu, toạ độ sống ảo không thể bỏ qua."
    }
  ],

 // ---------- ĐỒ ĂN ----------
food: [
  { name: "Bún bò O Loan", address: "158B Phan Chu Trinh", desc: "Bún bò Huế đỉnh của chóp, nước dùng đậm đà khỏi bàn." },
  { name: "Vịt lộn um bầu", address: "9 Nguyễn Khuyến", desc: "Nghe lạ lạ mà ăn cuốn xỉu, béo ngậy cay cay." },
  { name: "Bánh canh O Bướm", address: "3 Trịnh Công Sơn", desc: "Bánh canh chuẩn vị Huế luônnn.", note: "Chỉ bán tối thôi nha" },
  { name: "Quán bánh Chi", address: "52 Lê Viết Lượng", desc: "Bèo, Nậm, Lọc ngon rẻ tụt quần.", note: "Nhớ ra sớm kẻo húp cháo" },
  { name: "Cuộn thịt heo Donald Trung", address: "28 Hoàng Văn Thụ", desc: "Cực phẩm nha mấy bà, không ăn phí nửa đời người!" },
  { name: "Bánh mì O Tho", address: "14 Trần Cao Vân", desc: "Ổ bánh mì thịt nướng giòn rụm, cắn miếng là ghiền." },
  { name: "Bún mắm nêm", address: "Chợ Đông Ba", desc: "Rẻ bèo nhèo mà ngon dính cái nách." },
  { name: "Bánh ép Huệ", address: "1 Kiệt 145 Điện Biên Phủ", desc: "Bánh ép nóng hổi vừa thổi vừa ăn." },
  { name: "Chè Hẻm", address: "1 Kiệt 29 Đường Hùng Vương", desc: "Cú chốt với chè bột lọc heo quay độc lạ Bình Dương." }
],

  // ---------- TRÒ CHƠI ----------
games: [
  {
    name: "Ma Sói",
    occasion: "Tối ngày 1",
    teaser: "10 mống, một đêm hehe"
  },
  {
    name: "Săn Trend Biển Tân An",
    occasion: "Sáng ngày 2",
    teaser: "Mấy đứa sợ Tiktok đợi đấy"
  },
  {
    name: "Cờ Caro Tiếp Sức",
    occasion: "Sáng ngày 2",
    teaser: "Ngu lắm mới thua =))"
  },
  {
    name: "Rồng Săn Đuôi",
    occasion: "Sáng ngày 2",
    teaser: "MỆT."
  },
  {
    name: "Vượt Ải Sóng Biển",
    occasion: "Sáng ngày 2",
    teaser: "MẶC ĐỒ BƠI đi cho mát"
  },
  {
    name: "Truyền Nước",
    occasion: "Sáng ngày 2",
    teaser: "Hài lắm"
  },
  {
    name: "Đoàn Tàu Mù",
    occasion: "Sáng ngày 2",
    teaser: "Erhhhh..."
  },
  {
    name: "Who Is The Imposter?",
    occasion: "Tối ngày 2",
    teaser: "Trò này hay lắm (gtm spoil)"
  },
  {
    name: "Phá Băng & Truth or Dare",
    occasion: "Tối ngày 2",
    teaser: "Thảo tâm huyết trò này lắm đừng ai bỏ lỡ"
  },
  {
    name: "Ai Là Gián Điệp?",
    occasion: "Xuyên suốt chuyến đi",
    teaser: "Trông thế mà lại hay"
  }
]
};