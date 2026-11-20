# BÁO CÁO KIỂM TRA MÃ NGUỒN & HƯỚNG DẪN TRIỂN KHAI ONLINE
# DỰ ÁN: BẮT THÚ VƯƠNG (BATTHU-MAIN)

---

## 🛡️ NGUYÊN TẮC LÀM VIỆC & VAI TRÒ (ROLE & OPERATIONAL GUIDELINES)

> [!IMPORTANT]
> **CÁC CHÚ Ý VÀ NGUYÊN TẮC BẮT BUỘC KHI THỰC HIỆN DỰ ÁN:**
> 1. **Nói gì làm đó, đọc kĩ yêu cầu trước khi triển khai.**
> 2. **Không làm việc ngoài phạm vi, không tự ý triển khai các vấn đề khác.**
> 3. **Tất cả các yêu cầu kiểm tra. Làm cẩn thận, rà soát kĩ lưỡng. Kiểm tra sâu, và cho thông tin chi tiết đầy đủ.**
> 4. **Đề xuất phương án chỉnh sửa tối ưu.**
> 5. **Kiểm tra lại toàn bộ yêu cầu của người dùng, xem đã làm đủ chưa, đã kiểm tra kĩ chưa trước khi đưa ra câu trả lời.**
> 6. **Không trả lời qua loa, câu trả lời phải đầy đủ thông tin chi tiết, bằng chứng.**

### 🎯 QUY ĐỊNH PHÂN BIỆT CHẾ ĐỘ LỆNH CỦA NGƯỜI DÙNG:

- **Khi người dùng nói "Thảo luận" (hoặc trao đổi ý tưởng, xin ý kiến, hỏi phương án)**:
  - **TUYỆT ĐỐI KHÔNG** tự ý chỉnh sửa file, không tạo file code mới, không chạy lệnh build, không can thiệp vào logic trò chơi.
  - Chỉ đơn thuần trò chuyện, giải thích, phân tích tính khả thi, tư vấn cơ chế và cùng người dùng tìm phương hướng update tối ưu.
- **Khi người dùng nói "Triển khai" (hoặc tiến hành, bắt đầu làm, chốt phương án làm đi)**:
  - Lúc này mới chính thức bắt tay vào viết code, sửa đổi file và đóng gói/build bundle.
  - Làm kĩ từng bước, rà soát các file ẩn có thể gây lỗi. Có thể chọn phương án "Xóa" các file gây lỗi nếu các file đó không cần thiết cho hoạt động của source.

---

## 📌 PHẦN 1: TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

- **Tên dự án**: Bắt Thú Vương (Batthu) - Phiên bản v1.2
- **Thể loại**: Game nhập vai luyện thú trực tuyến đa người chơi (Pokemon MMO/RPG phong cách Việt Nam) kết hợp:
  - Định vị GPS bản đồ thế giới thực (Leaflet.js + ảnh vệ tinh ArcGIS) tìm quái và bắt thú.
  - Hệ thống chiến đấu theo lượt thời gian thực (ATB - Active Time Battle) trên HTML5 Canvas.
  - Sảnh Boss Thế Giới 3 Miền (World Boss MMO Lobby) đồng bộ người chơi cùng thời gian thực.
  - Đấu Trường PvP 1vs1 Danh Vọng (BXH tuần tính điểm Elo) & Khiêu Chiến Sinh Tử (thua mất vĩnh viễn thú).
  - Hệ thống nuôi dưỡng: Nông trại (Farm), Bệnh viện (Hospital), Ấp trứng (Egg Hatching), Lai giống (Breeding), Luyện công tăng chỉ số (Training).
  - Hệ thống cộng đồng: Kênh Chat thế giới, Nhắn tin riêng (Inbox/PM), Kết bạn & theo dõi trạng thái Online/Offline.
  - Bảng điều khiển Quản trị viên (Admin/GM Panel) cấp thú, tặng tài nguyên, triệu hồi Boss.
