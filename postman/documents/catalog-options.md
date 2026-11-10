# Public catalog options

`GET /api/v1/catalog/options` không yêu cầu đăng nhập. Chỉ đọc metadata từ cùng bảng quản trị, không có thao tác ghi hoặc phân trang.

Response: `{ "status": 200, "message": "...", "data": { "danhMuc": [], "thuongHieu": [] } }`.

- `danhMuc[]`: `id` (number), `danhMucChaId` (number/null), `tenDanhMuc`, `duongDanUrl`, `anhDaiDien` (string/null). Chỉ có mục hoạt động với toàn bộ tổ tiên hoạt động; cây có chu trình bị loại. Sắp xếp theo tên.
- `thuongHieu[]`: `id` (number), `tenThuongHieu`, `duongDanUrl`, `logo` (string/null). Chỉ có thương hiệu hoạt động, sắp xếp theo tên.

Không trả entity JPA, danh sách sản phẩm nội bộ, số liệu quản trị hoặc trạng thái bị ẩn. Không cache lâu ở frontend: các request đồng thời dùng chung một promise, nhưng các lần tải sau lấy lại dữ liệu mới.

Storefront dùng slug thật cho route `/category/:slug`, ID cho cây danh mục và bộ lọc thương hiệu. `/search?thuong_hieu_id=<id>` chọn đúng thương hiệu; API sản phẩm hiện tại vẫn giữ nguyên contract. Khi API metadata lỗi, hiển thị thông báo thay vì đưa lại danh sách thương hiệu cố định.

Kiểm tra: `CatalogOptionsServiceTest` xác nhận tên/logo mới, mục ngừng hoạt động, tổ tiên bị ẩn và chu trình. Kiểm tra HTTP thực tế qua frontend proxy và trực tiếp backend xác nhận anonymous GET.
