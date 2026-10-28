package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.warehouse.AdminSerialStatusRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialDeleteBlockedResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminSerialStatusResponse;
import com.example.dantruventu.Entity.PhieuKiemKho;
import com.example.dantruventu.Entity.SoSerialSanPham;
import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.warehouse.SoSerialSanPhamMapper;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.warehouse.*;
import com.example.dantruventu.Services.warehouse.NccAccountingService;
import com.example.dantruventu.Services.warehouse.WarehouseSupport;
import com.example.dantruventu.Specification.SoSerialSanPhamSpecification;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSerialService {

  private final SoSerialSanPhamRepository serialRepository;
  private final TonKhoRepository tonKhoRepository;
  private final PhieuKiemKhoRepository phieuKiemKhoRepository;
  private final TheKhoRepository theKhoRepository;
  private final NguoiDungRepository nguoiDungRepository;
  private final SoSerialSanPhamMapper serialMapper;
  private final KhoHangRepository khoHangRepository;
  private final WarehouseSupport warehouseSupport;
  private final NccAccountingService nccAccounting;

  private final EntityManager entityManager;

  private record WarrantyDates(LocalDateTime activatedAt, LocalDateTime expiresAt) {}

  private Map<Long, WarrantyDates> warrantyDates(List<SoSerialSanPham> serials) {

    Map<Long, WarrantyDates> result = new HashMap<>();

    for (var serial : serials) {
      result.put(
          serial.getId(), new WarrantyDates(serial.getNgayKichHoat(), serial.getHanBaoHanh()));
    }

    if (serials.isEmpty()) return result;

    var rows =
        entityManager
            .createQuery(
                """
      select d.soSerial.id, d.ngayKichHoat, d.hanBaoHanh
      from ThietBiBaoHanh d
      join d.soSerial s
      where s.id in :ids
        and s.donHang.id = d.chiTietDonHang.donHang.id
      order by d.id desc
      """,
                Object[].class)
            .setParameter("ids", serials.stream().map(SoSerialSanPham::getId).toList())
            .getResultList();

    var seen = new HashSet<Long>();

    for (var row : rows) {
      Long serialId = (Long) row[0];

      if (seen.add(serialId)) {
        result.put(serialId, new WarrantyDates((LocalDateTime) row[1], (LocalDateTime) row[2]));
      }
    }

    return result;
  }

  @Value("${ruventu.inventory.time-zone:Asia/Ho_Chi_Minh}")
  private String inventoryTimeZone;

  @Value("${ruventu.inventory.default-warehouse-id:1}")
  private Long inventoryWarehouseId;

  public AdminSerialListResponse getSerials(
      String keyword,
      String soSerial,
      TrangThaiSerial trangThai,
      Long phienBanId,
      int page,
      int limit) {

    validatePagination(page, limit);

    if (phienBanId != null && phienBanId <= 0) {
      throw invalid("phien_ban_id phải là số nguyên dương");
    }

    String normalizedKeyword = normalizeOptional(keyword);
    String exactSerial = normalizeOptional(soSerial);

    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    if (soSerial != null && exactSerial == null) {
      throw invalid("so_serial không được để trống khi truyền bộ lọc");
    }

    if (exactSerial != null && exactSerial.length() > 100) {
      throw invalid("Số serial tối đa 100 ký tự");
    }

    var pageable = PageRequest.of(page, limit, Sort.by("id").descending());

    var result =
        serialRepository.findAll(
            SoSerialSanPhamSpecification.build(
                normalizedKeyword, exactSerial, trangThai, phienBanId),
            pageable);

    ZoneId zoneId = ZoneId.of(inventoryTimeZone);

    var dates = warrantyDates(result.getContent());

    return AdminSerialListResponse.builder()
        .items(
            result.getContent().stream()
                .map(
                    serial -> {
                      var response = serialMapper.toListItem(serial, zoneId);
                      var warranty = dates.get(serial.getId());

                      response.setNgayKichHoat(
                          warranty.activatedAt() == null
                              ? null
                              : warranty.activatedAt().atZone(zoneId).toOffsetDateTime());

                      response.setHanBaoHanh(
                          warranty.expiresAt() == null
                              ? null
                              : warranty.expiresAt().atZone(zoneId).toOffsetDateTime());

                      return response;
                    })
                .toList())
        .pagination(
            PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  public AdminSerialDetailResponse getDetail(Long id) {
    validateId(id);

    var serial = serialRepository.findById(id).orElseThrow(this::notFound);

    ZoneId zone = ZoneId.of(inventoryTimeZone);
    var response = serialMapper.toDetail(serial, zone);
    var warranty = warrantyDates(List.of(serial)).get(serial.getId());

    response.setNgayKichHoat(
        warranty.activatedAt() == null
            ? null
            : warranty.activatedAt().atZone(zone).toOffsetDateTime());

    response.setHanBaoHanh(
        warranty.expiresAt() == null ? null : warranty.expiresAt().atZone(zone).toOffsetDateTime());

    response.setXuLyNcc(nccAccounting.serialHistory(id));

    return response;
  }

  @Transactional
  public AdminSerialStatusResponse updateStatus(
      Long id, AdminSerialStatusRequest request, Long actorId) {

    validateId(id);

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    TrangThaiSerial target = request.getTrangThai();

    if (target == null) {
      throw invalid("Trạng thái không được để trống");
    }

    if (!isWarehouseState(target)) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "API này chỉ cho phép chuyển TRONG_KHO ↔ LOI");
    }

    String reason = normalizeOptional(request.getLyDo());

    if (reason == null || reason.length() > 150) {
      throw invalid("Lý do bắt buộc và tối đa 150 ký tự");
    }

    /*
     * Chỉ đọc ID phiên bản, chưa nạp entity serial.
     * Serial sẽ được nạp và kiểm tra lại sau khi khóa tồn.
     */
    Long variantId = serialRepository.findPhienBanIdBySerialId(id).orElseThrow(this::notFound);

    var configuredVariant = warehouseSupport.lockVariant(variantId);

    if (!Boolean.TRUE.equals(configuredVariant.getCoQuanLySerial())) {

      throw conflict("Phiên bản không được cấu hình quản lý serial");
    }

    Long warehouseId = requireSingleWarehouseId();

    // Khóa tồn kho trước.
    var stockRows = tonKhoRepository.findForSerialUpdate(warehouseId, variantId);

    if (stockRows.size() != 1) {
      throw conflict(
          "Phiên bản phải có đúng một bản ghi tồn tại kho được cấu hình. "
              + "Vui lòng kiểm tra dữ liệu tồn kho");
    }

    TonKho stock = stockRows.get(0);

    // Sau đó khóa serial.
    SoSerialSanPham serial = serialRepository.findByIdForUpdate(id).orElseThrow(this::notFound);

    if (!Objects.equals(variantId, serial.getPhienBan().getId())) {

      throw conflict("Phiên bản của serial vừa thay đổi, vui lòng tải lại dữ liệu");
    }

    if (serial.getChiTietDongGoi() != null) {
      throw conflict(
          "Serial đang giữ để đóng gói. "
              + "Hãy đổi mã hoặc hủy đóng gói trước khi sửa trạng thái.");
    }

    if (serial.getDonHang() != null) {
      throw conflict(
          "Serial đang liên kết với đơn hàng, "
              + "không được sửa bằng nghiệp vụ hàng lỗi trong kho");
    }

    if (nccAccounting.pendingSerial(serial.getId())) {
      throw conflict(
          "Serial còn đang xử lý trong hồ sơ Nhà Cung Cấp. "
              + "Hãy hoàn tất kiểm tra hoặc đối soát trong hồ sơ.");
    }

    TrangThaiSerial source = serial.getTrangThai();

    if (!isWarehouseState(source)) {
      throw conflict("Chỉ được sửa serial đang TRONG_KHO hoặc LOI");
    }

    if (source == target) {
      throw conflict("Serial đã ở trạng thái yêu cầu, không ghi nhận lặp");
    }

    if (serial.getPhienBan().getSanPham().getLoaiSanPham() != LoaiSanPham.DON) {

      throw conflict("Serial vật lý phải thuộc phiên bản sản phẩm đơn");
    }

    var stockNumbers = WarehouseSupport.numbers(stock);

    int physical = stockNumbers.actual();
    int available = stockNumbers.available();
    int damaged = stockNumbers.damaged();

    if (physical <= 0) {
      throw conflict("Kho không có hàng thực tế tương ứng với serial");
    }

    if (target == TrangThaiSerial.LOI) {
      if (available < 1) {
        throw conflict(
            "Không còn tồn khả dụng để chuyển lỗi; " + "thao tác sẽ ảnh hưởng phần hàng đang giữ");
      }

      stock.setHangLoi(damaged + 1);
      stock.setTonCoTheBan(available - 1);
    } else {
      if (damaged < 1) {
        throw conflict("Kho không có số lượng hàng lỗi tương ứng để phục hồi");
      }

      stock.setHangLoi(damaged - 1);
      stock.setTonCoTheBan(available + 1);
    }

    serial.setTrangThai(target);

    String note =
        "UC018 serial_id=" + id + " " + source.name() + "->" + target.name() + ": " + reason;

    PhieuKiemKho check =
        PhieuKiemKho.builder()
            .maPhieu(
                "KK-SN-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT))
            .nguoiKiem(nguoiDungRepository.getReferenceById(actorId))
            .phienBan(serial.getPhienBan())
            .tonHeThong(physical)
            .tonThucTe(physical)
            .soLuongChenhLech(0)
            .lyDo(note)
            .trangThai(TrangThaiPhieuKiemKho.DA_CAN_BANG)
            .build();

    check = phieuKiemKhoRepository.save(check);

    TheKho ledger =
        TheKho.builder()
            .khoHang(stock.getKhoHang())
            .phienBan(serial.getPhienBan())
            .loaiGiaoDich(LoaiGiaoDichKho.KIEM_KHO)
            .maChungTuGoc(check.getId())
            .soLuongThayDoi(0)
            .tonCuoi(physical)
            .ghiChu(note)
            .build();

    /*
     * Serial và stock là entity được quản lý trong transaction.
     * Flush sẽ lưu cả thay đổi serial, tồn kho, phiếu và thẻ kho.
     * Bất kỳ lỗi ghi dữ liệu nào đều rollback cả transaction.
     */
    theKhoRepository.saveAndFlush(ledger);

    return serialMapper.toStatus(serial);
  }

  public AdminSerialDeleteBlockedResponse blockDelete(Long id) {
    validateId(id);

    if (!serialRepository.existsById(id)) {
      throw notFound();
    }

    return AdminSerialDeleteBlockedResponse.builder()
        .status(405)
        .message(
            "Dữ liệu Serial là hồ sơ lưu trữ vĩnh viễn, " + "không được phép xóa khỏi hệ thống.")
        .data(null)
        .build();
  }

  private boolean isWarehouseState(TrangThaiSerial value) {
    return value == TrangThaiSerial.TRONG_KHO || value == TrangThaiSerial.LOI;
  }

  private int requiredStock(Integer value, String field) {
    if (value == null) {
      throw conflict("Dữ liệu " + field + " chưa được khởi tạo");
    }

    return value;
  }

  private String normalizeOptional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID serial phải là số nguyên dương");
    }
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {

      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  private AppException notFound() {
    return new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy serial");
  }

  private Long requireSingleWarehouseId() {
    if (inventoryWarehouseId == null || inventoryWarehouseId <= 0) {
      throw conflict(
          "Chưa cấu hình kho cho nghiệp vụ serial. " + "Vui lòng thiết lập INVENTORY_WAREHOUSE_ID");
    }

    if (!khoHangRepository.existsById(inventoryWarehouseId)) {
      throw conflict("Kho được cấu hình không tồn tại");
    }

    /*
     * Kiểm tra toàn bộ kho, kể cả kho ngừng hoạt động.
     * Kho ngừng hoạt động vẫn có thể còn hàng hoặc dữ liệu cũ.
     */
    if (khoHangRepository.count() != 1L) {
      throw conflict(
          "Nghiệp vụ sửa trạng thái serial hiện chỉ hỗ trợ hệ thống một kho. "
              + "Không thể xác định vị trí từng serial khi có nhiều kho");
    }

    return inventoryWarehouseId;
  }
}