- **Mô hình kiến trúc**:
  - **Client (Frontend)**: Single Page Application (SPA), HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (CDN), Leaflet.js, Canvas 2D Engine, Web Audio API, PWA Service Worker.
  - **Edge Backend**: Cloudflare Workers hỗ trợ Static Assets (`_worker.js`), định tuyến toàn bộ `/api/*` không phụ thuộc máy chủ vật lý.
  - **Database**: Cloudflare D1 (Serverless Distributed SQLite Edge Database).
  - **Lưu trữ dữ liệu**: Cơ chế lai (Hybrid Storage) – Chơi mượt mà lưu `localStorage` tại máy người chơi, đồng bộ tức thời lên Cloudflare D1 khi bấm lưu hoặc đăng nhập/chuyển thiết bị.

---

## 🔍 PHẦN 2: BÁO CÁO KIỂM TRA MÃ NGUỒN CHI TIẾT (SOURCE AUDIT)

### 1. Phân tích cấu trúc thư mục & tập tin

```
Batthu-main/
│
├── _worker.js             # [BACKEND CHÍNH] Edge Worker xử lý 11 nhóm API (Heartbeat, P2P Market, Boss DPS...)
├── wrangler.jsonc         # File cấu hình deploy Cloudflare Worker, Static Assets & D1 Database
├── .assetsignore          # Danh sách file loại trừ khi tải static assets lên Cloudflare
├── .gitignore             # Danh sách file loại trừ khi đẩy lên Git
│
├── index.html             # [FRONTEND CHÍNH] Giao diện game, HUD, Nông trại, Map GPS, Chat, Heartbeat Loop
├── monster.js             # [DỮ LIỆU GAME] Database linh thú, quái vật, hệ ngũ hành, phẩm chất, trang bị
├── arena.js               # [COMBAT ENGINE] Hệ thống chiến đấu ATB, Tháp Vô Tận, Boss 3 Miền MMO & Top DPS
├── pvp.js                 # [PVP MODULE] Đấu Trường Danh Vọng 1vs1 & Khiêu Chiến Sinh Tử
├── auction.js             # [CHỢ P2P] Chợ Giao Dịch & Đấu Giá Người Chơi (Bán thú F1, Trứng, Đá Ngũ Hành)
├── guild.js               # [BANG HỘI] Lập hội, Chat Bang, Cống hiến buff chỉ số, Boss Bang
├── dex.js                 # [BÁCH KHOA] Bách Khoa Toàn Thư Linh Thú & Kích hoạt Buff sưu tập
├── admin.js               # [ADMIN CLIENT] Bảng điều khiển GM, cấp thú/trứng/tiền, gọi Boss thế giới
├── carnival.js            # [TÂN THỦ 7 NGÀY] Chuỗi Sự Kiện Tân Thủ 7 Ngày (Vàng, Thú Hiếm, Đồ Tím, Trứng F1, Thần Thú)
├── gacha.js               # [GACHA WHEEL] Vòng Quay May Mắn (1 Free/ngày, Vé rơi từ Map/Tháp, Hào quang, Trứng Thần)
├── ar_share.js            # [AR FLEX SOCIAL] Chụp ảnh AR Camera thật khoe thú cưng lên Facebook/Zalo/TikTok/Story
├── pwa_tma.js             # [ĐA NỀN TẢNG] PWA 1 Chạm màn hình chính, Haptic rung, Bộ thích ứng Telegram & Zalo Mini App
├── manifest.json          # Web App Manifest tiêu chuẩn cho PWA di động
├── sw.js                  # Service Worker hỗ trợ cài đặt ứng dụng PWA & bộ nhớ đệm (v3.3)
│
├── assets/                # Hình ảnh sprites thú nuôi, hiệu ứng aura, nhân vật Nam/Nữ (idle/walk)
├── assets_boss/           # Hình ảnh quái Boss: Cerberus, Chupacabra, Dingonek, Golem, Hydra, Ronglua...
├── assets_gear/           # Hình ảnh trang bị linh thú (gears.webp)
├── *.webp                 # Hình nền & quái thú mới: battle, boss-lobby, breed, egg, farm, caosamac, voi...
├── nhac_cho.mp3           # Nhạc nền sảnh chờ / bản đồ game
├── nhac_chien_dau.mp3     # Nhạc nền trận đấu chiến đấu
└── functions/api/         # Thư mục Pages Functions cũ (dự phòng)
```

