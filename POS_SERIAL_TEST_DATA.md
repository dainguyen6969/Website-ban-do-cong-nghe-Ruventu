# Sản phẩm test serial POS

Đã thêm 20 sản phẩm / 20 phiên bản với 648 serial `TRONG_KHO` trong DB local. Tồn kho giữ nguyên. API bán hàng hiện có 27 phiên bản yêu cầu serial.

Tìm theo mã sản phẩm bên dưới trong Bán hàng và chọn đúng phiên bản. Serial mới có tiền tố `TEST-POS-20261005-`.

| Mã sản phẩm | Sản phẩm | Phiên bản | Số serial có thể bán |
| --- | --- | --- | --- |
| RV-CASE-0022 | Vỏ case Mid Tower Mesh đen - MSI · CASE02 | Màu đen | 14 |
| RV-MB-0028 | Mainboard B650M WiFi PRO - Gigabyte · MB03 | Tiêu chuẩn | 60 |
| RV-MON-0032 | Màn hình 27 inch 4K 144Hz AORUS - Gigabyte · MON03 | 24 inch FHD | 14 |
| RV-PSU-0043 | Nguồn máy tính 850W 80 Plus Bronze - Seasonic · PSU04 | 750W | 60 |
| RV-ACC-0048 | Webcam Full HD Core - Logitech · ACC04 | Màu đen | 60 |
| RV-MB-0052 | Mainboard H610M DDR4 AORUS - MSI · MB05 | Tiêu chuẩn | 14 |
| RV-RAM-0053 | Kit RAM DDR5 32GB 6000MHz Fury Beast - Kingston · RAM05 | 16GB tiêu chuẩn | 60 |
| RV-CPU-0062 | Bộ xử lý AMD Ryzen 9 7900 · CPU06 | Box chính hãng | 14 |
| RV-VGA-0063 | Card đồ họa GeForce RTX 4090 24GB Ventus - ASUS · VGA06 | Bản OC | 60 |
| RV-PSU-0067 | Nguồn máy tính 550W 80 Plus Gold - Corsair · PSU06 | 750W | 14 |
| RV-MON-0068 | Màn hình 27 inch QHD 180Hz TUF Gaming - ASUS · MON06 | 24 inch FHD | 60 |
| RV-ACC-0072 | Bàn phím cơ TKL Pro - Cooler Master · ACC06 | Màu đen | 14 |
| RV-RAM-0077 | Kit RAM DDR5 16GB 6400MHz Vengeance - Corsair · RAM07 | 16GB tiêu chuẩn | 14 |
| RV-SSD-0078 | Ổ cứng SSD KC3000 2TB NVMe - Kingston · SSD07 | 1TB | 60 |
| RV-VGA-0087 | Card đồ họa GeForce RTX 4060 Ti 8GB Gaming OC - Gigabyte · VGA08 | Bản OC | 14 |
| RV-MB-0088 | Mainboard Z790 Gaming WiFi TUF - MSI · MB08 | Tiêu chuẩn | 60 |
| RV-MON-0092 | Màn hình 32 inch UHD 160Hz AORUS - Gigabyte · MON08 | 24 inch FHD | 14 |
| RV-CPU-0122 | Bộ xử lý Intel Core i5-13400F · CPU11 | Box chính hãng | 14 |
| RV-SSD-0162 | Ổ cứng SSD 990 EVO 1TB NVMe - Samsung · SSD14 | 1TB | 14 |
| RV-ACC-0192 | Bàn phím cơ TKL Core - Logitech · ACC16 | Màu đen | 14 |

Seed: `BACKEND/sql/seed-pos-test-serials.sql`. Chạy lại bỏ qua phiên bản đã có serial. Đã kiểm tra API thật: cả 20 phiên bản đều trả `quan_ly_serial=true`, số serial khả dụng bằng tồn có thể bán.

Ghi chú dữ liệu: đã xóa đúng 740 serial test tạo nhầm cho sản phẩm ngừng hoạt động theo xác nhận của người dùng. Đã kiểm tra trong transaction: tồn kho giữ nguyên, 648 serial test cho 20 sản phẩm đang bán còn đủ. Tổng DB còn 691 serial (43 serial trước seed và 648 serial test). Backup: logs/pos-inactive-test-serials-backup.sql. Kết quả: logs/pos-inactive-serial-cleanup-result.json.
