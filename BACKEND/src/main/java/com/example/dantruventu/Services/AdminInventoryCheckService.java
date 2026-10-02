package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckCancelRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckCreateRequest;
import com.example.dantruventu.DTO.Request.warehouse.AdminInventoryCheckUpdateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckBalanceResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckCancelResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckCreateResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckDetailResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckListItemResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckProductItemResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckProductListResponse;
import com.example.dantruventu.DTO.Response.warehouse.AdminInventoryCheckUpdateResponse;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.PhieuKiemKho;
import com.example.dantruventu.Entity.TheKho;
import com.example.dantruventu.Entity.TonKho;
import com.example.dantruventu.Enum.LoaiGiaoDichKho;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiPhieuKiemKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.AdminInventoryCheckProductRepository;
import com.example.dantruventu.Repository.warehouse.PhieuKiemKhoRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Repository.warehouse.TonKhoRepository;
import com.example.dantruventu.Specification.PhieuKiemKhoSpecification;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminInventoryCheckService {

  private static final DateTimeFormatter CODE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

  private final AdminInventoryCheckProductRepository productSearchRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final TonKhoRepository stockRepository;
  private final PhieuKiemKhoRepository inventoryCheckRepository;
  private final NguoiDungRepository userRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final TheKhoRepository stockCardRepository;

  @Value("${ruventu.inventory.time-zone:Asia/Ho_Chi_Minh}")
  private String inventoryTimeZone;

  public AdminInventoryCheckProductListResponse searchProducts(
      String keyword, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);

    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    var result =
        productSearchRepository.searchActiveProducts(
            normalizedKeyword, TrangThaiCoBanEnum.HOAT_DONG, PageRequest.of(page, limit));

    return AdminInventoryCheckProductListResponse.builder()
        .items(
            result.getContent().stream()
                .map(
                    item ->
                        AdminInventoryCheckProductItemResponse.builder()
                            .phienBanId(item.getPhienBanId())
                            .maSanPham(item.getMaSanPham())
                            .tenSanPham(item.getTenSanPham())
                            .tenPhienBan(item.getTenPhienBan())
                            .maVach(item.getMaVach())
                            .tonHeThong(item.getTonHeThong() == null ? 0L : item.getTonHeThong())
                            .build())
                .toList())
        .pagination(toPagination(result))
        .build();
  }

  public AdminInventoryCheckListResponse getInventoryChecks(
      String keyword,
      TrangThaiPhieuKiemKho status,
      Long checkerId,
      LocalDate fromDate,
      LocalDate toDate,
      int page,
      int limit,
      String sort) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    if (checkerId != null && checkerId <= 0) {
      throw invalid("nguoi_kiem_id phải là số nguyên dương");
    }

    if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
      throw invalid("from_date không được sau to_date");
    }

    LocalDateTime fromDateTime = fromDate == null ? null : fromDate.atStartOfDay();
    LocalDateTime toExclusiveDateTime = toDate == null ? null : toDate.plusDays(1).atStartOfDay();

    var result =
        inventoryCheckRepository.findAll(
            PhieuKiemKhoSpecification.build(
                normalizedKeyword, status, checkerId, fromDateTime, toExclusiveDateTime),
            PageRequest.of(page, limit, parseSort(sort)));

    return AdminInventoryCheckListResponse.builder()
        .items(result.getContent().stream().map(this::toListItem).toList())
        .pagination(toPagination(result))
        .build();
  }

  public AdminInventoryCheckDetailResponse getDetail(Long id) {
    validateId(id);

    PhieuKiemKho inventoryCheck =
        inventoryCheckRepository
            .findDetailById(id)
            .orElseThrow(() -> notFound("Không tìm thấy phiếu kiểm hàng"));

    return toDetailResponse(inventoryCheck);
  }

  @Transactional
  public AdminInventoryCheckUpdateResponse update(
      Long id, AdminInventoryCheckUpdateRequest request, Long actorId) {

    validateId(id);

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    Integer actualStock = request.getTonThucTe();
    String reason = requireText(request.getLyDo(), "Lý do kiểm hàng không được để trống");

    if (actualStock == null || actualStock < 0) {
      throw invalid("Tồn thực tế không được âm");
    }

    if (reason.length() > 255) {
      throw invalid("Lý do kiểm hàng tối đa 255 ký tự");
    }

    PhieuKiemKho inventoryCheck =
        inventoryCheckRepository
            .findByIdForInventoryCheckUpdate(id)
            .orElseThrow(() -> notFound("Không tìm thấy phiếu kiểm hàng"));

    ensureEditable(inventoryCheck);

    int difference;
    try {
      difference = Math.subtractExact(actualStock, inventoryCheck.getTonHeThong());
    } catch (ArithmeticException exception) {
      throw invalid("Số lượng tồn kho vượt giới hạn cho phép");
    }

    inventoryCheck.setTonThucTe(actualStock);
    inventoryCheck.setSoLuongChenhLech(difference);
    inventoryCheck.setLyDo(reason);

    inventoryCheck = inventoryCheckRepository.saveAndFlush(inventoryCheck);
    return toUpdateResponse(inventoryCheck);
  }

  @Transactional
  public AdminInventoryCheckCancelResponse cancel(
      Long id, AdminInventoryCheckCancelRequest request, Long actorId) {

    validateId(id);

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    String cancelReason = requireText(request.getLyDo(), "Lý do hủy không được để trống");
    if (cancelReason.length() > 255) {
      throw invalid("Lý do hủy tối đa 255 ký tự");
    }

    PhieuKiemKho inventoryCheck =
        inventoryCheckRepository
            .findByIdForInventoryCheckUpdate(id)
            .orElseThrow(() -> notFound("Không tìm thấy phiếu kiểm hàng"));

    ensureCancellable(inventoryCheck);

    inventoryCheck.setLyDo(cancelReason);
    inventoryCheck.setTrangThai(TrangThaiPhieuKiemKho.DA_HUY);
    inventoryCheck = inventoryCheckRepository.saveAndFlush(inventoryCheck);

    return AdminInventoryCheckCancelResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .trangThai(inventoryCheck.getTrangThai())
        .build();
  }

  @Transactional
  public AdminInventoryCheckBalanceResponse balance(Long id, Long actorId) {
    validateId(id);

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    PhieuKiemKho inventoryCheck =
        inventoryCheckRepository
            .findByIdForInventoryCheckUpdate(id)
            .orElseThrow(() -> notFound("Không tìm thấy phiếu kiểm hàng"));

    ensureBalanceable(inventoryCheck);

    Long variantId = inventoryCheck.getPhienBan().getId();
    List<TonKho> stockRows = stockRepository.findAllByPhienBanIdForInventoryCheckUpdate(variantId);

    if (stockRows.isEmpty()) {
      throw conflict("Dữ liệu tồn kho của phiên bản không còn tồn tại");
    }

    if (stockRows.size() != 1) {
      throw conflict("Phiên bản phải có đúng một bản ghi tồn kho để thực hiện cân bằng");
    }

    TonKho stock = stockRows.getFirst();
    int oldPhysical = requiredStock(stock.getTonThucTe(), "Tồn thực tế hiện tại không hợp lệ");

    if (oldPhysical != inventoryCheck.getTonHeThong()) {
      throw conflict("Tồn kho đã thay đổi từ khi tạo phiếu kiểm hàng");
    }

    int newPhysical = inventoryCheck.getTonThucTe();
    int difference;
    try {
      difference = Math.subtractExact(newPhysical, oldPhysical);
    } catch (ArithmeticException exception) {
      throw conflict("Số lượng tồn kho vượt giới hạn cho phép");
    }

    if (difference != inventoryCheck.getSoLuongChenhLech()) {
      throw conflict("Số lượng chênh lệch trên phiếu kiểm hàng không nhất quán");
    }

    if (difference != 0 && serialRepository.countByPhienBanId(variantId) > 0) {
      throw conflict(
          "Phiên bản đang quản lý serial, cần đối chiếu serial trước khi cân bằng chênh lệch");
    }

    if (stockCardRepository.existsByMaChungTuGocAndLoaiGiaoDich(
        inventoryCheck.getId(), LoaiGiaoDichKho.KIEM_KHO)) {
      throw conflict("Phiếu kiểm hàng đã được ghi nhận vào thẻ kho");
    }

    int available = requiredStock(stock.getTonCoTheBan(), "Tồn có thể bán hiện tại không hợp lệ");
    int damaged = requiredStock(stock.getHangLoi(), "Số lượng hàng lỗi hiện tại không hợp lệ");
    long held = (long) oldPhysical - damaged - available;

    if (damaged > oldPhysical || held < 0) {
      throw conflict("Số liệu tồn kho hiện tại không nhất quán, cần đối soát trước khi cân bằng");
    }

    long calculatedAvailable = (long) newPhysical - damaged - held;
    int newAvailable =
        calculatedAvailable <= 0
            ? 0
            : calculatedAvailable > Integer.MAX_VALUE
                ? Integer.MAX_VALUE
                : (int) calculatedAvailable;

    stock.setTonThucTe(newPhysical);
    stock.setTonCoTheBan(newAvailable);
    stockRepository.saveAndFlush(stock);

    TheKho stockCard =
        TheKho.builder()
            .khoHang(stock.getKhoHang())
            .phienBan(inventoryCheck.getPhienBan())
            .loaiGiaoDich(LoaiGiaoDichKho.KIEM_KHO)
            .maChungTuGoc(inventoryCheck.getId())
            .soLuongThayDoi(difference)
            .tonCuoi(newPhysical)
            .ghiChu("Cân bằng theo phiếu kiểm hàng " + inventoryCheck.getMaPhieu())
            .build();
    stockCardRepository.saveAndFlush(stockCard);

    inventoryCheck.setTrangThai(TrangThaiPhieuKiemKho.DA_CAN_BANG);
    inventoryCheckRepository.saveAndFlush(inventoryCheck);

    return AdminInventoryCheckBalanceResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .phienBanId(variantId)
        .trangThai(inventoryCheck.getTrangThai())
        .tonCu(oldPhysical)
        .tonMoi(newPhysical)
        .soLuongThayDoi(difference)
        .build();
  }

  @Transactional
  public AdminInventoryCheckCreateResponse create(
      AdminInventoryCheckCreateRequest request, Long actorId) {

    if (actorId == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Không xác định được người thao tác");
    }

    Long variantId = request.getPhienBanId();
    Integer actualStock = request.getTonThucTe();
    String reason = requireText(request.getLyDo(), "Lý do kiểm hàng không được để trống");

    if (variantId == null || variantId <= 0) {
      throw invalid("Phiên bản sản phẩm không hợp lệ");
    }

    if (actualStock == null || actualStock < 0) {
      throw invalid("Tồn thực tế không được âm");
    }

    if (reason.length() > 255) {
      throw invalid("Lý do kiểm hàng tối đa 255 ký tự");
    }

    NguoiDung actor =
        userRepository
            .findById(actorId)
            .orElseThrow(
                () -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy người thao tác"));

    PhienBanSanPham variant =
        variantRepository
            .findById(variantId)
            .orElseThrow(() -> notFound("Phiên bản sản phẩm không tồn tại"));

    if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
        || variant.getSanPham().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw notFound("Phiên bản sản phẩm không tồn tại hoặc đã ngừng hoạt động");
    }

    List<TonKho> stockRows = stockRepository.findAllByPhienBanIdForInventoryCheckUpdate(variantId);

    if (stockRows.isEmpty()) {
      throw notFound("Chưa có dữ liệu tồn kho của phiên bản sản phẩm");
    }

    if (inventoryCheckRepository.existsByPhienBan_IdAndTrangThai(
        variantId, TrangThaiPhieuKiemKho.DANG_KIEM)) {
      throw conflict("Phiên bản sản phẩm đã có phiếu kiểm hàng đang kiểm");
    }

    int systemStock = sumSystemStock(stockRows);
    int difference;

    try {
      difference = Math.subtractExact(actualStock, systemStock);
    } catch (ArithmeticException exception) {
      throw invalid("Số lượng tồn kho vượt giới hạn cho phép");
    }

    PhieuKiemKho inventoryCheck =
        PhieuKiemKho.builder()
            .maPhieu("TMP-PKK-" + UUID.randomUUID())
            .nguoiKiem(actor)
            .phienBan(variant)
            .tonHeThong(systemStock)
            .tonThucTe(actualStock)
            .soLuongChenhLech(difference)
            .lyDo(reason)
            .trangThai(TrangThaiPhieuKiemKho.DANG_KIEM)
            .build();

    inventoryCheck = inventoryCheckRepository.saveAndFlush(inventoryCheck);
    inventoryCheck.setMaPhieu(buildInventoryCheckCode(inventoryCheck.getId()));
    inventoryCheck = inventoryCheckRepository.saveAndFlush(inventoryCheck);

    return toCreateResponse(inventoryCheck);
  }

  private AdminInventoryCheckListItemResponse toListItem(PhieuKiemKho inventoryCheck) {
    PhienBanSanPham variant = inventoryCheck.getPhienBan();
    NguoiDung checker = inventoryCheck.getNguoiKiem();

    return AdminInventoryCheckListItemResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .phienBan(
            AdminInventoryCheckListItemResponse.VariantData.builder()
                .id(variant.getId())
                .maSanPham(variant.getSanPham().getMaSanPham())
                .tenSanPham(variant.getSanPham().getTenSanPham())
                .tenPhienBan(variant.getTenPhienBan())
                .build())
        .nguoiKiem(
            AdminInventoryCheckListItemResponse.CheckerData.builder()
                .id(checker.getId())
                .hoTen(checker.getHoTen())
                .build())
        .tonHeThong(inventoryCheck.getTonHeThong())
        .tonThucTe(inventoryCheck.getTonThucTe())
        .soLuongChenhLech(inventoryCheck.getSoLuongChenhLech())
        .trangThai(inventoryCheck.getTrangThai())
        .ngayTao(inventoryCheck.getNgayTao())
        .build();
  }

  private AdminInventoryCheckCreateResponse toCreateResponse(PhieuKiemKho inventoryCheck) {
    PhienBanSanPham variant = inventoryCheck.getPhienBan();

    return AdminInventoryCheckCreateResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .phienBanId(variant.getId())
        .maSanPham(variant.getSanPham().getMaSanPham())
        .tenSanPham(variant.getSanPham().getTenSanPham())
        .tenPhienBan(variant.getTenPhienBan())
        .tonHeThong(inventoryCheck.getTonHeThong())
        .tonThucTe(inventoryCheck.getTonThucTe())
        .soLuongChenhLech(inventoryCheck.getSoLuongChenhLech())
        .lyDo(inventoryCheck.getLyDo())
        .trangThai(inventoryCheck.getTrangThai())
        .ngayTao(inventoryCheck.getNgayTao())
        .build();
  }

  private AdminInventoryCheckDetailResponse toDetailResponse(PhieuKiemKho inventoryCheck) {
    PhienBanSanPham variant = inventoryCheck.getPhienBan();
    NguoiDung checker = inventoryCheck.getNguoiKiem();

    return AdminInventoryCheckDetailResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .nguoiKiem(
            AdminInventoryCheckDetailResponse.CheckerData.builder()
                .id(checker.getId())
                .hoTen(checker.getHoTen())
                .build())
        .phienBan(
            AdminInventoryCheckDetailResponse.VariantData.builder()
                .id(variant.getId())
                .maSanPham(variant.getSanPham().getMaSanPham())
                .tenSanPham(variant.getSanPham().getTenSanPham())
                .tenPhienBan(variant.getTenPhienBan())
                .maVach(variant.getMaVach())
                .build())
        .tonHeThong(inventoryCheck.getTonHeThong())
        .tonThucTe(inventoryCheck.getTonThucTe())
        .soLuongChenhLech(inventoryCheck.getSoLuongChenhLech())
        .lyDo(inventoryCheck.getLyDo())
        .trangThai(inventoryCheck.getTrangThai())
        .ngayTao(inventoryCheck.getNgayTao())
        .build();
  }

  private AdminInventoryCheckUpdateResponse toUpdateResponse(PhieuKiemKho inventoryCheck) {
    return AdminInventoryCheckUpdateResponse.builder()
        .id(inventoryCheck.getId())
        .maPhieu(inventoryCheck.getMaPhieu())
        .tonHeThong(inventoryCheck.getTonHeThong())
        .tonThucTe(inventoryCheck.getTonThucTe())
        .soLuongChenhLech(inventoryCheck.getSoLuongChenhLech())
        .lyDo(inventoryCheck.getLyDo())
        .trangThai(inventoryCheck.getTrangThai())
        .ngayTao(inventoryCheck.getNgayTao())
        .build();
  }

  private void ensureEditable(PhieuKiemKho inventoryCheck) {
    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_CAN_BANG) {
      throw conflict("Phiếu kiểm hàng đã cân bằng, không thể chỉnh sửa");
    }

    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_HUY) {
      throw conflict("Phiếu kiểm hàng đã hủy, không thể chỉnh sửa");
    }

    if (inventoryCheck.getTrangThai() != TrangThaiPhieuKiemKho.DANG_KIEM) {
      throw conflict("Trạng thái phiếu kiểm hàng không cho phép chỉnh sửa");
    }
  }

  private void ensureCancellable(PhieuKiemKho inventoryCheck) {
    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_CAN_BANG) {
      throw conflict("Phiếu kiểm hàng đã cân bằng, không thể hủy");
    }

    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_HUY) {
      throw conflict("Phiếu kiểm hàng đã hủy");
    }

    if (inventoryCheck.getTrangThai() != TrangThaiPhieuKiemKho.DANG_KIEM) {
      throw conflict("Trạng thái phiếu kiểm hàng không cho phép hủy");
    }
  }

  private void ensureBalanceable(PhieuKiemKho inventoryCheck) {
    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_CAN_BANG) {
      throw conflict("Phiếu kiểm hàng đã cân bằng");
    }

    if (inventoryCheck.getTrangThai() == TrangThaiPhieuKiemKho.DA_HUY) {
      throw conflict("Phiếu kiểm hàng đã hủy, không thể cân bằng");
    }

    if (inventoryCheck.getTrangThai() != TrangThaiPhieuKiemKho.DANG_KIEM) {
      throw conflict("Trạng thái phiếu kiểm hàng không cho phép cân bằng");
    }
  }

  private int requiredStock(Integer value, String message) {
    if (value == null || value < 0) {
      throw conflict(message);
    }
    return value;
  }

  private PaginationResponse toPagination(org.springframework.data.domain.Page<?> page) {
    return PaginationResponse.builder()
        .page(page.getNumber())
        .limit(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .build();
  }

  private Sort parseSort(String value) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      normalized = "ngay_tao,desc";
    }

    String[] parts = normalized.split(",", -1);
    if (parts.length != 2 || !"ngay_tao".equals(parts[0].trim().toLowerCase(Locale.ROOT))) {
      throw invalid("sort chỉ hỗ trợ ngay_tao,asc hoặc ngay_tao,desc");
    }

    Sort.Direction direction;
    try {
      direction = Sort.Direction.fromString(parts[1].trim());
    } catch (IllegalArgumentException exception) {
      throw invalid("sort chỉ hỗ trợ ngay_tao,asc hoặc ngay_tao,desc");
    }

    return Sort.by(direction, "ngayTao").and(Sort.by(direction, "id"));
  }

  private int sumSystemStock(List<TonKho> stockRows) {
    int total = 0;

    try {
      for (TonKho stock : stockRows) {
        total = Math.addExact(total, stock.getTonThucTe() == null ? 0 : stock.getTonThucTe());
      }
    } catch (ArithmeticException exception) {
      throw invalid("Số lượng tồn kho vượt giới hạn cho phép");
    }

    return total;
  }

  private String buildInventoryCheckCode(Long id) {
    String date = LocalDate.now(ZoneId.of(inventoryTimeZone)).format(CODE_DATE_FORMAT);
    return "PKK-" + date + "-" + String.format("%03d", id);
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID phiếu kiểm hàng không hợp lệ");
    }
  }

  private String requireText(String value, String message) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      throw invalid(message);
    }
    return normalized;
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }

    String normalized = value.trim();
    return normalized.isEmpty() ? null : normalized;
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException notFound(String message) {
    return new AppException(ErrorCode.NOT_FOUND, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }
}