---

### 2. Các nhóm API trong `_worker.js`

Backend được hợp nhất hoàn toàn vào một tập tin `_worker.js` chạy trên nền tảng Serverless Edge của Cloudflare:

| STT | Endpoint | Phương thức | Chức năng chi tiết |
|:---:|---|:---:|---|
| 1 | `/api/auth` | POST | Đăng ký tài khoản mới (mã PIN 8 số), đăng nhập cấp UUID `session_token` chống đa đăng nhập, xác thực phiên (`verify_session`), đồng bộ dữ liệu game (`sync`). |
| 2 | `/api/chat` | GET, POST | Lấy 25 tin nhắn Chat Thế Giới mới nhất, gửi tin nhắn chat kèm thông tin thú dẫn đầu, tự động giữ tối đa 100 tin gần nhất để tối ưu dung lượng DB. |
| 3 | `/api/presence` | POST | Đồng bộ vị trí thực tế của người chơi trên bản đồ GPS; Đồng bộ tọa độ di chuyển nhân vật trong Sảnh Boss Thế Giới 3 Miền. |
| 4 | `/api/heartbeat` | POST | **[TỐI ƯU HÓA 90% QUOTA]** Heartbeat tổng hợp gộp chung: GPS Map + PvP Duel + Tin nhắn mật PM + Tiền bán Chợ P2P + Quà Admin + Boss Thế Giới trong 1 call duy nhất mỗi 12s. Tự động tạm ngưng khi ẩn tab (Page Visibility API). |
| 5 | `/api/pm` | GET, POST | Hộp thư đến cá nhân (`mode=inbox`), lịch sử trò chuyện 1vs1 giữa 2 người chơi, gửi tin nhắn mật riêng tư (tự dọn dẹp sau 24h). |
| 6 | `/api/friends` | GET, POST | Quản lý danh sách bạn bè, gửi lời mời kết bạn, chấp nhận/từ chối/hủy bạn, kiểm tra trạng thái Online/Offline của bạn bè theo thời gian thực. |
| 7 | `/api/admin` | POST | Bảng điều khiển Admin: Kiểm tra whitelist tài khoản + mã PIN admin; Cấp linh thú tùy chọn, cấp trứng hiếm, quà tặng `admin_gifts`, cộng Xu/Kim cương. |
| 8 | `/api/pvp` | GET, POST | Lấy BXH Đấu Trường Danh Vọng theo tuần (`YYYY-Www`), ghép đối thủ 1vs1 từ data người chơi thật trên server, cập nhật điểm Elo, gửi lời mời và xác nhận Khiêu Chiến Sinh Tử. |
| 9 | `/api/world-boss` | GET, POST | **[NÂNG CẤP BOSS 3 MIỀN]** Quản lý máu Boss, GM Triệu hồi/Thu hồi, ghi nhận sát thương thời gian thực (`action: damage`), Bảng xếp hạng Top DPS, phát thưởng Rương Huyền Thoại & Đòn Kết Liễu (`action: claim_reward`). |
| 10 | `/api/guild` | GET, POST | Tạo Bang, Duyệt thành viên, Kênh Chat Bang Hội, Cống hiến nâng cấp Bang & Triệu hồi Boss Bang Hội. |
| 11 | `/api/market-p2p` | GET, POST | **[CHỢ GIAO DỊCH P2P]** Rao bán linh thú F1/Hiếm, Trứng F1, Đá Ngũ Hành. Tự động chuyển 90% tiền bán (trừ 10% phí sàn) vào hòm doanh thu người bán. |
| 12 | `*` (fallback) | GET | Tự động trả về Static Assets (`index.html`, hình ảnh `.webp`, âm thanh `.mp3`, file script `.js`) thông qua `env.ASSETS.fetch(request)`. |

