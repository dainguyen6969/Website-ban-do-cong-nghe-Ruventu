# Ruventu – Environment Configuration

Tài liệu này mô tả cách cấu hình môi trường để chạy dự án **Ruventu** gồm:

- Spring Boot Backend
- React/Vite Frontend
- MySQL
- Redis
- JWT Authentication
- Gmail SMTP
- Cloudinary
- Docker / Docker Compose

---

# 1. Backend `application.properties`

Backend sử dụng biến môi trường thay vì hard-code thông tin nhạy cảm trực tiếp trong source code.

File:

```text
BACKEND/src/main/resources/application.properties
```

Cấu hình hiện tại:

```properties
spring.application.name=Dant-Ruventu

spring.datasource.url=${DB_CONNECTED}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}

spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

jwt.secret=${JWT_SECRET}
jwt.access-token-expiration=${JWT_ACCESS_TOKEN_EXPIRATION:900000}
jwt.refresh-token-expiration=${JWT_REFRESH_TOKEN_EXPIRATION:86400000}
jwt.refresh-token-remember-expiration=${JWT_REFRESH_TOKEN_REMEMBER_EXPIRATION:2592000000}

spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}

auth.cookie.secure=${AUTH_COOKIE_SECURE:false}

cart.guest-expiration=${CART_GUEST_EXPIRATION:2592000000}
cart.cookie.secure=${CART_COOKIE_SECURE:false}

ruventu.order.delivery-fee=${ORDER_DELIVERY_FEE:30000}

ruventu.inventory.time-zone=Asia/Ho_Chi_Minh
ruventu.inventory.warehouse-id=${INVENTORY_WAREHOUSE_ID:0}

ruventu.sales.promotion-rules[1].unit=TIEN

cloudinary.url=${CLOUDINARY_URL:}

spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=5MB
```

---

# 2. Root `.env`

Tạo file:

```text
.env
```

tại thư mục root của project.

Ví dụ:

```env
MYSQL_DATABASE=dant_ruventu
MYSQL_USER=ruventu
MYSQL_PASSWORD=change-me
MYSQL_ROOT_PASSWORD=change-root-password

JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long

CLOUDINARY_URL=

MAIL_USERNAME=
MAIL_PASSWORD=

AUTH_COOKIE_SECURE=false

# These must match an ADMIN account available in the seeded database.
VITE_RUVENTU_ADMIN_USERNAME=admin@gmail.com
VITE_RUVENTU_ADMIN_PASSWORD=Admin@123

# Optional host-port overrides.
FRONTEND_PORT=5173
BACKEND_PORT=8080
MYSQL_PORT=3306
```

> Không nên commit file `.env` chứa credential thật lên GitHub.

Nên thêm vào `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

Có thể tạo file `.env.example` để hướng dẫn thành viên khác cấu hình môi trường:

```env
MYSQL_DATABASE=dant_ruventu
MYSQL_USER=ruventu
MYSQL_PASSWORD=change-me
MYSQL_ROOT_PASSWORD=change-root-password

JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long

CLOUDINARY_URL=

MAIL_USERNAME=
MAIL_PASSWORD=

AUTH_COOKIE_SECURE=false

VITE_RUVENTU_ADMIN_USERNAME=
VITE_RUVENTU_ADMIN_PASSWORD=

FRONTEND_PORT=5173
BACKEND_PORT=8080
MYSQL_PORT=3306
```

---

# 3. Frontend `.env.local`

Trong thư mục Frontend tạo:

```text
.env.local
```

Nội dung:

```env
VITE_RUVENTU_ADMIN_USERNAME=admin@gmail.com
VITE_RUVENTU_ADMIN_PASSWORD=Admin@123
```

Các biến bắt đầu bằng:

```text
VITE_
```

sẽ được Vite expose cho frontend.

Vì vậy **không được lưu secret quan trọng trong biến `VITE_*`**.

Thông tin:

```env
VITE_RUVENTU_ADMIN_USERNAME
VITE_RUVENTU_ADMIN_PASSWORD
```

chỉ nên được dùng cho môi trường development/testing.

Không nên dùng tài khoản Admin production theo cách này.

---

# 4. Các biến môi trường Backend

## Database

Spring Boot yêu cầu:

```env
DB_CONNECTED=
DB_USERNAME=
DB_PASSWORD=
```

Ví dụ khi chạy local:

```env
DB_CONNECTED=jdbc:mysql://localhost:3306/dant_ruventu
DB_USERNAME=ruventu
DB_PASSWORD=change-me
```

Nếu Backend chạy trong Docker Compose và service MySQL có tên:

```text
mysql
```

thì JDBC URL có thể là:

```env
DB_CONNECTED=jdbc:mysql://mysql:3306/dant_ruventu
```

---

# 5. JWT

Backend yêu cầu:

```env
JWT_SECRET=
```

Ví dụ:

```env
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Các thời gian hết hạn có giá trị mặc định:

| Variable | Default | Ý nghĩa |
|---|---:|---|
| `JWT_ACCESS_TOKEN_EXPIRATION` | `900000` | Access Token – 15 phút |
| `JWT_REFRESH_TOKEN_EXPIRATION` | `86400000` | Refresh Token – 1 ngày |
| `JWT_REFRESH_TOKEN_REMEMBER_EXPIRATION` | `2592000000` | Remember Me – 30 ngày |

Đơn vị:

```text
milliseconds
```

---

# 6. Cloudinary

Ruventu sử dụng Cloudinary để lưu trữ hình ảnh.

Biến môi trường:

```env
CLOUDINARY_URL=
```

Format:

```text
cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Ví dụ:

```env
CLOUDINARY_URL=cloudinary://123456789:your-api-secret@ruventu
```

Không commit URL thật lên GitHub vì trong URL có chứa:

```text
API_SECRET
```

Backend đọc cấu hình qua:

```properties
cloudinary.url=${CLOUDINARY_URL:}
```

Kích thước upload hiện tại:

```properties
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=5MB
```

---

# 7. Gmail SMTP

Cấu hình gửi email:

```env
MAIL_USERNAME=
MAIL_PASSWORD=
```

Backend sử dụng:

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587

spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

Ví dụ:

```env
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-google-app-password
```

Nên sử dụng **Google App Password**, không sử dụng trực tiếp mật khẩu tài khoản Google.

---

# 8. Redis

Mặc định:

```text
localhost:6379
```

Có thể override bằng:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

Backend:

```properties
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
```

---

# 9. Cookie Security

Development:

```env
AUTH_COOKIE_SECURE=false
```

Khi deploy production sử dụng HTTPS nên chuyển thành:

```env
AUTH_COOKIE_SECURE=true
```

Cart cookie cũng hỗ trợ:

```env
CART_COOKIE_SECURE=false
```

Nếu không khai báo thì mặc định là:

```text
false
```

---

# 10. Shopping Cart

Guest cart expiration mặc định:

```properties
cart.guest-expiration=${CART_GUEST_EXPIRATION:2592000000}
```

Tương đương:

```text
30 ngày
```

Có thể override:

```env
CART_GUEST_EXPIRATION=2592000000
```

---

# 11. Order Configuration

Phí giao hàng mặc định:

```properties
ruventu.order.delivery-fee=${ORDER_DELIVERY_FEE:30000}
```

Tương đương:

```text
30.000 VND
```

Có thể override:

```env
ORDER_DELIVERY_FEE=30000
```

---

# 12. Inventory Configuration

Timezone:

```properties
ruventu.inventory.time-zone=Asia/Ho_Chi_Minh
```

Warehouse mặc định:

```properties
ruventu.inventory.warehouse-id=${INVENTORY_WAREHOUSE_ID:0}
```

Có thể cấu hình:

```env
INVENTORY_WAREHOUSE_ID=1
```

---

# 13. MySQL

Database mặc định:

```env
MYSQL_DATABASE=dant_ruventu
```

User:

```env
MYSQL_USER=ruventu
```

Password:

```env
MYSQL_PASSWORD=change-me
```

Root password:

```env
MYSQL_ROOT_PASSWORD=change-root-password
```

Port mặc định:

```env
MYSQL_PORT=3306
```

---

# 14. Frontend

Frontend mặc định sử dụng port:

```env
FRONTEND_PORT=5173
```

Backend:

```env
BACKEND_PORT=8080
```

Frontend chạy development:

```bash
cd FRONTEND
npm install
npm run dev
```

---

# 15. Backend

Đảm bảo Java đã được cài đặt.

Kiểm tra:

```bash
java -version
```

Sau đó chạy Backend:

```bash
./mvnw spring-boot:run
```

hoặc:

```bash
mvn spring-boot:run
```

Backend mặc định chạy tại:

```text
http://localhost:8080
```

---

# 16. MySQL với Docker

Ví dụ chạy MySQL 8.4:

```bash
docker run -d \
  --name ruventu-mysql \
  -e MYSQL_DATABASE=dant_ruventu \
  -e MYSQL_USER=ruventu \
  -e MYSQL_PASSWORD=change-me \
  -e MYSQL_ROOT_PASSWORD=change-root-password \
  -p 3306:3306 \
  mysql:8.4
