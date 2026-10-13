// Toàn bộ nội dung chuyến đi Tà Xùa nằm ở đây — sửa nội dung thì sửa file này,
// không cần đụng index.html hay style.css. Phải load trước main.js (xem index.html).
//
// Lịch trình được đối chiếu với tab "Lịch trình", A1:J33, ngày 13/10/2026.
// Danh sách thành viên đã cập nhật theo nhóm; vai trò vẫn là mô tả vui bản nháp.

const TRIP_DATA = {

  // ---------- THÔNG TIN CHUNG ----------
  tripName: "Tà Xùa",
  subtitle: "Ba ngày trên núi, ghé thác, săn mây và hẹn nhau bên tách cà phê.",
  dateRange: "22-25/10/2026 · 3 ngày 2 đêm",
  intro: "Một cuốn nhật ký săn mây cho hội bạn thân, đủ lạnh, đủ no, đủ mây.",
  masthead: ["Số 03", "Nhật Ký Săn Mây", "Bắc Yên · Sơn La", "Độ cao 2.800m+"],

  // ---------- THÀNH VIÊN ----------
  // Avatar gắn theo vị trí: members[i] dùng figures/people/${i + 1}.png
  // Chưa có ảnh thì hiện chữ cái đầu.
  members: [
    { name: "san", role: "Thợ săn mây chính" },
    { name: "thảo", role: "Stylist áo phao" },
    { name: "mi", role: "Báo thức 4 giờ sáng" },
    { name: "linh", role: "Phó nháy biển mây" },
    { name: "quanlele", role: "Cây hài trên đèo" },
    { name: "gtm", role: "Người bí ẩn" },
    { name: "trường", role: "Đồng bọn săn mây" }
  ],

  // ---------- ĐỒ CẦN MANG ----------
  packingList: {
    title: "Đóng gói trước khi lên núi",
    note: "Trên đỉnh sáng sớm có thể xuống dưới 10°C, gió mạnh. Mặc nhiều lớp.",
    items: [
      { text: "Áo phao, áo giữ nhiệt, khăn len", why: "săn mây lúc 5 giờ sáng là lạnh thật" },
      { text: "Giày trekking đế bám", why: "sống lưng khủng long dốc và trơn" },
      { text: "Đèn pin / đèn đội đầu", why: "đi lên lúc trời còn tối" },
      { text: "Áo mưa mỏng" },
      { text: "Sạc dự phòng đầy pin", why: "chụp mây là hết pin" },
      { text: "Thuốc say xe", why: "đường đèo lên Tà Xùa nhiều cua" },
      { text: "Tiền mặt", why: "homestay và quán bản ít quẹt thẻ" }
    ]
  },

  // ---------- LỊCH TRÌNH ----------
  // time: null khi nguồn chưa chốt giờ; note không được dùng như giờ xuất phát.
  // cost là dự kiến/người trong sheet, sourceRow giữ dấu vết để đối chiếu.
  itinerary: {
    sourceUrl: "https://docs.google.com/spreadsheets/d/1avQi4rDVT2_d2PAj-XphaUORJtsvHB64wNt44CQcOdA/edit#gid=20009742",
    dateLabel: "22-25/10/2026",
    duration: "3 ngày 2 đêm",
    stay: "Mùa Trứ Homestay",
    stayQuery: "HomeStay Mùa Trứ Tà Xùa",
    outbound: { label: "Xe đêm 22/10", detail: "Đón 21:30, đi 22:00" },
    inbound: { label: "Xe về 25/10", detail: "Xuất phát 12:30" },
    costNote: "Giá dự kiến theo sheet, chưa gồm mọi khoản phát sinh. Dự toán trong sheet tính cho 7 người."
  },
  days: [
    {
      label: "Đêm đi", date: "22/10", dateISO: "2026-10-22", weekday: "Thứ Năm",
      title: "Hẹn nhau, lên xe",
      summary: "Tập trung ở Hà Nội, ngủ một giấc là tới Tà Xùa.",
      image: "figures/decor/cloud_1_day.png",
      blocks: [
        { sourceRow: 7, period: "Đêm", time: "21:30", activity: "Tập trung, lên xe đi Tà Xùa", location: "Tập đoàn Viettel", mapQuery: "Tập đoàn Viettel Hà Nội", note: "Xe đón lúc 21:30 tại Tập đoàn Viettel và xuất phát lúc 22:00. Cần xác nhận vị trí đón cụ thể với nhà xe." }
      ]
    },
    {
      label: "Ngày 1", date: "23/10", dateISO: "2026-10-23", weekday: "Thứ Sáu",
      title: "Thác, cà phê & hoàng hôn",
      summary: "Gửi đồ ở home, ghé thác rồi dành buổi chiều cho Ameii Hill.",
      image: "figures/decor/shan_tea_day.png",
      blocks: [
        { sourceRow: 9, period: "Sáng", time: "03:00", activity: "Tới Tà Xùa, gửi đồ và nhận xe", location: "Mùa Trứ Homestay", mapQuery: "HomeStay Mùa Trứ Tà Xùa", note: "Vệ sinh cá nhân, gửi đồ tại homestay và nhận xe máy. Chưa phải giờ nhận phòng." },
        { sourceRow: 10, period: "Sáng", time: "05:00-06:00", activity: "Ăn sáng tại Thào Coffee", location: "Thào Coffee Tà Xùa", cost: 50000 },
        { sourceRow: 11, period: "Sáng", time: "06:00-12:00", activity: "Khám phá Thác Không Tên", location: "Thác Chua Tỳ", cost: 0, note: "Sheet ghi tên địa điểm là Thác Chua Tỳ. Đây là điểm xa; cần cân nhắc quỹ thời gian để chiều vẫn kịp cà phê và hoàng hôn." },
        { sourceRow: 12, period: "Trưa", time: "12:00", activity: "Ăn trưa tại Vị Nhà", location: "Vị Nhà Tiệm Cơm Tà Xùa", cost: 70000 },
        { sourceRow: 13, period: "Chiều", time: "14:00", activity: "Nhận phòng và nghỉ ngơi", location: "Mùa Trứ Homestay", mapQuery: "HomeStay Mùa Trứ Tà Xùa" },
        { sourceRow: 14, period: "Chiều", time: "15:30", activity: "Cà phê, ngắm hoàng hôn ở Ameii Hill", location: "Ameii Hill", mapQuery: "Ameii Hill Tà Xùa", cost: 30000, note: "Có thể vào quán dù không mua nước. Đường bê tông hẹp và dốc; xe ôm khoảng 40.000 ₫/người khứ hồi theo sheet." },
        { sourceRow: 15, period: "Tối", time: "19:15", activity: "Ăn lẩu tại A Phủ", location: "Nhà Hàng A Phủ", mapQuery: "Nhà Hàng A Phủ Tà Xùa", cost: 250000, note: "Ăn tối xong về home nghỉ ngơi." },
        { sourceRow: 16, period: "Tối", time: null, activity: "Ngắm sao, chụp Milky Way", location: "Quanh homestay hoặc Khe Cải", mapQuery: "Khe Cải Tà Xùa", note: "Sheet gợi ý chụp 18:30-20:30; Khe Cải cách home khoảng 800 m. Khung này trùng bữa tối 19:15, cần sắp xếp lại với cả nhóm.", warning: "Cần thống nhất giờ với bữa tối." }
      ]
    },
    {
      label: "Ngày 2", date: "24/10", dateISO: "2026-10-24", weekday: "Thứ Bảy",
      title: "Một ngày trên biển mây",
      summary: "Sống Lưng Khủng Long buổi sáng, thảo nguyên và các điểm check-in buổi chiều.",
      image: "figures/decor/dino_ridge_day.png",
      blocks: [
        { sourceRow: 18, period: "Sáng", time: "04:30", activity: "Dậy đón bình minh tại phòng", optional: true, note: "Có thể săn bình minh và săn mây ngay tại phòng của mình." },
        { sourceRow: 19, period: "Sáng", time: "05:15", activity: "Ăn sáng tại home", location: "Mùa Trứ Homestay", mapQuery: "HomeStay Mùa Trứ Tà Xùa", cost: 20000 },
        { sourceRow: 20, period: "Sáng", time: null, activity: "Săn mây ở Sống Lưng Khủng Long", location: "Sống Lưng Khủng Long", mapQuery: "Sống Lưng Khủng Long điểm Săn Mây Tà Xùa", cost: 30000, note: "Sheet gợi ý buổi sáng 06:00-08:00 để săn mây, ánh sáng dịu; các khung chiều được ghi là 14:00-15:00 hoặc 15:00-17:00. Cách trung tâm khoảng 10 km, 500 m cuối khó đi. Xe ôm khoảng 100.000 ₫/người khứ hồi." },
        { sourceRow: 21, period: "Sáng", time: null, activity: "Ghé Hồ Mắt Ngọc", location: "Hồ Mắt Ngọc", mapQuery: "Hồ Mắt Ngọc Tà Xùa", cost: 0, optional: true, note: "Hồ nhân tạo giữa núi, cách home khoảng 4 km. Đây là điểm được nhóm gợi ý thêm trong sheet." },
        { sourceRow: 22, period: "Trưa", time: "11:00", activity: "Ăn trưa tại Bếp Củi", location: "Bếp Củi - cơm nhà, lẩu và nướng", mapQuery: "Bếp Củi Tà Xùa", cost: 70000 },
        { sourceRow: 23, period: "Trưa", time: "12:00", activity: "Về home nghỉ ngơi, chuyển phòng", location: "Mùa Trứ Homestay", mapQuery: "HomeStay Mùa Trứ Tà Xùa", note: "Nhớ chuyển đồ sang phòng mới." },
        { sourceRow: 24, period: "Chiều", time: "13:30-17:30", activity: "Dạo Thảo nguyên Tà Xùa", location: "Thảo nguyên Tà Xùa", cost: 35000 },
        { sourceRow: 25, period: "Chiều", time: null, activity: "Cây Cô Đơn, Lán Cô Đơn & Mỏm Cá Heo", location: "Cây cô đơn Tà Xùa", cost: 20000, note: "Các điểm check-in trong buổi chiều. Sheet chưa tách giờ cho từng điểm." },
        { sourceRow: 26, period: "Chiều", time: "17:30", activity: "Ăn mẹt đồ Tây Bắc tại Đồi Mây", location: "Đồi Mây Tà Xùa", cost: 150000 },
        { sourceRow: 27, period: "Tối", time: "19:30", activity: "Nghe live music ở Cà phê Tháng 10", location: "Cà phê Tháng 10 - Tà Xùa", cost: 90000, note: "Sheet ghi live music từ 19:30. Ghi chú pháo hoa 21:00 nhắc đến trung tâm Mộc Châu; cần xác minh, chưa tính là một điểm đến của lịch Tà Xùa." }
      ]
    },
    {
      label: "Ngày 3", date: "25/10", dateISO: "2026-10-25", weekday: "Chủ Nhật",
      title: "Thêm một sáng, rồi về",
      summary: "Ghé Khe Cải và Làng Văn Hóa, ăn trưa rồi lên xe về Hà Nội.",
      image: "figures/decor/mountain_sky_day.png",
      blocks: [
        { sourceRow: 29, period: "Sáng", time: "04:30", activity: "Săn mây tại Khe Cải", location: "Khe Cải", mapQuery: "Khe Cải Tà Xùa", note: "Điểm săn mây được ghi trong sheet; cần kiểm tra thêm vị trí ngắm bình minh.", warning: "Cần kiểm tra điểm ngắm bình minh." },
        { sourceRow: 30, period: "Sáng", time: null, activity: "Ăn sáng", cost: 20000 },
        { sourceRow: 31, period: "Sáng", time: null, activity: "Làng Văn Hóa, Núi Đôi & Đồi Công viên Mây", location: "Làng Văn Hóa Cafe Tà Xùa", cost: 60000, note: "Sheet mô tả một cụm cà phê và điểm ngắm cảnh; Núi Đôi cách quán khoảng 400 m đi bộ. Có ghi chú ngắm hoàng hôn, nhưng lịch ghé là buổi sáng, chưa chốt giờ." },
        { sourceRow: 32, period: "Trưa", time: "11:15", activity: "Ăn cơm lam, thịt nướng tại trung tâm", location: "Trung tâm xã Tà Xùa", cost: 100000, note: "Check-in và mua kem ở trung tâm Tà Xùa, đối diện Hmong Cafe." },
        { sourceRow: 33, period: "Trưa", time: "12:30", activity: "Lên xe về Hà Nội", note: "Xe xuất phát từ Tà Xùa lúc 12:30. Sheet chưa có giờ tới Hà Nội." }
      ]
    }
  ],

  // ---------- CHỖ SỐNG ẢO ----------
  // { name, desc, image } — image là sticker trong figures/decor/
  destinations: [
    { name: "Sống Lưng Khủng Long", desc: "Sống núi hẹp, hai bên là biển mây. Điểm săn mây chính.", image: "figures/decor/dino_ridge_day.png" },
    { name: "Mỏm Cá Heo", desc: "Mỏm đá nhô ra giữa mây. Đứng chụp nhớ bám chắc.", image: "figures/decor/dolphin_rock_day.png" },
    { name: "Cây Cô Đơn", desc: "Một cây thông đứng một mình trên đồi. Ảnh profile mới của cả nhóm.", image: "figures/decor/lone_tree_day.png" },
    { name: "Bình minh trên mây", desc: "Mặt trời lên sau dãy núi, mây tràn dưới chân.", image: "figures/decor/mountain_sky_day.png" }
  ],

  // ---------- ĂN GÌ ----------
  // { name, desc, image } — image là sticker trong figures/decor/
  food: [
    { name: "Lợn bản nướng", desc: "Nướng than, chấm chẩm chéo.", image: "figures/decor/pork_skewer_day.png" },
    { name: "Gà đen", desc: "Đặc sản của người Mông, luộc hoặc nướng.", image: "figures/decor/black_chicken_day.png" },
    { name: "Táo mèo & rượu táo mèo", desc: "Chua chát, mua về làm quà.", image: "figures/decor/tao_meo_day.png" },
    { name: "Chè Shan tuyết", desc: "Trà từ cây chè cổ thụ trên núi.", image: "figures/decor/shan_tea_day.png" }
  ]
};