---

### 3. Cấu trúc bảng Cơ sở dữ liệu Cloudflare D1 (SQLite)

Hệ thống quản lý 16 bảng dữ liệu:

1. **`players`**: Quản lý tài khoản, mã PIN, giới tính, token phiên, toàn bộ tiến trình game lưu dưới dạng JSON (`game_data`), thời gian cập nhật.
2. **`world_chat`**: Lưu trữ tin nhắn chat thế giới (người gửi, giới tính, thông tin pet đính kèm, nội dung, cờ hệ thống, thời gian).
3. **`player_presence`**: Vị trí GPS (kinh độ, vĩ độ, hướng quay mặt, pet dẫn đầu) và trạng thái trong sảnh Boss 3 Miền.
4. **`private_messages`**: Tin nhắn riêng tư giữa hai người chơi.
5. **`friendships`**: Mối quan hệ bạn bè (người yêu cầu, mục tiêu, trạng thái `pending`/`accepted`).
6. **`pvp_leaderboard`**: Bảng xếp hạng PvP theo từng tuần (username, week_key, điểm rank, số trận thắng, số trận thua, pet chiến).
7. **`pvp_duels`**: Các trận khiêu chiến sinh tử (người thách đấu, đối thủ, thú xuất chiến, seed ngẫu nhiên trận đấu, người chiến thắng).
8. **`world_boss_state`**: Trạng thái Boss 3 miền (khu vực, kích hoạt, tên boss, máu hiện tại, máu tối đa, spawn_id, killer, người mở).
9. **`world_boss_damage`**: Bảng xếp hạng sát thương từng hiệp Boss (spawn_id, region_key, username, damage, claimed, thời gian).
10. **`market_listings`**: Danh sách vật phẩm đang rao bán trên Chợ P2P (seller, item_type, item_name, item_json, price, currency, status, buyer).
11. **`market_payouts`**: Doanh thu bán hàng chờ người bán nhận (username, coins, diamonds, note, claimed, thời gian).
12. **`guilds`**: Thông tin Bang Hội (tên, trưởng bang, cấp độ, kinh nghiệm, thông báo, tôn chỉ).
13. **`guild_members`**: Thành viên bang hội và chức vụ.
14. **`guild_chat`**: Kênh trò chuyện nội bộ bang hội.
15. **`guild_boss`**: Boss bang hội và tiến trình săn boss nội bộ.
16. **`admin_gifts`**: Hòm thư quà tặng GM cấp cho người chơi từ xa.

---

### 4. Các lỗi & vấn đề quan trọng phát hiện khi check source (ĐÃ XỬ LÝ)

> [!CRITICAL]
> **1. Lỗi cú pháp nghiêm trọng trong `_worker.js` (ĐÃ ĐƯỢC SỬA CHỮA)**
> - **Vấn đề**: Tại dòng 798 của `_worker.js`, khối xử lý `if (action === "duel_finish")` bị thiếu dấu đóng ngoặc nhọn `}`. Điều này khiến toàn bộ file `_worker.js` bị lỗi cú pháp `Unclosed { at line 18:16`.
> - **Hệ quả**: Nếu đem mã nguồn này deploy lên Cloudflare, lệnh build sẽ báo lỗi cú pháp biên dịch JavaScript ngay lập tức hoặc Worker sẽ crash với mã lỗi 500 khi khởi chạy.
> - **Xử lý**: Đã bổ sung dấu đóng ngoặc `}` và căn chỉnh lại luồng trả lời `return jsonResponse({ ok: false, error: "Lệnh PvP không hợp lệ!" }, 400);`. Hiện file đã kiểm tra cú pháp đạt chuẩn 100%.

