export const intakeOptions = {
  reason: [
    ['Nguồn và sạc', ['Không lên nguồn', 'Không nhận sạc', 'Sạc chập chờn', 'Pin tụt nhanh', 'Pin không nhận', 'Đèn báo nguồn bất thường']],
    ['Khởi động và hệ thống', ['Không vào hệ điều hành', 'Tự tắt hoặc khởi động lại', 'Treo máy', 'Màn hình xanh', 'Không nhận RAM', 'Không nhận thiết bị lưu trữ']],
    ['Màn hình và hình ảnh', ['Không lên hình', 'Màn hình nhấp nháy', 'Sọc màn hình', 'Điểm chết', 'Sai màu', 'Mất hình khi tải nặng', 'Không nhận màn hình ngoài']],
    ['Hiệu năng và tản nhiệt', ['Quá nhiệt', 'Quạt không quay', 'Quạt hoặc bơm kêu bất thường', 'Hiệu năng giảm bất thường', 'Ứng dụng văng khi tải nặng', 'Tản nhiệt rò chất lỏng']],
    ['Kết nối và cổng', ['Mất kết nối', 'Không nhận Wi-Fi', 'Không nhận Bluetooth', 'Không nhận mạng LAN', 'Cổng USB không nhận', 'Cổng hình ảnh không hoạt động', 'Kết nối không dây chập chờn']],
    ['Âm thanh và camera', ['Lỗi âm thanh', 'Loa rè hoặc mất tiếng', 'Mic không thu âm', 'Jack âm thanh không nhận', 'Camera không nhận', 'Âm thanh và hình ảnh lệch nhau']],
    ['Bàn phím, chuột và điều khiển', ['Liệt phím', 'Lặp phím', 'Nút bấm không phản hồi', 'Con trỏ giật hoặc trôi', 'Cuộn chuột lỗi', 'Touchpad không hoạt động', 'Đèn nền không hoạt động']],
    ['Lưu trữ và dữ liệu', ['Không đọc được dữ liệu', 'Không ghi được dữ liệu', 'Cảnh báo SMART', 'Ổ đĩa mất kết nối khi sử dụng', 'Tốc độ đọc ghi bất thường']],
    ['Vỏ, cơ khí và phụ kiện', ['Bản lề kẹt hoặc lỏng', 'Nút nguồn bị kẹt', 'Cổng hoặc đầu cắm lỏng', 'Vỏ thiết bị tách mép', 'Phụ kiện kèm theo không hoạt động', 'Có mùi khét bất thường']],
    ['Phần mềm và cập nhật', ['Không cài được trình điều khiển', 'Lỗi sau khi cập nhật', 'Thiết bị không tương thích', 'Cài đặt không được lưu', 'Lỗi không tái hiện ổn định']],
  ],
  condition: [
    ['Ngoại quan', ['Ngoại quan nguyên vẹn', 'Trầy xước', 'Móp hoặc nứt vỏ', 'Bong sơn hoặc bạc màu', 'Vỏ hở hoặc tách mép', 'Có bụi bẩn', 'Miếng đệm hoặc chân đế bị thiếu']],
    ['Màn hình và bề mặt hiển thị', ['Mặt kính trầy', 'Mặt kính nứt hoặc vỡ', 'Viền màn hình hở', 'Mặt kính có vết ép', 'Lớp phủ màn hình bong']],
    ['Độ ẩm và nhiệt', ['Có dấu hiệu ẩm hoặc vào nước', 'Có vết gỉ hoặc oxy hóa', 'Có cặn chất lỏng', 'Có dấu hiệu cháy sém', 'Có mùi khét', 'Vỏ biến dạng do nhiệt']],
    ['Tem, niêm phong và nhận dạng', ['Tem còn nguyên', 'Tem rách hoặc mất', 'Serial đọc được', 'Serial mờ hoặc không đọc được', 'Serial lệch thông tin', 'Có dấu hiệu tháo mở', 'Thiếu hoặc lỏng ốc']],
    ['Cổng, nút và cơ khí', ['Cổng hoặc đầu cắm cong', 'Chân tiếp xúc gãy hoặc cong', 'Nút bấm kẹt hoặc hỏng', 'Bản lề lỏng hoặc gãy', 'Quạt kẹt hoặc gãy cánh', 'Khóa hoặc chốt bị hỏng']],
    ['Pin, dây và bộ nguồn', ['Pin có dấu hiệu phồng', 'Thiếu pin tháo rời', 'Dây có vết gập hoặc đứt', 'Đầu sạc có vết cháy', 'Bộ nguồn có vết va đập']],
    ['Đóng gói và phụ kiện', ['Có hộp gốc', 'Hộp móp hoặc rách', 'Không có hộp gốc', 'Có phụ kiện kèm theo', 'Thiếu phụ kiện kèm theo', 'Phụ kiện có dấu hiệu hư hỏng']],
    ['Kiểm tra khi nhận', ['Bật được nguồn khi nhận', 'Không bật được nguồn khi nhận', 'Lỗi tái hiện khi kiểm tra', 'Chưa tái hiện lỗi', 'Chưa thể kiểm tra khi nhận']],
  ],
};

