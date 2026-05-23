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

## Tính năng nổi bật

- 🎞️ **Cảnh quay đa dạng**: Tạo nhiều cảnh, tùy chỉnh linh hoạt từng cảnh.
- 🎨 **Thiết kế Editorial**: 
  - Hỗ trợ **3 dòng tiêu đề độc lập** (chỉnh riêng cỡ chữ, màu sắc, canh lề).
  - Cú pháp Highlight: bọc từ trong `*dấu sao*` để đổi màu nhấn (Highlight Color).
  - Tùy chọn hiển thị **Số trang (vd: 1/10)**, chữ nghiêng (Italic) cho nội dung, và đường kẻ Accent chuyên nghiệp.
- 🖼️ **Xử lý hình ảnh nâng cao**:
  - Tùy chọn vị trí ảnh: Toàn màn hình (nền), Trên, Giữa, Dưới, hoặc Dưới nội dung.
  - Hỗ trợ Kéo to/nhỏ (Scale) và Tịnh tiến vị trí (Offset X/Y).
- ⏱️ **Kiểm soát thời gian (Timing)**: Chỉnh thời gian bắt đầu (Delay) và thời lượng (Duration) hiệu ứng riêng cho Tiêu đề và Nội dung.
- 🎬 **Giao diện chuẩn Production**: Giao diện Light Theme hiện đại, sạch sẽ. Canvas mặc định với nền trắng giúp hiển thị văn bản tối ưu.
- ▶️ **Render Realtime**: Xem trước video ngay lập tức không cần tải trang.
- 📥 **Xuất Video MP4**: Hỗ trợ xuất MP4 phần cứng tốc độ cao qua WebCodecs (TikTok, Facebook, YouTube).

### Hiệu ứng Animation (12+ loại)

- Mờ dần (Fade In), Mờ → Rõ (Blur In)
- Trượt lên / xuống / từ trái / từ phải
- Phóng to (Scale In)
- Nẩy vào (Bounce In), Xoay vào (Rotate In), Lật vào (Flip In)
- Đánh máy (Typewriter)
- Glitch (Hiệu ứng nhiễu điện tử)
- Ken Burns (Hiệu ứng thu phóng cho hình ảnh)

### Độ phân giải hỗ trợ

| Tên | Kích thước | Dùng cho |
|-----|-----------|----------|
| TikTok/Reels | 1080×1920 | Video dọc (mặc định) |
| Vuông | 1080×1080 | Instagram, Facebook |
| Ngang Full HD | 1920×1080 | YouTube |
| Ngang HD | 1280×720 | YouTube nhẹ |

## Cách sử dụng

1. **Thêm cảnh**: Bấm **+** để thêm một phân cảnh mới.
2. **Thiết kế Tiêu đề**: 
   - Nhập tối đa 3 dòng tiêu đề. Có thể dùng `*từ khóa*` để tô màu highlight.
   - Trượt thanh cỡ chữ, đổi màu và căn lề độc lập cho từng dòng.
3. **Thêm Nội dung & Ảnh**: Nhập text nội dung, tải ảnh lên và chọn vị trí/kích cỡ phù hợp.
4. **Hiệu ứng & Thời gian**: Chọn kiểu chuyển cảnh, animation, và tinh chỉnh thanh trượt độ trễ/thời lượng.
5. **Xem trước**: Bấm **▶ Xem trước** hoặc nhấn phím **Space**.
6. **Xuất file**: Bấm **Xuất MP4** → chờ xử lý → **Tải về**.

## Phím tắt

| Phím | Chức năng |
|------|-----------|
| Space | Play / Pause |
| Escape | Stop |

## Cấu trúc dự án

```
AI Video/
├── index.html      # Giao diện HTML
├── style.css       # Light theme & styling
├── engine.js       # Canvas animation & layout engine
├── exporter.js     # MP4/WebM export (WebCodecs + mp4-muxer)
├── app.js          # Logic ứng dụng, state management
└── README.md       # File tài liệu
```

## Nhật ký Cập nhật (Changelog)

### [24/05/2026] - Sửa lỗi kết xuất & Đồng bộ hóa Layout
- 🐛 **Sửa lỗi ReferenceError**: Khắc phục lỗi `hasTitle is not defined` trên chế độ dọc (`_vertical`) khiến tiến trình vẽ canvas bị ngắt quãng giữa chừng, giải quyết triệt để lỗi không hiển thị nội dung và hình ảnh.
- 📐 **Đồng bộ hóa Giao diện Ngang**: Nâng cấp hàm `_horizontal` để hỗ trợ hiển thị cả **3 dòng tiêu đề độc lập** (`titleLine1`, `titleLine2`, `titleLine3`) tương tự giao diện dọc, sửa lỗi tiêu đề bị trống/biến mất khi người dùng chọn độ phân giải nằm ngang.
- 🧹 **Tối ưu dọn dẹp**: Xóa bỏ các thuộc tính bị khai báo trùng lặp trong hàm vẽ tiêu đề giúp tối ưu hóa hiệu năng render canvas.
- 🔄 **Bypass Cache**: Thêm hậu tố phiên bản `?v=4` cho các tệp script trong `index.html` để đảm bảo trình duyệt luôn tải phiên bản hoạt động tốt nhất.
