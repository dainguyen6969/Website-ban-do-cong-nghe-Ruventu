# Thêm cấu hình hệ thống bằng MySQL Workbench

Phần schema này đã được duyệt riêng cho chức năng Cài đặt hệ thống.
Hướng dẫn và hai script SQL đi cùng chức năng Cài đặt hệ thống v4.0.

Nội dung gửi cho thành viên:

> Trước khi chạy phiên bản có Cài đặt hệ thống, hãy sao lưu database đang dùng.
> Trong MySQL Workbench, kết nối đúng MySQL được cấu hình ở BE, chọn đúng database
> (thường là `dant_ruventu`) và kiểm tra bằng `SELECT DATABASE();`.
> Mở và chạy **toàn bộ**, lần lượt hai file:
> `BACKEND/src/main/resources/db/manual/007-system-settings.sql`, sau đó
> `BACKEND/src/main/resources/db/manual/008-project-font-size.sql`.
> Không tự tạo bảng khác hoặc đổi tên cột, không chạy trên database khác.
>
> Kết quả phải có bảng `cai_dat_he_thong`, gồm `id TINYINT` khóa chính cố định bằng 1
> và `bao_tri BOOLEAN NOT NULL DEFAULT FALSE` (MySQL hiển thị BOOLEAN là TINYINT(1)),
> cùng `font_size SMALLINT NOT NULL DEFAULT 14` lưu cỡ chữ chung toàn project.
> Bảng không có khóa ngoại; chỉ một dòng `id = 1`. Hai ràng buộc CHECK giữ id bằng 1
> và trạng thái bảo trì bằng 0 hoặc 1; CHECK thứ ba giới hạn font_size trong 12–20.
> Bảng `nguoi_dung` có thêm
> `font_family VARCHAR(40) NULL` và `font_size SMALLINT NULL`.
> Font-family vẫn lưu riêng theo tài khoản, NULL tương ứng Inter. Cột
> `nguoi_dung.font_size` là dữ liệu cũ từ script 007, không còn được ứng dụng đọc/ghi;
> giữ nguyên, không DROP. Cỡ chữ chỉ đọc/ghi ở `cai_dat_he_thong.font_size`,
> áp dụng cho mọi tài khoản và khách trên cả Admin/storefront. Chỉ ADMIN được đổi
> giá trị chung này; Font QA chỉ thử tại trình duyệt, không ghi DB.
>
> Hai script chạy lại được: không xóa dữ liệu và không reset cờ bảo trì/font đã lưu.
> Nếu bảng hoặc cột đã có nhưng kiểu dữ liệu/ràng buộc khác mô tả, dừng và báo lại;
> không DROP bảng để sửa. Sau khi SQL hoàn tất mới khởi động lại BE và FE.
> Đăng nhập ADMIN, bấm tên/ảnh tài khoản ở header Admin để mở Trang tài khoản.
> Chỉ thử bật bảo trì khi nhóm đã thống nhất thời điểm vì nó chặn người dùng cùng BE.
>
> Nếu không thể tắt bảo trì từ giao diện, người quản trị DB có thể chạy:
> `UPDATE cai_dat_he_thong SET bao_tri = FALSE WHERE id = 1;`
> Sau đó kiểm tra `SELECT id, bao_tri FROM cai_dat_he_thong;` và tải lại giao diện.

Nếu đã chạy script 007 ở bản đầu, chỉ cần chạy thêm 008. Không cần bảng mới nào
ngoài cai_dat_he_thong đã được duyệt. Script 008 không lấy cỡ chữ của bất kỳ tài khoản
nào làm mặc định toàn project: bắt đầu ở 14 px và giữ lựa chọn chung khi chạy lại.

Yêu cầu MySQL 8.0.16+ để CHECK được thực thi. Hibernate không tự chạy các file SQL này;
mỗi thành viên phải áp dụng một lần trên database của mình. Không ghi mật khẩu DB
vào file hướng dẫn, SQL hoặc commit.

## Prompt gửi thành viên

Sao chép nguyên khối dưới đây để gửi thành viên thực hiện trên MySQL của họ:

```text
Cập nhật database local để chạy chức năng Cài đặt hệ thống v4.0 của Ruventu.

1. Sao lưu DB. Mở MySQL Workbench, kết nối đúng MySQL mà BE đang sử dụng,
   chọn đúng database và chạy SELECT DATABASE(); để xác nhận.
2. Mở và chạy toàn bộ file BACKEND/src/main/resources/db/manual/007-system-settings.sql,
   sau đó chạy toàn bộ file BACKEND/src/main/resources/db/manual/008-project-font-size.sql.
   Nếu đã chạy 007, chỉ cần bổ sung 008. Dùng nguyên script trong repo,
   không tự đổi tên bảng/cột hay viết lại DDL bằng suy đoán.
3. Đối chiếu kết quả:
   - cai_dat_he_thong là bảng độc lập, không khóa ngoại, chỉ có dòng id = 1.
   - id: TINYINT, PRIMARY KEY, CHECK id = 1.
   - bao_tri: BOOLEAN NOT NULL DEFAULT FALSE, CHECK bao_tri IN (0, 1).
   - font_size: SMALLINT NOT NULL DEFAULT 14, CHECK font_size BETWEEN 12 AND 20.
   - nguoi_dung.font_family: VARCHAR(40) NULL, lưu riêng theo tài khoản.
   - nguoi_dung.font_size: SMALLINT NULL là cột cũ của 007, giữ lại nhưng
     ứng dụng không còn đọc/ghi. Cỡ chữ chung chỉ lưu ở cai_dat_he_thong.font_size.
4. Script được phép chạy lại, phải giữ nguyên cờ bảo trì và tùy chọn đã lưu.
   Nếu cấu trúc hiện có khác mô tả hoặc SQL lỗi, dừng và gửi lỗi cho nhóm;
   không DROP bảng/cột, không xóa dữ liệu, không tắt kiểm tra khóa ngoại.
5. Sau khi SQL thành công, khởi động BE và FE. Đăng nhập ADMIN, bấm avatar/tên
   ở header Admin để vào Trang tài khoản > Cài đặt hệ thống.
   Cỡ chữ dùng chung cho Admin, storefront và mọi tài khoản/khách; chỉ ADMIN
   được đổi cỡ chung. Font-family vẫn riêng theo tài khoản ở Admin.
   Font QA chỉ thử font/cỡ chữ trên trình duyệt, không ghi cỡ chung vào DB.
6. Giữ bảo trì TẮT khi bàn giao. Nếu nhóm thống nhất thử bảo trì, phải tắt lại
   sau khi thử. Khi không thể tắt từ UI, quản trị DB có thể chạy:
   UPDATE cai_dat_he_thong SET bao_tri = FALSE WHERE id = 1;

Không gửi mật khẩu/token hoặc file .env lên Git. Báo lại script đã chạy,
database đã chọn và kết quả đối chiếu schema, không kèm thông tin đăng nhập.
```