export const inspectionOptions = {
  ma_hang_muc: [
    ['Linh kiện chính', ['CPU', 'Bo mạch chủ', 'RAM', 'Card đồ họa', 'Ổ lưu trữ']],
    ['Nguồn và làm mát', ['Bộ nguồn', 'Pin', 'Bộ sạc', 'Tản nhiệt', 'Quạt']],
    ['Hiển thị và kết nối', ['Màn hình', 'Cáp và cổng kết nối', 'Mạng và kết nối không dây', 'Âm thanh và camera']],
    ['Ngoại vi và hệ thống', ['Bàn phím', 'Chuột', 'Vỏ và bản lề', 'Phụ kiện', 'Phần mềm và trình điều khiển', 'Toàn bộ thiết bị']],
  ],
  loi: intakeOptions.reason,
  noi_dung_xu_ly: [
    ['Kiểm tra và khắc phục', ['Kiểm tra lại trong điều kiện khách báo', 'Chạy kiểm tra tải', 'Vệ sinh và lắp lại', 'Cập nhật firmware', 'Cài lại trình điều khiển', 'Sửa hoặc thay linh kiện']],
    ['Chuyển xử lý và bàn giao', ['Gửi hãng hoặc nhà cung cấp', 'Đề xuất đổi thiết bị', 'Báo giá cho khách', 'Theo dõi thêm', 'Trả thiết bị sau kiểm tra']],
  ],
  ly_do: [
    ['Điều kiện bảo hành', ['Còn hạn và thuộc phạm vi bảo hành', 'Hết hạn bảo hành', 'Lỗi ngoài phạm vi bảo hành', 'Chưa đủ căn cứ xác định điều kiện']],
    ['Kết quả kiểm tra', ['Lỗi tái hiện khi kiểm tra', 'Chưa tái hiện được lỗi', 'Có dấu hiệu va đập hoặc chất lỏng', 'Có dấu hiệu can thiệp', 'Cần đơn vị bảo hành xác minh thêm']],
  ],
  can_cu: [
    ['Hồ sơ và chính sách', ['Chứng từ mua hàng', 'Serial và hồ sơ thiết bị', 'Hạn bảo hành trên hệ thống', 'Điều khoản bảo hành', 'Biên bản tiếp nhận']],
    ['Bằng chứng kỹ thuật', ['Ảnh hoặc video kiểm tra', 'Kết quả kiểm tra tải', 'Nhật ký lỗi', 'Đối chiếu bằng linh kiện thay thế', 'Biên bản của hãng hoặc nhà cung cấp']],
  ],
  don_vi_ket_luan: [
    ['Kết quả xác minh', ['Đã xác định lỗi', 'Chưa xác định được lỗi', 'Thiết bị hoạt động bình thường khi kiểm tra']],
    ['Hướng giải quyết', ['Đủ điều kiện bảo hành miễn phí', 'Xử lý có phí sau khi khách đồng ý', 'Chuyển đơn vị bảo hành kiểm tra', 'Đề xuất đổi thiết bị', 'Chờ kết quả kiểm tra thêm']],
  ],
};

