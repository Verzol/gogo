# gogo

Nơi chứa web cho các chuyến đi của nhóm mình.

Mỗi chuyến đi là một thư mục riêng, tự chứa toàn bộ nội dung và code của chuyến đó:

| Thư mục | Chuyến đi | Trạng thái |
| --- | --- | --- |
| `hue-2026/` | Huế | Đã xong |
| `dalat-2026/` | Đà Lạt | Đang chuẩn bị |

Mỗi web gồm lịch trình, danh sách đồng bọn, quán ăn, chỗ sống ảo, cùng vài
thứ để nghịch trong chuyến đi (chat nhóm, hòm thư confession, nhật ký cảm
nhận, mấy game tấu hài có bảng xếp hạng).

## Cấu trúc một chuyến đi

Site tĩnh thuần HTML/CSS/JS (không framework, không build step), phần realtime
và tài khoản dùng [Supabase](https://supabase.com):

```
<trip>/
  index.html          # khung trang, các section rỗng được JS đổ nội dung vào
  data.js             # TRIP_DATA — toàn bộ nội dung chuyến đi, sửa ở đây
  script.js           # render + logic chat/game/confession
  style.css           # theme
  supabase-config.js  # url + anon key của project Supabase
  backend/*.sql       # migration chạy tay trên Supabase, theo thứ tự
  figures/            # ảnh người, địa điểm, đồ ăn, sticker
```

Chạy local: mở `index.html` trong trình duyệt, hoặc `npx serve .` trong thư
mục chuyến đi.

Chi tiết kiến trúc và quy ước sửa nội dung của từng chuyến nằm trong
`CLAUDE.md` của thư mục đó.