> [!WARNING]
> **2. Lỗi thiếu câu lệnh tự khởi tạo bảng `world_chat` và `private_messages` (ĐÃ ĐƯỢC BỔ SUNG)**
> - **Vấn đề**: Trong bản gốc, endpoint `/api/chat` và `/api/pm` truy vấn trực tiếp bảng `world_chat` và `private_messages` mà không có lệnh `CREATE TABLE IF NOT EXISTS`.
> - **Hệ quả**: Khi người dùng triển khai trên một Database D1 mới hoàn toàn, ngay khi mở game, hệ thống sẽ báo lỗi `no such table: world_chat` hoặc `no such table: private_messages`, làm tê liệt tính năng Chat và Hộp thư.
> - **Xử lý**: Đã tự động tích hợp `CREATE TABLE IF NOT EXISTS world_chat` và `CREATE TABLE IF NOT EXISTS private_messages` vào `_worker.js`. Bây giờ database mới tạo sẽ tự động khởi tạo bảng ngay trong lần gọi đầu tiên mà không cần chạy migration thủ công.

> [!IMPORTANT]
> **3. ID Database trong `wrangler.jsonc` là của dự án cũ**
> - Trong file `wrangler.jsonc`, `database_id: "087a6762-f2e7-4eaf-b4f9-76257abda427"` là ID cơ sở dữ liệu trên tài khoản Cloudflare của tác giả ban đầu.
> - Khi bạn triển khai trên tài khoản Cloudflare của bạn, bạn **bắt buộc phải tạo Database D1 mới** và thay thế chuỗi ID này, nếu không lệnh deploy sẽ báo lỗi không tìm thấy database.

> [!NOTE]
> **4. Danh sách tài khoản Admin (GM) đang gán cố định**
> - Trong `_worker.js` (dòng 551, 860) và `admin.js` (dòng 8) đang cấu hình cố định 2 tài khoản Admin:
>   `['GiaPhat28594', 'ThuyHan171097']`
> - Bạn cần đổi 2 tên này thành tên đăng nhập (ID Game) của bạn để kích hoạt quyền GM.

> [!TIP]
> **5. Quy định bảo mật HTTPS cho tính năng GPS và AR**
> - Bản đồ quét người chơi và bắt thú sử dụng API trình duyệt `navigator.geolocation` và `navigator.mediaDevices` (Camera).
> - Các trình duyệt hiện đại (Chrome, Safari, Edge) chặn hoàn toàn quyền truy cập GPS/Camera nếu website chạy HTTP thường. Khi triển khai online qua Cloudflare, website mặc định được cấp SSL HTTPS miễn phí, đáp ứng hoàn hảo tính năng này.

---

## 🚀 PHẦN 3: HƯỚNG DẪN TRIỂN KHAI ONLINE (DEPLOYMENT GUIDE)

Có 2 phương pháp triển khai online. Bạn có thể chọn phương pháp phù hợp nhất:

---

### PHƯƠNG PHÁP 1: TRIỂN KHAI BẰNG CLOUDFLARE WRANGLER CLI (KHUYẾN NGHỊ - NHANH & CHUẨN NHẤT)

Cloudflare Workers + D1 cho phép lưu trữ hoàn toàn **MIỄN PHÍ** (Free Tier cho 100,000 requests/ngày và 5 triệu lượt đọc D1/tháng).

