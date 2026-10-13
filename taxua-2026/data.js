// Toàn bộ nội dung chuyến đi Tà Xùa nằm ở đây — sửa nội dung thì sửa file này,
// không cần đụng index.html hay style.css. Phải load trước main.js (xem index.html).
//
// MOCK-UP: nội dung dưới đây là bản nháp để dựng giao diện — ngày đi, lịch trình,
// vai trò thành viên đều chưa chốt.

const TRIP_DATA = {

  // ---------- THÔNG TIN CHUNG ----------
  tripName: "Tà Xùa",
  subtitle: "Dậy lúc 4 giờ sáng, leo lên sống lưng khủng long, chờ biển mây.",
  dateRange: "Tháng 11 · 2026 (chưa chốt)",
  intro: "Một cuốn nhật ký săn mây cho hội bạn thân — đủ lạnh, đủ no, đủ mây. Kéo xuống để nhận nhiệm vụ.",
  masthead: ["Số 03", "Nhật Ký Săn Mây", "Bắc Yên · Sơn La", "Độ cao 2.800m+"],

  // ---------- THÀNH VIÊN ----------
  // Avatar gắn theo vị trí: members[i] dùng figures/people/${i + 1}.png
  // Chưa có ảnh thì hiện chữ cái đầu.
  members: [
    { name: "mạnh", role: "Trưởng đoàn leo núi" },
    { name: "san", role: "Thợ săn mây chính" },
    { name: "thảo", role: "Stylist áo phao" },
    { name: "mi", role: "Báo thức 4 giờ sáng" },
    { name: "linh", role: "Phó nháy biển mây" },
    { name: "tamle", role: "Người ngủ nướng" },
    { name: "dan", role: "Google Maps sống" },
    { name: "quanlele", role: "Cây hài trên đèo" },
    { name: "minhtran", role: "Ban ẩm thực bản" },
    { name: "gtm", role: "Người bí ẩn" }
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
  // Mỗi ngày: { label, title, blocks: [{ time, activity, note? }] }
  days: [
    {
      label: "Ngày 1",
      title: "Lên núi",
      blocks: [
        { time: "05:00", activity: "Xuất phát từ Hà Nội", note: "ngủ bù trên xe" },
        { time: "11:30", activity: "Ăn trưa ở Bắc Yên" },
        { time: "13:30", activity: "Lên đèo Tà Xùa, nhận phòng homestay" },
        { time: "16:30", activity: "Ngắm hoàng hôn ở Mỏm Cá Heo" },
        { time: "19:00", activity: "Lợn bản nướng, gà đen, rượu táo mèo", note: "bên bếp lửa" }
      ]
    },
    {
      label: "Ngày 2",
      title: "Săn mây",
      blocks: [
        { time: "04:30", activity: "Dậy, mặc hết đồ ấm", note: "không ai được ngủ nướng" },
        { time: "05:30", activity: "Lên Sống Lưng Khủng Long chờ bình minh" },
        { time: "08:30", activity: "Cây Cô Đơn, đồi chè Shan tuyết" },
        { time: "11:00", activity: "Trả phòng, ăn trưa" },
        { time: "13:00", activity: "Xuống núi, về Hà Nội", note: "kết thúc tấu hài" }
      ]
    }
  ],

  // ---------- CHỖ SỐNG ẢO ----------
  // { name, desc, image } — image là sticker trong figures/decor/
  destinations: [
    { name: "Sống Lưng Khủng Long", desc: "Sống núi hẹp, hai bên là biển mây. Điểm săn mây chính.", image: "figures/decor/dino-ridge.png" },
    { name: "Mỏm Cá Heo", desc: "Mỏm đá nhô ra giữa mây. Đứng chụp nhớ bám chắc.", image: "figures/decor/dolphin-rock.png" },
    { name: "Cây Cô Đơn", desc: "Một cây thông đứng một mình trên đồi. Ảnh profile mới của cả nhóm.", image: "figures/decor/lone-tree.png" },
    { name: "Bình minh trên mây", desc: "Mặt trời lên sau dãy núi, mây tràn dưới chân.", image: "figures/decor/sunrise.png" }
  ],

  // ---------- ĂN GÌ ----------
  // { name, desc, image } — image là sticker trong figures/decor/
  food: [
    { name: "Lợn bản nướng", desc: "Nướng than, chấm chẩm chéo.", image: "figures/decor/pork-skewer.png" },
    { name: "Gà đen", desc: "Đặc sản của người Mông, luộc hoặc nướng.", image: "figures/decor/black-chicken.png" },
    { name: "Táo mèo & rượu táo mèo", desc: "Chua chát, mua về làm quà.", image: "figures/decor/tao-meo.png" },
    { name: "Chè Shan tuyết", desc: "Trà từ cây chè cổ thụ trên núi.", image: "figures/decor/shan-tea.png" }
  ]
};
