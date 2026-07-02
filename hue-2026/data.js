/* ============================================================
   TRIP_DATA — sửa nội dung ở file này là đủ, không cần đụng
   vào style.css hay index.html.
   ============================================================ */

const TRIP_DATA = {

  // ---------- THÔNG TIN CHUNG ----------
  tripName: "Huế x gogo",
  subtitle: "3 ngày 2 đêm rong ruổi đuổi nhau ở Huế",
  dateRange: "16 – 20/07 · Thứ 5 đến Thứ 2",
  intro: "Ba ngày ở Huế, đi từ Đại Nội ra tới biển, ăn hết những món ngon nhất và chơi những trò chơi mà chỉ khi đến giờ mới được bật mí. Mọi thông tin giờ giấc nằm hết ở đây — còn phần bất ngờ thì để dành khi gặp nhau nhé!",

  // ---------- THÀNH VIÊN (SỬA TÊN THẬT VÀO ĐÂY) ----------
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
        { time: "17:00 (16/7)", activity: "Xuất phát từ Hà Nội đi Huế", note: "Di chuyển qua đêm" },
        { time: "05:30", activity: "Có mặt tại Huế, về homestay cất đồ", note: "INN91 Homestay — 91 Đinh Tiên Hoàng" },
        { time: "06:00", activity: "Ăn sáng tại chợ Đông Ba", note: "Tranh thủ mua áo Huế mặc đi chơi" },
        { time: "07:30", activity: "Cà phê Đặng Thái Thân", note: "" },
        { time: "09:00", activity: "Tham quan Lăng Khải Định", note: "Trang phục gợi ý: áo Huế + quần jeans" },
        { time: "12:15", activity: "Ăn trưa: Cơm hến Hoa Đông, Nem lụi Bà Tý", note: "81 Đào Duy Từ" },
        { time: "13:45", activity: "Về khách sạn nghỉ trưa", note: "" },
        { time: "14:45", activity: "Tham quan Đại Nội (Hoàng thành Huế)", note: "Trang phục gợi ý: tông pastel" },
        { time: "17:00", activity: "Chùa Thiên Mụ", note: "Tuỳ chọn, nếu còn sức" },
        { time: "18:30", activity: "Ăn tối: Bún canh cá lóc Bình", note: "Quán chỉ mở buổi tối" },
        { time: "20:30", activity: "Nghe ca Huế trên sông Hương", note: "" },
        { time: "21:45", activity: "Trò chơi tối", note: "Chi tiết đang được giữ bí mật" }
      ]
    },
    {
      day: 2,
      title: "Bình minh biển Tân An & khám phá Huế",
      date: "Thứ 7 (18/7)",
      blocks: [
        { time: "04:15", activity: "Ra biển Tân An đón bình minh", note: "Cách trung tâm khoảng 20km — nhớ ngủ sớm hôm trước" },
        { time: "04:50 – 08:25", activity: "Chuỗi mini game trên biển", note: "6 trò chơi vận động, đốt mỡ" },
        { time: "10:00", activity: "Ăn sáng muộn: Bún Hạnh", note: "" },
        { time: "11:00", activity: "Về khách sạn nghỉ ngơi", note: "" },
        { time: "14:00", activity: "Tham quan Lăng Tự Đức", note: "Trên đường có thể ghé làng hương check-in" },
        { time: "15:30", activity: "Ăn vặt: Bánh ép Huệ", note: "" },
        { time: "16:30", activity: "Picnic & ngắm hoàng hôn ở Công viên Phú Xuân", note: "Bãi cỏ ven sông Hương, có thể chèo SUP. Trang phục gợi ý: nâu / be / trắng" },
        { time: "19:00 – 21:00", activity: "Lang thang ăn tối: bánh lọc, bánh canh, chè Thanh", note: "" },
        { time: "22:00", activity: "Trò chơi tối", note: "Bí mật" },
      ]
    },
    {
      day: 3,
      title: "Tham quan cuối & lên đường về",
      date: "Chủ Nhật (19/7) — Thứ 2 (20/7)",
      blocks: [
        { time: "07:30", activity: "Ăn sáng: Bánh mì lò củi", note: "149 Nhật Lệ" },
        { time: "08:00", activity: "Tham quan Lăng Gia Long", note: "" },
        { time: "09:45", activity: "Cung An Định", note: "Tuỳ chọn" },
        { time: "11:00", activity: "Ăn trưa: bánh bèo – nậm – lọc, cuốn thịt heo", note: "" },
        { time: "13:00", activity: "Ghé Trường Quốc Học Huế", note: "Trang phục gợi ý: jeans / đen / be" },
        { time: "15:00", activity: "Cà phê hoặc dạo công viên ven sông Hương", note: "" },
        { time: "17:30", activity: "Lên xe khởi hành về Hà Nội", note: "" },
        { time: "Trên xe", activity: "Tổng kết chuyến đi", note: "Bí mật" },
        { time: "05:00 (20/7)", activity: "Có mặt tại Hà Nội", note: "Kết thúc hành trình" }
      ]
    }
  ],

  // ---------- ĐIỂM ĐẾN ----------
  // Ghi chú: Có thể thêm trường `image: "đường_dẫn_ảnh"` vào từng địa điểm (ví dụ: image: "figures/1.png")
  // để hiển thị ảnh thật của địa điểm đó trên giao diện sổ tay. Nếu không có, web sẽ hiện ô trống màu xanh.
  destinations: [
    {
      name: "Chợ Đông Ba",
      image: "figures/cho_dong_ba.jpg",
      lat: 16.4711, lng: 107.5850,
      desc: "Khu chợ trăm năm tuổi bên sông Hương — điểm dừng ăn sáng và sắm áo dài Huế đầu tiên trong hành trình."
    },
    {
      name: "Lăng Khải Định",
      image: "figures/lang_khai_dinh.jpg",
      lat: 16.3853, lng: 107.5772,
      desc: "Kiến trúc giao thoa Đông – Tây độc đáo nhất trong hệ thống lăng tẩm triều Nguyễn."
    },
    {
      name: "Đại Nội Huế",
      image: "figures/dai_noi_hue.jpg",
      lat: 16.4698, lng: 107.5796,
      desc: "Hoàng thành của triều Nguyễn — trung tâm quyền lực một thời, giờ là nơi tản bộ ngắm cung điện cổ."
    },
    {
      name: "Chùa Thiên Mụ",
      image: "figures/chua_thien_mu.jpg",
      lat: 16.4539, lng: 107.5452,
      desc: "Ngôi chùa cổ bên bờ sông Hương, biểu tượng tâm linh của xứ Huế."
    },
    {
      name: "Biển Tân An",
      image: "figures/bien_tan_an.jpg",
      lat: 16.5480, lng: 107.7000,
      desc: "Nơi cả nhóm dậy thật sớm để đón bình minh và chơi một loạt trò chơi vận động trên cát."
    },
    {
      name: "Lăng Tự Đức",
      image: "figures/lang_tu_duc.jpg",
      lat: 16.4272, lng: 107.5711,
      desc: "Không gian lăng tẩm như một khu vườn thơ, nơi vị vua thi sĩ chọn làm chốn an nghỉ."
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
      desc: "Lăng tẩm nằm khá xa trung tâm, không gian yên tĩnh và hoang sơ hơn hẳn các lăng khác."
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
      desc: "Ngôi trường trăm năm tuổi bên đường Lê Lợi, gắn với nhiều tên tuổi lịch sử Việt Nam."
    }
  ],

 // ---------- ĐỒ ĂN ----------
