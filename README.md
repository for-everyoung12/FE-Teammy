# Teammy (Frontend)

Nền tảng capstone dành cho sinh viên: ghép nhóm, tìm mentor, quản lý dự án, và giao tiếp hiệu quả trong suốt quá trình thực hiện.

## Tính năng nổi bật
- Tìm đồng đội và tuyển thành viên theo vai trò/kỹ năng.
- Kết nối mentor, gửi/nhận lời mời hướng dẫn.
- Quản lý dự án: nhóm, topic, backlog, milestone, task board (kanban/list).
- Workspace nhóm: tài liệu, upload/download, theo dõi tiến độ.
- Chat và thông báo cho nhóm/mentor.
- Đánh giá/feedback và báo cáo tổng quan.
- Hỗ trợ đa vai trò: Student, Mentor, Moderator, Admin.
- AI Assistant hỗ trợ gợi ý/ghép nhóm và tự động phân nhóm.

## Công nghệ sử dụng
- React 18 + Vite
- Tailwind CSS + Ant Design
- Redux Toolkit, React Router
- Axios, Firebase, SignalR
- Recharts, Lucide Icons
- Jest + Testing Library

## Cài đặt và chạy dự án
```bash
npm install
npm run dev
```

## Các lệnh hữu ích
```bash
npm run build
npm run preview
npm run lint
npm run test
npm run test:cov
```

## Biến môi trường
Tạo file `.env` ở thư mục gốc:
```bash
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

VITE_DOMAIN_ADMIN=your_api_base_url
```

## Cấu trúc thư mục (rút gọn)
```
src/
  components/   # UI components
  pages/        # Các trang theo vai trò
  layout/       # Layout chung
  services/     # API services
  consts/       # Hằng số/menu theo role
  translations/ # i18n
  hook/         # custom hooks
```

## Ghi chú
- Dự án sử dụng Vite nên khuyến nghị chạy với Node.js và npm/yarn.
- Có thể triển khai lên Vercel hoặc các nền tảng tương thích.

## Đóng góp
Vui lòng tạo branch riêng và gửi pull request với mô tả rõ ràng về thay đổi.
