# Cài đặt hệ thống: tự cập nhật DB và hướng dẫn MySQL

Schema này đã được duyệt cho chức năng Cài đặt hệ thống. Chỉ dùng bảng
`cai_dat_he_thong` hiện có, không thêm bảng khác.

## Cách mặc định: khởi động BE

BE tự chạy các script 007 → 008 → 009 sau khi Hibernate chuẩn bị các bảng entity.
Nếu chưa có `cai_dat_he_thong`, BE tạo bảng và dòng `id = 1`; nếu đã có, chỉ bổ sung
cột/ràng buộc còn thiếu. Không reset trạng thái bảo trì, phông chữ hoặc cỡ chữ đã lưu.
Không cần chạy SQL thủ công cho chức năng này khi tài khoản DB có đủ quyền.

Database kết nối trong `DB_CONNECTED` phải tồn tại trước. Tài khoản DB cần quyền
SELECT, CREATE, ALTER và INSERT trên database đó. Nếu SQL lỗi hoặc thiếu quyền,
BE dừng khởi động và ghi lỗi; không bỏ qua để chạy với cấu hình DB chưa hoàn chỉnh.
Các cột font cũ của `nguoi_dung` trong 007 cũng được giữ tương thích với bản trước.

Nếu tài khoản chạy BE chỉ có quyền đọc/ghi dữ liệu, người quản trị DB cần chạy
SQL thủ công trước rồi đặt `SPRING_SQL_INIT_MODE=never` cho BE. Chỉ tắt tự cập nhật
sau khi đã áp dụng đủ script; chế độ tự động cần quyền DDL kể cả khi bảng đã tồn tại.

## Cách thủ công dự phòng: MySQL Workbench

Sao lưu database, kết nối đúng MySQL mà BE đang sử dụng, chọn database và kiểm tra
bằng `SELECT DATABASE();`. Mở và chạy toàn bộ các file theo thứ tự:

1. `BACKEND/src/main/resources/db/manual/007-system-settings.sql`
2. `BACKEND/src/main/resources/db/manual/008-project-font-size.sql`
3. `BACKEND/src/main/resources/db/manual/009-project-font-family.sql`

Nếu đã chạy 007/008 thì chỉ cần bổ sung 009. Các script chạy lại được và không
reset trạng thái bảo trì hoặc cấu hình chung đã lưu. Đây cũng là chính các file
Spring Boot tự chạy khi BE khởi động, nên cấu trúc tạo thủ công và tự động giống nhau.

Cấu trúc cần đối chiếu:

| Cột của cai_dat_he_thong | Kiểu và ràng buộc |
| --- | --- |
| id | TINYINT, PRIMARY KEY, CHECK id = 1 |
| bao_tri | BOOLEAN NOT NULL DEFAULT FALSE, CHECK bao_tri IN (0, 1) |
| font_size | SMALLINT NOT NULL DEFAULT 14, CHECK font_size BETWEEN 12 AND 20 |
| font_family | VARCHAR(40) NOT NULL DEFAULT 'Inter' |

Bảng độc lập, không có khóa ngoại, chỉ có một dòng `id = 1`. MySQL hiển thị BOOLEAN
là TINYINT(1); yêu cầu MySQL 8.0.16+ để thực thi CHECK.

Hai cột `nguoi_dung.font_family VARCHAR(40) NULL` và `nguoi_dung.font_size SMALLINT NULL`
là dữ liệu cũ của 007: giữ nguyên, không DROP; ứng dụng không còn đọc/ghi chúng.
Cả phông chữ và cỡ chữ nay lưu chung ở `cai_dat_he_thong`, dùng cho Admin,
storefront và khách chưa đăng nhập. Chỉ ADMIN được thay đổi cấu hình chung.
Font QA chỉ thử trực tiếp trên giao diện trong phiên hiện tại, không ghi DB;
bấm “Dùng cài đặt đã lưu” để trở về cấu hình chung. Lựa chọn QA cũ trong
localStorage không được dùng làm mặc định nữa.

Khi nâng cấp từ bản lưu phông chữ riêng theo tài khoản, 009 khởi tạo phông chung
là Inter. ADMIN cần chọn lại phông mong muốn trong Trang tài khoản > Cài đặt hệ thống
và lưu một lần để dùng chung. Script không tự lấy phông của một tài khoản bất kỳ.
Cỡ chữ và trạng thái bảo trì hiện có được giữ nguyên.

