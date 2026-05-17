# 🎬 Video Creator

Công cụ tạo video MP4 dọc (TikTok/Reels) từ tiêu đề, nội dung và hình ảnh.  
Chạy 100% trên trình duyệt, không cần server backend.

## Chạy ứng dụng

```bash
cd "c:\2nd Disk\AI Video"
npx -y serve@latest -l 3000 .
```

Mở trình duyệt **Chrome** hoặc **Edge** tại:

```
http://localhost:3000
```

## Tính năng

- 🎞️ Tạo nhiều cảnh (scene), mỗi cảnh có tiêu đề, nội dung, hình ảnh
- 🎨 Chỉnh màu, kích cỡ, vị trí text (trên / giữa)
- 📐 Video dọc 9:16 mặc định (TikTok/Reels), hỗ trợ vuông và ngang
- ➖ Đường accent trang trí dưới tiêu đề
- ▶️ Xem trước animation realtime
- 📥 Xuất video MP4

### Hiệu ứng Animation

- Mờ dần (Fade In)
- Trượt lên / xuống / từ phải
- Phóng to (Scale In)
- Đánh máy (Typewriter)
- Ken Burns (cho hình ảnh)

### Độ phân giải

| Tên | Kích thước | Dùng cho |
|-----|-----------|----------|
| TikTok/Reels | 1080×1920 | Video dọc (mặc định) |
| Vuông | 1080×1080 | Instagram, Facebook |
| Ngang Full HD | 1920×1080 | YouTube |
| Ngang HD | 1280×720 | YouTube nhẹ |

## Cách sử dụng

1. Bấm **+** để thêm cảnh
2. Nhập tiêu đề, nội dung, upload hình ảnh
3. Chỉnh màu, cỡ chữ, vị trí text, hiệu ứng animation
4. Bấm **▶ Xem trước** (hoặc phím Space)
5. Bấm **Xuất MP4** → chờ render → **Tải về**

## Layout

- **Text ở trên** (căn lề trên), ảnh ở dưới
- Chọn "Vị trí text" → Giữa nếu muốn căn giữa

## Phím tắt

| Phím | Chức năng |
|------|-----------|
| Space | Play / Pause |
| Escape | Stop |

## Cấu trúc dự án

```
AI Video/
├── index.html      # Giao diện HTML
├── style.css       # Dark theme styling
├── engine.js       # Canvas animation engine
├── exporter.js     # MP4 export (WebCodecs + mp4-muxer)
├── app.js          # Logic ứng dụng
└── README.md       # File này
```