#### Bước 1: Cài đặt Node.js
1. Tải và cài đặt Node.js LTS (phiên bản 18, 20 hoặc 22) từ trang chủ: [https://nodejs.org](https://nodejs.org).
2. Kiểm tra cài đặt thành công tại PowerShell:
   ```powershell
   node -v
   npm -v
   ```

#### Bước 2: Đăng nhập tài khoản Cloudflare trên máy tính
1. Đăng ký tài khoản miễn phí tại: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Mở terminal tại thư mục dự án `C:\Users\PC\Desktop\Batthu-main` và chạy lệnh đăng nhập:
   ```powershell
   npx wrangler login
   ```
3. Trình duyệt web sẽ tự động mở lên, bạn chỉ cần bấm **Allow / Authorize** để cấp quyền cho Wrangler.

#### Bước 3: Tạo cơ sở dữ liệu Cloudflare D1 mới
Chạy lệnh tạo Database D1:
```powershell
npx wrangler d1 create bat-thu-vuong-db
```
Sau khi chạy, terminal sẽ hiển thị thông tin dạng:
```jsonc
[[d1_databases]]
binding = "DB"
database_name = "bat-thu-vuong-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
👉 Hãy copy chuỗi `database_id` vừa nhận được!

#### Bước 4: Cập nhật `wrangler.jsonc`
Mở file `wrangler.jsonc` trong thư mục dự án, dán `database_id` mới của bạn vào dòng 14:
```jsonc
{
  "name": "batthuvuong",
  "main": "_worker.js",
  "compatibility_date": "2026-11-16",
  "assets": {
    "directory": ".",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bat-thu-vuong-db",
      "database_id": "DÁN_DATABASE_ID_CỦA_BẠN_VÀO_ĐÂY"
    }
  ]
}
```

#### Bước 5: Cấu hình tài khoản Admin của bạn
1. Mở file `_worker.js`:
   - Tìm dòng 551: đổi `["GiaPhat28594", "ThuyHan171097"]` thành `["TenTaiKhoanCuaBan"]`.
   - Tìm dòng 860: đổi `["GiaPhat28594", "ThuyHan171097"]` thành `["TenTaiKhoanCuaBan"]`.
2. Mở file `admin.js`:
   - Tìm dòng 8: đổi `['GiaPhat28594', 'ThuyHan171097']` thành `['TenTaiKhoanCuaBan']`.

#### Bước 6: Deploy lên Cloudflare
Chạy lệnh xuất bản trực tiếp lên Internet:
```powershell
npx wrangler deploy
```

Chỉ mất khoảng 15-30 giây, Wrangler sẽ trả về đường dẫn website online trực tiếp của bạn:
👉 `https://batthuvuong.<your-subdomain>.workers.dev`

---

### PHƯƠNG PHÁP 2: TRIỂN KHAI QUA GITHUB VÀ CLOUDFLARE DASHBOARD (DỄ DÙNG GIAO DIỆN WEB)

Nếu muốn quản lý mã nguồn trên GitHub và tự động cập nhật web mỗi khi đẩy code:

#### Bước 1: Tạo Database D1 trên Cloudflare Dashboard
1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Vào menu **Storage & Databases** -> Chọn **D1 SQL Database**.
3. Bấm **Create database** -> Đặt tên: `bat-thu-vuong-db` -> Nhấn **Create**.
4. Sao chép chuỗi **Database ID**.

