# Đồng bộ nút đầu trang quản trị

Lấy danh sách đơn hàng và chi tiết đơn hàng làm mẫu cho vai trò của từng nút. Dùng danh sách sản phẩm để đối chiếu dấu cộng và biểu tượng nhập tệp. Nút vuông, chữ đậm, cao tối thiểu 41 px, biểu tượng nét viền 16 px. Cỡ chữ bằng 110% mốc nội dung 13 px và tiếp tục theo tỷ lệ phông chữ trong cài đặt Ruventu.

| Vai trò | Hiển thị | Ví dụ |
| --- | --- | --- |
| Tạo và lưu | Nền đỏ, chữ trắng | Thêm sản phẩm, lập phiếu, lưu thay đổi |
| Xử lý nghiệp vụ | Nền đen, chữ trắng | Duyệt đơn, nhận hàng, kích hoạt lại |
| Điều hướng và tiện ích | Nền trắng, viền đen | Quay lại, in, tải lại, nhập hoặc xuất Excel |
| Dừng hoặc hủy nghiệp vụ | Nền trắng, viền đỏ | Ngừng kinh doanh, hủy đơn, khóa tài khoản |

- [x] Đối chiếu router admin với ảnh và xác định các nút ở đầu trang danh sách, chi tiết, tạo mới hoặc chỉnh sửa. Nút nghiệp vụ ở mép phải thanh công cụ như Xuất Excel và Tạo đợt thu hồi thuộc cùng phạm vi.
- [x] Dùng một thành phần và một bộ CSS cho cả ba trang mẫu. Giữ ngữ nghĩa của nút và liên kết, giữ điều kiện hiển thị, giá trị disabled, quyền và thao tác hiện có.
- [x] Áp dụng theo nhóm hàng hóa và kho, đơn hàng và giao nhận, khách hàng và đối tác, nhân viên, khuyến mại, sổ quỹ, bảo hành và danh mục. Nút trong bảng, bộ lọc, popup, chân biểu mẫu, sidebar và trang tài khoản giữ phạm vi CSS riêng.
- [x] Build frontend, cập nhật Docker và kiểm tra trên các trang vừa chuyển. So sánh màu, viền, kiểu chữ, icon, trạng thái disabled và nút điều hướng. Kiểm tra nhóm nhiều nút có xuống dòng khi hẹp và khi tăng cỡ chữ.

Kiểm tra trên 49 đường dẫn admin ở 1.440 px. Kiểm tra lại 8 màn ở 590 px với cỡ chữ 125%. Nút hủy phiếu chi thủ công được kiểm tra bằng phản hồi mô phỏng trong trình duyệt. 30 kiểm thử bảo hành và phân trang đều qua.

## Tinh chỉnh sau khi xem trên Docker

Nút nền đỏ và nút Đơn chờ hàng cần xử lý giảm xuống 36 px, với chữ đậm 12 px mặc định và biểu tượng 14 px. Xuất Excel, Xem báo cáo và các nút về danh sách đơn hàng dùng cùng kích thước với nền trắng, viền xám 1 px, chữ bán đậm và cách viết hoa đầu câu.