const actionReasons = {
  YEU_CAU_DUNG: [
    ['Yêu cầu của khách', ['Khách yêu cầu dừng xử lý', 'Khách chưa đồng ý chi phí', 'Khách muốn nhận lại thiết bị']],
    ['Trong quá trình xử lý', ['Chưa có linh kiện thay thế', 'Phát hiện lỗi ngoài phạm vi đã thống nhất', 'Cần xác minh thêm với đơn vị bảo hành']],
  ],
  SAN_SANG_TRA: [
    ['Trả thiết bị chưa sửa', ['Khách không đồng ý phương án sửa', 'Không có linh kiện thay thế', 'Không thể khắc phục lỗi', 'Chưa tái hiện được lỗi']],
    ['Sau khi xử lý', ['Đã hoàn thành công việc', 'Đã chuẩn bị thiết bị đổi']],
  ],
  plan: [
    ['Thiết bị và linh kiện', ['Thiết bị không thể sửa', 'Không có linh kiện thay thế', 'Lỗi tái diễn sau sửa', 'Đơn vị bảo hành đề nghị đổi']],
    ['Theo thỏa thuận', ['Khách đồng ý phương án', 'Khách không đồng ý phương án', 'Phiên bản thay thế không còn hàng', 'Có phương án thay thế phù hợp hơn']],
  ],
  quotes: [
    ['Lập hoặc điều chỉnh báo giá', ['Lỗi ngoài phạm vi bảo hành', 'Phát sinh linh kiện hoặc công sửa', 'Cập nhật chi phí hoặc thời gian xử lý']],
    ['Phản hồi của khách', ['Khách đồng ý chi phí', 'Khách không đồng ý chi phí', 'Khách muốn nhận lại thiết bị']],
  ],
  invoice: [
    ['Hồ sơ và thanh toán', ['Đã đối chiếu báo giá được duyệt', 'Thông tin hóa đơn cần điều chỉnh', 'Theo thỏa thuận với khách', 'Theo phê duyệt nội bộ']],
  ],
};

const actionOptions = {
  can_cu: inspectionOptions.can_cu,
  can_cu_han: [
    ['Hạn của thiết bị gốc', ['Hạn còn lại trên hồ sơ thiết bị gốc', 'Đối chiếu hóa đơn mua hàng và ngày kích hoạt']],
    ['Hạn do đơn vị xác nhận', ['Chính sách bảo hành hàng đổi', 'Xác nhận của hãng hoặc nhà cung cấp', 'Biên bản đổi ghi rõ thời hạn mới']],
  ],
  can_cu_kiem_tra: [
    ['Kiểm tra trước khi trả', ['Đã kiểm tra ngoại quan và tem', 'Đã đối chiếu serial và phụ kiện', 'Đã kiểm tra nguồn và chức năng cơ bản', 'Đã kiểm tra lại lỗi khách báo', 'Đã chạy kiểm tra tải']],
    ['Hồ sơ sau xử lý', ['Biên bản kiểm tra tại cửa hàng', 'Kết quả kiểm tra của hãng hoặc nhà cung cấp', 'Ảnh hoặc video kiểm tra trước khi trả']],
  ],
  can_cu_so_huu: [
    ['Chứng từ xác nhận', ['Biên bản giao nhận', 'Biên bản xác nhận chuyển quyền sở hữu', 'Chứng từ đối soát với nhà cung cấp']],
  ],
  huong_xu_ly_thiet_bi_cu: [
    ['Luân chuyển thiết bị', ['Trả lại khách', 'Giữ tại cửa hàng để đối chiếu', 'Nhập kho chờ xử lý', 'Gửi lại hãng hoặc nhà cung cấp']],
    ['Xử lý tiếp', ['Sửa để tái sử dụng', 'Thu hồi linh kiện còn dùng được', 'Thanh lý theo phê duyệt', 'Chuyển xử lý rác thải điện tử']],
  ],
  quyet_dinh_xu_ly: [
    ['Đối soát với đơn vị', ['Đề nghị đơn vị xem xét lại', 'Bổ sung hồ sơ hoặc chứng từ', 'Chuyển đơn vị khác xác minh', 'Chốt phương án xử lý tại cửa hàng']],
  ],
  noi_dung_yeu_cau: [
    ['Xác minh bảo hành', ['Xác minh điều kiện bảo hành', 'Kiểm tra lỗi khách báo', 'Đối chiếu serial và tình trạng thiết bị']],
    ['Xử lý tại đơn vị', ['Đề nghị sửa chữa', 'Đề nghị đổi thiết bị hoặc linh kiện', 'Báo chi phí trước khi xử lý', 'Xác nhận thời gian trả dự kiến']],
  ],
};

export function actionPickerOptions(operation, field) {
  if (operation.key === 'GHI_KET_LUAN') return inspectionOptions[field];
  if (field === 'ly_do') {
    return actionReasons[operation.key] ?? actionReasons[operation.group] ?? inspectionOptions.ly_do;
  }
  return actionOptions[field];
}