#### Bước 2: Đẩy mã nguồn lên GitHub
1. Tạo một repository mới trên [GitHub](https://github.com) (chế độ Private hoặc Public).
2. Cập nhật `database_id` vào file `wrangler.jsonc` và sửa tên Admin như ở Phương pháp 1.
3. Đẩy toàn bộ thư mục `Batthu-main` lên repository của bạn.

#### Bước 3: Liên kết với Cloudflare Workers & Pages
1. Trong Cloudflare Dashboard, vào mục **Workers & Pages** -> Chọn **Create application**.
2. Chọn tab **Pages** -> Bấm **Connect to Git**.
3. Chọn tài khoản GitHub và chọn repository `Batthu-main` vừa tạo.
4. Cấu hình triển khai:
   - **Framework preset**: `None`
   - **Build command**: Để trống
   - **Build output directory**: `.` (dấu chấm)
5. Bấm **Save and Deploy**.

#### Bước 4: Gắn Database D1 vào Cloudflare Pages
1. Sau khi build hoàn tất, vào dự án Pages của bạn -> Chọn tab **Settings** -> Mục **Functions**.
2. Cuộn xuống phần **D1 Database Bindings** -> Bấm **Add binding**.
3. Điền thông tin:
   - **Variable name**: `DB` (bắt buộc viết hoa đúng chữ `DB`)
   - **D1 database**: Chọn `bat-thu-vuong-db` đã tạo ở Bước 1.
4. Nhấn **Save**.
5. Vào tab **Deployments**, chọn bản deploy mới nhất -> Bấm dấu 3 chấm -> Chọn **Retry deployment** để áp dụng kết nối DB.

---

## 🌐 PHẦN 4: CẤU HÌNH TÊN MIỀN RIÊNG (CUSTOM DOMAIN)

Để người chơi truy cập qua tên miền riêng của bạn (ví dụ: `batthu.vn` hoặc `game.tenmienban.com`):

1. Trong Cloudflare Dashboard, chọn domain bạn đang sở hữu (được quản lý bởi Cloudflare).
2. Vào mục **Workers & Pages** -> Chọn ứng dụng `batthuvuong`.
3. Chọn tab **Settings** -> Chọn **Domains & Routes** -> Bấm **Add Custom Domain**.
4. Nhập tên miền hoặc subdomain mong muốn (ví dụ: `game.tenmienban.com`).
5. Bấm **Add Domain**. Cloudflare sẽ tự động tạo bản ghi DNS và cấp chứng chỉ SSL HTTPS hoàn toàn tự động trong 1-2 phút.

---

## 🛠️ PHẦN 5: BẢO TRÌ & QUẢN LÝ DỮ LIỆU GAME (MAINTENANCE CHEAT SHEET)

### 1. Sao lưu (Backup) cơ sở dữ liệu
Để tải toàn bộ dữ liệu người chơi về máy tính lưu trữ:
```powershell
npx wrangler d1 export bat-thu-vuong-db --remote --output="./backup_db.sql"
```

### 2. Xem trực tiếp dữ liệu người chơi trong database
Xem danh sách 10 người chơi đăng ký mới nhất:
```powershell
npx wrangler d1 execute bat-thu-vuong-db --remote --command="SELECT username, gender, datetime(updated_at/1000, 'unixepoch', '+7 hours') as updated_time FROM players ORDER BY updated_at DESC LIMIT 10;"
```

### 3. Xem bảng xếp hạng PvP tuần
```powershell
npx wrangler d1 execute bat-thu-vuong-db --remote --command="SELECT username, week_key, points, wins, losses FROM pvp_leaderboard ORDER BY points DESC LIMIT 10;"
```

### 4. Xóa dữ liệu rác / Reset bảng xếp hạng
Nếu muốn reset bảng xếp hạng PvP cho tuần mới:
```powershell
npx wrangler d1 execute bat-thu-vuong-db --remote --command="DELETE FROM pvp_leaderboard WHERE week_key = 'TUẦN_CẦN_XÓA';"
```

### 5. Cách sử dụng bảng điều khiển Admin (GM) trong game
1. Đăng ký tài khoản trong game với ID Game trùng với tên đã khai báo trong whitelist (ví dụ: `TenTaiKhoanCuaBan`) và mã PIN 8 số.
2. Đăng nhập vào game -> Biểu tượng hoặc nút mở Admin sẽ hiển thị (hoặc bấm lệnh mở bảng GM).
3. Nhập mã PIN bảo mật của tài khoản Admin -> Hệ thống cho phép:
   - Tạo thú với chỉ số tùy biến, gắn kỹ năng độc quyền "Hồi Phục Linh Hồn" x2 Dame.
   - Thưởng trứng linh thú ngẫu nhiên hoặc chỉ định.
   - Bơm Vàng (Coins) và Kim Cương (Diamonds) cho tài khoản bất kỳ.
   - Bật / tắt Boss Thế Giới 3 Miền cho toàn bộ máy chủ cùng tham chiến.

---

## ✅ TỔNG KẾT

Mã nguồn **Batthu-main** là một dự án game hoàn chỉnh, độc đáo, kết hợp tài tình giữa các công nghệ web hiện đại (Tailwind, Leaflet GPS, HTML5 Canvas) và nền tảng Serverless Cloudflare Workers + D1 Database. 

Sau khi kiểm tra, **toàn bộ các lỗi cú pháp và lỗi thiếu bảng cơ sở dữ liệu đã được khắc phục hoàn toàn**. Giờ đây dự án đã sẵn sàng 100% để bạn tạo Database D1 và triển khai online lên Internet!