food: [
  { name: "Bún bò O Loan", address: "158B Phan Chu Trinh", desc: "Bún bò Huế đặc trưng, nước dùng đậm đà." },
  { name: "Vịt lộn um bầu", address: "9 Nguyễn Khuyến", desc: "Món ăn lạ miệng, cay nồng và béo ngậy." },
  { name: "Bánh canh O Bướm", address: "3 Trịnh Công Sơn", desc: "Bánh canh chuẩn vị Huế.", note: "Chỉ mở buổi tối" },
  { name: "Quán bánh Chi", address: "52 Lê Viết Lượng", desc: "Bèo, Nậm, Lọc ngon siêu rẻ.", note: "Đi sớm kẻo hết" },
  { name: "Cuộn thịt heo Donald Trung", address: "28 Hoàng Văn Thụ", desc: "Ngon lắm mọi người ơi, nhất định phải thử!" },
  { name: "Bánh mì O Tho", address: "14 Trần Cao Vân", desc: "Ổ bánh mì thịt nướng giòn rụm." },
  { name: "Bún mắm nêm", address: "Chợ Đông Ba", desc: "Chỉ 20k/bát, siêu rẻ siêu dính." },
  { name: "Bánh ép Huệ", address: "1 Kiệt 145 Điện Biên Phủ", desc: "Bánh ép nóng hổi, ăn kèm đu đủ chua ngọt." },
  { name: "Chè Hẻm", address: "1 Kiệt 29 Đường Hùng Vương", desc: "Nổi tiếng với chè bột lọc heo quay và các món chè truyền thống." }
],

  // ---------- TRÒ CHƠI ----------
games: [
  { name: "Ma Sói", occasion: "Tối ngày 1", teaser: "10 người, chia phe, đấu trí tìm sói giữa đêm." },
  { name: "Săn Trend Biển Tân An", occasion: "Sáng sớm ngày 2", teaser: "Chụp ảnh, quay trend TikTok — ai lầy nhất thắng." },
  { name: "Cờ Caro Tiếp Sức", occasion: "Sáng sớm ngày 2", teaser: "Chạy và tranh từng ô cờ trên cát." },
  { name: "Rồng Săn Đuôi", occasion: "Sáng sớm ngày 2", teaser: "Đối kháng đồng đội, giữ đuôi mình, săn đuôi đối thủ." },
  { name: "Vượt Ải Sóng Biển", occasion: "Sáng sớm ngày 2", teaser: "Phản xạ nhanh kẻo bị loại." },
  { name: "Truyền Nước", occasion: "Sáng sớm ngày 2", teaser: "Teamwork tưởng dễ mà gay cấn." },
  { name: "Đoàn Tàu Mù", occasion: "Sáng sớm ngày 2", teaser: "Bịt mắt, tin đồng đội để về đích." },
  { name: "Who Is The Imposter?", occasion: "Tối ngày 2", teaser: "Trò chơi âm nhạc — ai đang lạc nhịp?" },
  { name: "Phá Băng & Truth or Dare", occasion: "Tối ngày 2", teaser: "Kể chuyện thật, giả, và vài thử thách bất ngờ." },
  { name: "Ai Là Gián Điệp?", occasion: "Xuyên suốt chuyến đi", teaser: "Có người đang giấu một nhiệm vụ bí mật." }
]
};