Nếu schema khác mô tả hoặc SQL lỗi, dừng và gửi lỗi cho nhóm; không DROP bảng/cột
để sửa. Sau khi chạy SQL thành công, khởi động lại BE và FE.
Chỉ bật bảo trì khi nhóm thống nhất thời điểm; giữ bảo trì TẮT khi bàn giao.
Nếu không tắt được từ UI, quản trị DB có thể chạy:

```sql
UPDATE cai_dat_he_thong SET bao_tri = FALSE WHERE id = 1;
SELECT id, bao_tri, font_family, font_size FROM cai_dat_he_thong;
```

## Nội dung gửi thành viên

### Cách chạy thông thường

```text
Đã bổ sung tự cập nhật DB cho Cài đặt hệ thống Ruventu.

Sau khi lấy bản code mới, kiểm tra DB_CONNECTED trỏ đúng database MySQL đã tồn tại
và khởi động BE. BE tự chạy SQL 007 → 008 → 009 để tạo bảng cai_dat_he_thong nếu
chưa có, bổ sung các cột thiếu và giữ nguyên cấu hình đã lưu. Không cần chạy SQL tay.
Tài khoản kết nối DB cần quyền SELECT, CREATE, ALTER và INSERT. Nếu BE báo lỗi
quyền hoặc schema, gửi lỗi cho nhóm; không DROP bảng/cột hay xóa dữ liệu để sửa.

Sau khi BE chạy thành công, chạy FE. Cả font-family và font-size dùng chung cho
Admin, storefront và khách. ADMIN vào Trang tài khoản > Cài đặt hệ thống để lưu.
Font QA chỉ thử giao diện, không ghi DB. Giữ bảo trì tắt khi bàn giao.
Không gửi mật khẩu/token hoặc .env lên Git.
```

### Prompt thủ công dự phòng

Sao chép khối dưới đây khi người quản trị DB cần tự áp dụng SQL, chẳng hạn tài khoản
chạy BE bị giới hạn quyền tạo/sửa bảng:

```text
Cập nhật database local cho Cài đặt hệ thống Ruventu:

1. Sao lưu DB. Mở MySQL Workbench, kết nối đúng MySQL của BE, chọn database
   và xác nhận bằng SELECT DATABASE();.
2. Chạy toàn bộ các script trong repo theo thứ tự:
   BACKEND/src/main/resources/db/manual/007-system-settings.sql
   BACKEND/src/main/resources/db/manual/008-project-font-size.sql
   BACKEND/src/main/resources/db/manual/009-project-font-family.sql
   Nếu đã chạy 007/008, chỉ cần thêm 009. Không tự đổi tên bảng/cột.
3. Đối chiếu bảng cai_dat_he_thong độc lập, không khóa ngoại, một dòng id = 1:
   id TINYINT PRIMARY KEY CHECK id = 1;
   bao_tri BOOLEAN NOT NULL DEFAULT FALSE CHECK bao_tri IN (0, 1);
   font_size SMALLINT NOT NULL DEFAULT 14 CHECK font_size BETWEEN 12 AND 20;
   font_family VARCHAR(40) NOT NULL DEFAULT 'Inter'.
   Giữ các cột font_family/font_size cũ ở nguoi_dung; ứng dụng không dùng nữa.
4. Script chạy lại phải giữ cấu hình chung đã lưu. Nếu cấu trúc khác mô tả
   hoặc SQL lỗi, dừng và báo nhóm; không DROP bảng/cột hoặc xóa dữ liệu.
5. Nếu tài khoản chạy BE bị giới hạn quyền CREATE/ALTER, sau khi quản trị DB
   đã áp dụng đủ script hãy đặt SPRING_SQL_INIT_MODE=never cho BE.
   Khởi động lại BE và FE. Đăng nhập ADMIN, bấm avatar/tên ở header Admin,
   vào Trang tài khoản > Cài đặt hệ thống. Khi nâng cấp từ font riêng theo
   tài khoản, chọn lại font muốn dùng chung và lưu một lần (009 mặc định Inter).
   Cả font-family và font-size dùng chung cho Admin, storefront và mọi khách.
   Chỉ ADMIN được lưu; Font QA chỉ thử giao diện trong phiên, không ghi DB.
6. Giữ bảo trì TẮT khi bàn giao. Nếu không tắt được từ UI, quản trị DB chạy:
   UPDATE cai_dat_he_thong SET bao_tri = FALSE WHERE id = 1;

Không gửi mật khẩu/token hoặc .env lên Git. Báo script đã chạy, database đã
chọn và kết quả đối chiếu schema, không kèm thông tin đăng nhập.
```
