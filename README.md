# Dương Minh Logistics - Web App Chọn Xe Container

Ứng dụng Next.js giúp nhân viên nhập booking/báo giá bằng chat, lưu database PostgreSQL, chống trùng booking, tạo báo cáo, thống kê và chọn xe theo nguyên tắc ưu tiên xe nhà trước xe ngoài.

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS, Recharts
- Backend: Next.js API routes
- Database: PostgreSQL
- ORM: Prisma
- Auth: NextAuth email/password + Google OAuth
- AI: OpenRouter API
- Import Excel/CSV: SheetJS

## Cài đặt

```bash
npm install
```

File `.env` đã được tạo sẵn. Anh chỉ cần dán key OpenRouter vào:

```env
OPENROUTER_API_KEY=""
```

Chạy database PostgreSQL bằng Docker:

```bash
docker compose up -d
```

Khởi tạo bảng và dữ liệu admin/xe nhà:

```bash
npm run db:push
npm run prisma:seed
```

Chạy dev server:

```bash
npm run dev -- -p 3001
```

Mở `http://localhost:3001`.

## Tài khoản admin mặc định

- Email: `admin@duongminhlogistics.vn`
- Password: `admin123@`

## Dữ liệu seed

- Admin mặc định
- Đội 1: 07 xe đầu kéo
- Đội 2: 04 xe đầu kéo
- Một số báo giá xe ngoài demo
- Danh sách model OpenRouter mặc định

## Luồng nghiệp vụ chính

Chat hiểu các nhóm câu:

- Booking xuất/nhập: lưu vào `bookings`, chống trùng theo `file_no + container_no + customer_name`, hoặc `booking_no + customer_name + booking_date` khi chưa có container.
- Báo giá xe ngoài: lưu vào `external_truck_prices`, có audit log.
- Báo cáo ngày: lưu `daily_container_reports`, `report_items`, `reuse_container_suggestions`.
- Thống kê: trả bảng theo khách hàng.
- Chọn xe: ưu tiên `internal_trucks` available theo Đội 1 rồi Đội 2; nếu hết xe nhà thì chọn giá xe ngoài thấp nhất theo tuyến/loại cont.

Nếu thiếu dữ liệu, hệ thống lưu `CHƯA ĐỦ DỮ LIỆU` và không tự bịa giá, nhà xe hoặc booking.

## API chính

- `POST /api/chat`
- `GET /api/dashboard`
- `GET /api/bookings`
- `GET /api/assignments`
- `GET /api/reports`
- `GET/POST /api/admin/users`
- `GET/POST /api/admin/trucks`
- `GET/POST /api/admin/prices`
- `GET/POST /api/admin/ai-settings`

## Ghi chú bảo mật

- Password được hash bằng bcrypt.
- API key OpenRouter chỉ đọc từ backend/env; frontend chỉ thấy model và key masked.
- API admin yêu cầu role `admin`.
- Các thao tác quan trọng ghi vào `audit_logs`.