```

Sau đó Backend có thể kết nối bằng:

```env
DB_CONNECTED=jdbc:mysql://127.0.0.1:3306/dant_ruventu
DB_USERNAME=ruventu
DB_PASSWORD=change-me
```

---

# 17. Redis local

Nếu máy đã cài Redis:

```bash
redis-server
```

Kiểm tra:

```bash
redis-cli ping
```

Kết quả mong đợi:

```text
PONG
```

Hoặc chạy Redis bằng Docker:

```bash
docker run -d \
  --name ruventu-redis \
  -p 6379:6379 \
  redis:latest
```

---

# 18. Environment variables tối thiểu

Để Backend có thể khởi động, cần tối thiểu:

```env
DB_CONNECTED=jdbc:mysql://localhost:3306/dant_ruventu
DB_USERNAME=ruventu
DB_PASSWORD=change-me

JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Cloudinary và Mail hiện có thể để trống nếu chức năng tương ứng chưa được sử dụng:

```env
CLOUDINARY_URL=
MAIL_USERNAME=
MAIL_PASSWORD=
```

---

# 19. Git Security

Không commit các file sau:

```text
.env
.env.local
```

`.gitignore` đề xuất:

```gitignore
# Environment
.env
.env.local
.env.*.local

# IntelliJ
.idea/
*.iml

# Maven
target/

# Node
node_modules/
dist/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
```

Chỉ commit template:

```text
.env.example
```

---

# 20. Cấu trúc cấu hình đề xuất

```text
Website-ban-do-cong-nghe-Ruventu/
│
├── .env
├── .env.example
├── .gitignore
│
├── BACKEND/
│   └── src/
│       └── main/
│           └── resources/
│               └── application.properties
│
└── FRONTEND/
    ├── .env.local
    ├── package.json
    └── src/
```

---

# 21. Lưu ý

`spring.jpa.hibernate.ddl-auto` hiện tại đang được cấu hình:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Cấu hình này phù hợp cho quá trình development vì Hibernate có thể tự cập nhật schema dựa trên Entity.

Tuy nhiên khi triển khai production nên cân nhắc sử dụng migration tool như:

```text
Flyway
```

hoặc:

```text
Liquibase
```

thay vì để Hibernate tự thay đổi database schema.

---

## Quick Start

### 1. Clone project

```bash
git clone https://github.com/dainguyen6969/Website-ban-do-cong-nghe-Ruventu.git
cd Website-ban-do-cong-nghe-Ruventu
```

### 2. Tạo `.env`

```bash
cp .env.example .env
```

Sau đó cập nhật:

```env
DB_CONNECTED=
DB_USERNAME=
DB_PASSWORD=
JWT_SECRET=
CLOUDINARY_URL=
MAIL_USERNAME=
MAIL_PASSWORD=
```

### 3. Khởi động MySQL và Redis

Đảm bảo:

```text
MySQL :3306
Redis :6379
```

đang hoạt động.

### 4. Chạy Backend

```bash
cd BACKEND
./mvnw spring-boot:run
```

### 5. Chạy Frontend

```bash
cd FRONTEND
npm install
npm run dev
```

Truy cập:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8080
```

---

## Security Warning

Không đưa các giá trị thật của những biến sau lên GitHub:

```text
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
JWT_SECRET
CLOUDINARY_URL
MAIL_PASSWORD
```

Nếu credential thật từng được commit lên GitHub, việc chỉ xóa chúng khỏi commit mới là chưa đủ. Nên thay/rotate credential tương ứng.
