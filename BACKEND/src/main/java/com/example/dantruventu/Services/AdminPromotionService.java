package com.example.dantruventu.Services;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionConfigurationCreateRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionCreateRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionStatusRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionUpdateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionCreateResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDeleteResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailLineResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListItemResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionMutationDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionMutationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantItemResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantListResponse;
import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import com.example.dantruventu.Entity.DanhMuc;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.ThuongHieu;
import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.example.dantruventu.Enum.LoaiChietKhau;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiApDungKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiHienThiKhuyenMai;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.PromotionErrorMessages;
import com.example.dantruventu.Repository.DanhMucRepository;
import com.example.dantruventu.Repository.ThuongHieuRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SalesQuoteService;
import com.example.dantruventu.Specification.KhuyenMaiSpecification;
import com.example.dantruventu.Specification.PhienBanKhuyenMaiSpecification;
import jakarta.validation.Validator;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPromotionService {

  private static final String COMPRESSED_RESPONSE_PREFIX = "gzip:";

  private record PromotionLineSignature(
      Long variantId, LoaiApDungKhuyenMai applicationType, Integer quantity) {}

  private final AdminPromotionRepository adminPromotionRepository;
  private final AdminPromotionDetailRepository adminPromotionDetailRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final SalesProperties salesProperties;
  private final DanhMucRepository categoryRepository;
  private final ThuongHieuRepository brandRepository;
  private final CatalogSupport catalogSupport;
  private final SalesContext salesContext;
  private final SalesIdempotencyRepository idempotencyRepository;
  private final ObjectMapper objectMapper;
  private final Validator validator;

  private record UpdateFingerprint(Long id, AdminPromotionUpdateRequest request) {}

  private static final List<String> RULE_FIELDS =
      List.of(
          "ma_chuong_trinh",
          "phuong_thuc_khuyen_mai",
          "doi_tuong_khuyen_mai",
          "loai_chiet_khau",
          "gia_tri_khuyen_mai",
          "gia_tri_hang_toi_thieu",
          "so_luong_mua_toi_thieu",
          "muc_giam_toi_da",
          "danh_muc_id",
          "thuong_hieu_id",
          "ngay_bat_dau",
          "chi_tiet_khuyen_mai");

  private record PromotionLineKey(Long variantId, LoaiApDungKhuyenMai applicationType) {}

  @Transactional
  public AdminPromotionCreateResponse createPromotion(
      String requestKey, AdminPromotionConfigurationCreateRequest request) {
    Long actorId = salesContext.actor().getId();
    String storageKey = "PROMO:CREATE:" + SalesQuoteService.uuid(requestKey);
    String hash = hashRequest(request);
    var entry = idempotencyRepository.acquire(storageKey, actorId, hash);
    if (!Objects.equals(entry.actorId(), actorId) || !hash.equals(entry.requestHash())) {
      throw conflict(
          "Yêu cầu này đã được dùng cho nội dung khác. Vui lòng tải lại trang và thử lại.");
    }
    if (entry.responseJson() != null) {
      return objectMapper
          .readerFor(AdminPromotionCreateResponse.class)
          .without(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
          .readValue(decodeResponse(entry.responseJson()));
    }

    AdminPromotionCreateResponse response = savePromotion(request);
    idempotencyRepository.complete(storageKey, encodeResponse(response));
    return response;
  }

  private AdminPromotionCreateResponse savePromotion(
      AdminPromotionConfigurationCreateRequest request) {
    String code =
        requireText(request.getMaChuongTrinh(), "Mã chương trình không được để trống")
            .toUpperCase(Locale.ROOT);
    String name = requireText(request.getTenChuongTrinh(), "Tên chương trình không được để trống");

    if (code.length() > 50) {
      throw invalid("Mã chương trình tối đa 50 ký tự");
    }
    if (name.length() > 150) {
      throw invalid("Tên chương trình tối đa 150 ký tự");
    }

    LocalDateTime start =
        request.getNgayBatDau().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();
    LocalDateTime end =
        request.getNgayKetThuc().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();
    if (!start.isBefore(end)) {
      throw invalid("Ngày bắt đầu phải trước ngày kết thúc");
    }

    BigDecimal minimumAmount =
        Objects.requireNonNullElse(request.getGiaTriHangToiThieu(), BigDecimal.ZERO);
    int minimumQuantity = Objects.requireNonNullElse(request.getSoLuongMuaToiThieu(), 0);
    validateCreationConfiguration(request);

    if (adminPromotionRepository.existsByMaChuongTrinhIgnoreCase(code)) {
      throw duplicatePromotionCode();
    }

    DanhMuc category = loadActiveCategory(request.getDanhMucId());
    ThuongHieu brand = loadActiveBrand(request.getThuongHieuId());

    var requestedLines = request.getChiTietKhuyenMai();
    Map<Long, PhienBanSanPham> variants = loadActiveVariants(requestedLines);
    KhuyenMai promotion =
        KhuyenMai.builder()
            .maChuongTrinh(code)
            .tenChuongTrinh(name)
            .phuongThucKhuyenMai(request.getPhuongThucKhuyenMai())
            .doiTuongKhuyenMai(request.getDoiTuongKhuyenMai())
            .soLuongApDung(request.getSoLuongApDung())
            .giaTriKhuyenMai(request.getGiaTriKhuyenMai())
            .loaiChietKhau(request.getLoaiChietKhau())
            .giaTriHangToiThieu(minimumAmount)
            .soLuongMuaToiThieu(minimumQuantity)
            .mucGiamToiDa(request.getMucGiamToiDa())
            .danhMuc(category)
            .thuongHieu(brand)
            .moTa(normalizeOptional(request.getMoTa()))
            .ngayBatDau(start)
            .ngayKetThuc(end)
            .trangThai(request.getTrangThai())
            .build();

    try {
      promotion = adminPromotionRepository.saveAndFlush(promotion);
    } catch (DataIntegrityViolationException exception) {
      if (exception.getMostSpecificCause() instanceof SQLException cause
          && cause.getErrorCode() == 1062) {
        throw duplicatePromotionCode();
      }
      throw exception;
    }

    List<ChiTietKhuyenMai> details = new ArrayList<>();
    for (AdminPromotionCreateRequest.PromotionLine line : requestedLines) {
      details.add(
          ChiTietKhuyenMai.builder()
              .khuyenMai(promotion)
              .phienBan(variants.get(line.getPhienBanId()))
              .loaiApDung(line.getLoaiApDung())
              .soLuong(line.getSoLuong())
              .build());
    }

    if (!details.isEmpty()) {
      details = adminPromotionDetailRepository.saveAllAndFlush(details);
    }

    var builder = AdminPromotionCreateResponse.builder();
    populateMutationResponse(promotion, details, builder);
    return builder
        .loaiChietKhau(promotion.getLoaiChietKhau())
        .giaTriHangToiThieu(promotion.getGiaTriHangToiThieu())
        .soLuongMuaToiThieu(promotion.getSoLuongMuaToiThieu())
        .mucGiamToiDa(promotion.getMucGiamToiDa())
        .danhMucId(request.getDanhMucId())
        .thuongHieuId(request.getThuongHieuId())
        .phienBanCauHinh(promotion.getPhienBanCauHinh())
        .soLuongDangGiu(0)
        .soLuongDaGiaiPhong(0)
        .coTheSuaCauHinh(true)
        .coTheXoa(true)
        .build();
  }

  private void validateCreationConfiguration(AdminPromotionConfigurationCreateRequest request) {
    var scope = request.getDoiTuongKhuyenMai();
    if ((scope == DoiTuongKhuyenMai.DANH_MUC) != (request.getDanhMucId() != null)
        || (scope == DoiTuongKhuyenMai.THUONG_HIEU) != (request.getThuongHieuId() != null)) {
      throw invalid("Danh mục hoặc thương hiệu phải khớp với đối tượng khuyến mại");
    }
    if (scope == DoiTuongKhuyenMai.LOAI_SAN_PHAM || scope == DoiTuongKhuyenMai.NHAN_HIEU) {
      throw invalid("Đối tượng khuyến mại không được hỗ trợ");
    }
    if (request.getTrangThai() == null) {
      throw invalid("Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.");
    }

    var lines = request.getChiTietKhuyenMai();
    Set<PromotionLineKey> lineKeys = new LinkedHashSet<>();
    boolean hasPurchase = false;
    boolean hasGift = false;
    for (var line : lines) {
      if (!lineKeys.add(new PromotionLineKey(line.getPhienBanId(), line.getLoaiApDung()))) {
        throw invalid("Phiên bản không được lặp cùng loại áp dụng trong chi tiết khuyến mại");
      }
      hasPurchase |= line.getLoaiApDung() == LoaiApDungKhuyenMai.SAN_PHAM_MUA;
      hasGift |= line.getLoaiApDung() == LoaiApDungKhuyenMai.SAN_PHAM_TANG;
    }

    LoaiChietKhau discountType = request.getLoaiChietKhau();
    BigDecimal discountValue = request.getGiaTriKhuyenMai();
    BigDecimal cap = request.getMucGiamToiDa();
    if (request.getPhuongThucKhuyenMai() == PhuongThucKhuyenMai.CHIET_KHAU) {
      if (discountType == null || discountValue == null) {
        throw invalid("Chiết khấu yêu cầu loại và giá trị khuyến mại");
      }
      if (discountType == LoaiChietKhau.PHAN_TRAM
          && discountValue.compareTo(BigDecimal.valueOf(100)) > 0) {
        throw invalid("Tỷ lệ chiết khấu không được vượt quá 100%");
      }
      if (discountType != LoaiChietKhau.PHAN_TRAM && cap != null) {
        throw invalid("Mức giảm tối đa chỉ áp dụng cho chiết khấu phần trăm");
      }
      if (hasGift || (scope == DoiTuongKhuyenMai.TUNG_SAN_PHAM) != hasPurchase) {
        throw invalid(
            "Chiết khấu từng sản phẩm cần dòng mua và các phạm vi khác không nhận chi tiết");
      }
      return;
    }

    if (discountType != null || discountValue != null || cap != null) {
      throw invalid("Tặng sản phẩm không nhận cấu hình chiết khấu");
    }
    if (scope != DoiTuongKhuyenMai.TONG_DON && scope != DoiTuongKhuyenMai.TUNG_SAN_PHAM) {
      throw invalid("Chỉ có thể tặng quà theo toàn đơn hoặc theo từng sản phẩm.");
    }
    if (!hasGift || (scope == DoiTuongKhuyenMai.TUNG_SAN_PHAM) != hasPurchase) {
      throw invalid("Cần dòng quà tặng và chỉ tặng theo từng sản phẩm mới nhận dòng mua");
    }
  }

  private String encodeResponse(Object response) {
    String json = objectMapper.writeValueAsString(response);
    byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
    // sales_idempotency.response_json uses MySQL TEXT, limited to 65,535 bytes.
    if (bytes.length <= 65_535) {
      return json;
    }
    var compressed = new ByteArrayOutputStream();
    try (var gzip = new GZIPOutputStream(compressed)) {
      gzip.write(bytes);
    } catch (IOException exception) {
      throw new UncheckedIOException("Không thể nén kết quả khuyến mại", exception);
    }
    return COMPRESSED_RESPONSE_PREFIX
        + Base64.getEncoder().encodeToString(compressed.toByteArray());
  }

  private String decodeResponse(String stored) {
    if (!stored.startsWith(COMPRESSED_RESPONSE_PREFIX)) {
      return stored;
    }
    byte[] bytes =
        Base64.getDecoder().decode(stored.substring(COMPRESSED_RESPONSE_PREFIX.length()));
    try (var gzip = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
      return new String(gzip.readAllBytes(), StandardCharsets.UTF_8);
    } catch (IOException exception) {
      throw new UncheckedIOException("Không thể đọc kết quả khuyến mại đã lưu", exception);
    }
  }

  private String hashRequest(Object request) {
    try {
      byte[] hash =
          MessageDigest.getInstance("SHA-256").digest(objectMapper.writeValueAsBytes(request));
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("Không thể tính dấu vân tay yêu cầu", exception);
    }
  }

  private AppException duplicatePromotionCode() {
    return new AppException(
        ErrorCode.CONFLICT,
        "ma_chuong_trinh",
        "PROMOTION_CODE_EXISTS",
        "Mã chương trình khuyến mại đã tồn tại");
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminPromotionDetailResponse updatePromotion(
      Long id, String requestKey, AdminPromotionUpdateRequest request) {
    validateId(id);
    if (request.getFields().isEmpty()) {
      throw invalid("Vui lòng thay đổi ít nhất một thông tin trước khi lưu.");
    }

    Long actorId = salesContext.actor().getId();
    String storageKey = "PROMO:PATCH:" + SalesQuoteService.uuid(requestKey);
    String hash = hashRequest(new UpdateFingerprint(id, request));
    var entry = idempotencyRepository.acquire(storageKey, actorId, hash);
    if (!Objects.equals(entry.actorId(), actorId) || !hash.equals(entry.requestHash())) {
      throw conflict(
          "Yêu cầu này đã được dùng cho nội dung khác. Vui lòng tải lại trang và thử lại.");
    }
    if (entry.responseJson() != null) {
      return objectMapper
          .readerFor(AdminPromotionDetailResponse.class)
          .without(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
          .readValue(decodeResponse(entry.responseJson()));
    }

    // Usage mutations lock this same program. READ_COMMITTED reads counts after that lock.
    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    if (!Objects.equals(promotion.getPhienBanCauHinh(), request.getConfirmedVersion())) {
      throw promotionConflict(
          "phien_ban_cau_hinh_xac_nhan",
          "PROMOTION_VERSION_CHANGED",
          "Cấu hình đã thay đổi, cần đọc lại và xác nhận");
    }

    List<ChiTietKhuyenMai> existingDetails =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);
    Map<TrangThaiApDungKhuyenMai, Long> usage = usageCounts(id);
    var current = configuration(promotion, existingDetails);
    var merged = mergeConfiguration(current, request);
    String changedRule = changedRule(current, merged);
    boolean hasLinks = !usage.isEmpty();

    if (hasLinks && changedRule != null) {
      throw promotionConflict(
          changedRule,
          "PROMOTION_RULE_LOCKED",
          "Chương trình đã có đơn liên kết, không được sửa quy tắc");
    }

    LocalDateTime start = merged.getNgayBatDau().toLocalDateTime();
    LocalDateTime end = merged.getNgayKetThuc().toLocalDateTime();
    if (!start.isBefore(end)) {
      throw promotionConflict(
          "ngay_ket_thuc", "PROMOTION_TIME_INVALID", "Ngày bắt đầu phải trước ngày kết thúc");
    }
    if (hasLinks && end.isBefore(promotion.getNgayKetThuc())) {
      throw promotionConflict(
          "ngay_ket_thuc",
          "PROMOTION_TIME_INVALID",
          "Chương trình đã có đơn liên kết, không được rút ngắn ngày kết thúc");
    }

    int used = Objects.requireNonNullElse(promotion.getSoLuongDaDung(), 0);
    long held = usage.getOrDefault(TrangThaiApDungKhuyenMai.GIU_CHO, 0L);
    Integer quota = merged.getSoLuongApDung();
    if (quota != null && quota < (long) used + held) {
      throw promotionConflict(
          "so_luong_ap_dung",
          "PROMOTION_QUOTA_TOO_LOW",
          "Hạn mức không được thấp hơn tổng lượt đã dùng và đang giữ");
    }
    if (adminPromotionRepository.existsByMaChuongTrinhIgnoreCaseAndIdNot(
        merged.getMaChuongTrinh(), id)) {
      throw duplicatePromotionCode();
    }

    boolean conditionsChanged =
        changedRule != null
            || !end.equals(promotion.getNgayKetThuc())
            || !Objects.equals(quota, promotion.getSoLuongApDung());
    if (conditionsChanged && promotion.getPhienBanCauHinh() == Integer.MAX_VALUE) {
      throw conflict("Chưa thể cập nhật chương trình. Vui lòng liên hệ quản trị viên.");
    }

    DanhMuc category = promotion.getDanhMuc();
    ThuongHieu brand = promotion.getThuongHieu();
    List<ChiTietKhuyenMai> responseDetails = existingDetails;
    if (changedRule != null) {
      category = loadActiveCategory(merged.getDanhMucId());
      brand = loadActiveBrand(merged.getThuongHieuId());
      Map<Long, PhienBanSanPham> variants = loadActiveVariants(merged.getChiTietKhuyenMai());
      if (!sameLines(current.getChiTietKhuyenMai(), merged.getChiTietKhuyenMai())) {
        adminPromotionDetailRepository.deleteAll(existingDetails);
        adminPromotionDetailRepository.flush();
        responseDetails = new ArrayList<>();
        for (var line : merged.getChiTietKhuyenMai()) {
          responseDetails.add(
              ChiTietKhuyenMai.builder()
                  .khuyenMai(promotion)
                  .phienBan(variants.get(line.getPhienBanId()))
                  .loaiApDung(line.getLoaiApDung())
                  .soLuong(line.getSoLuong())
                  .build());
        }
        if (!responseDetails.isEmpty()) {
          responseDetails = adminPromotionDetailRepository.saveAllAndFlush(responseDetails);
        }
      }
    }

    promotion.setMaChuongTrinh(merged.getMaChuongTrinh());
    promotion.setTenChuongTrinh(merged.getTenChuongTrinh());
    promotion.setMoTa(merged.getMoTa());
    promotion.setPhuongThucKhuyenMai(merged.getPhuongThucKhuyenMai());
    promotion.setDoiTuongKhuyenMai(merged.getDoiTuongKhuyenMai());
    promotion.setLoaiChietKhau(merged.getLoaiChietKhau());
    promotion.setGiaTriKhuyenMai(merged.getGiaTriKhuyenMai());
    promotion.setGiaTriHangToiThieu(merged.getGiaTriHangToiThieu());
    promotion.setSoLuongMuaToiThieu(merged.getSoLuongMuaToiThieu());
    promotion.setMucGiamToiDa(merged.getMucGiamToiDa());
    promotion.setDanhMuc(category);
    promotion.setThuongHieu(brand);
    promotion.setNgayBatDau(start);
    promotion.setNgayKetThuc(end);
    promotion.setSoLuongApDung(quota);
    if (conditionsChanged) {
      promotion.setPhienBanCauHinh(promotion.getPhienBanCauHinh() + 1);
    }

    try {
      promotion = adminPromotionRepository.saveAndFlush(promotion);
    } catch (DataIntegrityViolationException exception) {
      if (exception.getMostSpecificCause() instanceof SQLException cause
          && cause.getErrorCode() == 1062) {
        throw duplicatePromotionCode();
      }
      throw exception;
    }

    var response = toDetailResponse(promotion, responseDetails, usage);
    idempotencyRepository.complete(storageKey, encodeResponse(response));
    return response;
  }

  private AdminPromotionConfigurationCreateRequest configuration(
      KhuyenMai promotion, List<ChiTietKhuyenMai> details) {
    var request = new AdminPromotionConfigurationCreateRequest();
    request.setMaChuongTrinh(promotion.getMaChuongTrinh());
    request.setTenChuongTrinh(promotion.getTenChuongTrinh());
    request.setMoTa(promotion.getMoTa());
    request.setPhuongThucKhuyenMai(promotion.getPhuongThucKhuyenMai());
    request.setDoiTuongKhuyenMai(promotion.getDoiTuongKhuyenMai());
    request.setLoaiChietKhau(promotion.getLoaiChietKhau());
    request.setGiaTriKhuyenMai(promotion.getGiaTriKhuyenMai());
    request.setGiaTriHangToiThieu(promotion.getGiaTriHangToiThieu());
    request.setSoLuongMuaToiThieu(promotion.getSoLuongMuaToiThieu());
    request.setMucGiamToiDa(promotion.getMucGiamToiDa());
    request.setDanhMucId(promotion.getDanhMuc() == null ? null : promotion.getDanhMuc().getId());
    request.setThuongHieuId(
        promotion.getThuongHieu() == null ? null : promotion.getThuongHieu().getId());
    request.setSoLuongApDung(promotion.getSoLuongApDung());
    request.setNgayBatDau(toOffsetDateTime(promotion.getNgayBatDau()));
    request.setNgayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()));
    request.setTrangThai(promotion.getTrangThai());
    request.setChiTietKhuyenMai(
        details.stream()
            .map(
                detail -> {
                  var line = new AdminPromotionCreateRequest.PromotionLine();
                  line.setPhienBanId(detail.getPhienBan().getId());
                  line.setLoaiApDung(detail.getLoaiApDung());
                  line.setSoLuong(detail.getSoLuong());
                  return line;
                })
            .toList());
    return request;
  }

  private AdminPromotionConfigurationCreateRequest mergeConfiguration(
      AdminPromotionConfigurationCreateRequest current, AdminPromotionUpdateRequest patch) {
    ObjectNode merged = objectMapper.valueToTree(current);
    patch.getFields().forEach(merged::set);
    AdminPromotionConfigurationCreateRequest request;
    try {
      request =
          objectMapper
              .readerFor(AdminPromotionConfigurationCreateRequest.class)
              .without(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
              .readValue(merged);
    } catch (JacksonException exception) {
      throw invalid(PromotionErrorMessages.unreadable(exception));
    }
    var violation =
        validator.validate(request).stream()
            .min(Comparator.comparing(value -> value.getPropertyPath().toString()));
    if (violation.isPresent()) {
      throw invalid(
          PromotionErrorMessages.validation(
              violation.get().getPropertyPath().toString(), violation.get().getMessage()));
    }

    request.setMaChuongTrinh(
        requireText(request.getMaChuongTrinh(), "Mã chương trình không được để trống")
            .toUpperCase(Locale.ROOT));
    request.setTenChuongTrinh(
        requireText(request.getTenChuongTrinh(), "Tên chương trình không được để trống"));
    if (request.getMaChuongTrinh().length() > 50 || request.getTenChuongTrinh().length() > 150) {
      throw invalid("Mã chương trình tối đa 50 ký tự, tên tối đa 150 ký tự");
    }
    request.setMoTa(normalizeOptional(request.getMoTa()));
    request.setGiaTriHangToiThieu(
        Objects.requireNonNullElse(request.getGiaTriHangToiThieu(), BigDecimal.ZERO));
    request.setSoLuongMuaToiThieu(Objects.requireNonNullElse(request.getSoLuongMuaToiThieu(), 0));
    request.setNgayBatDau(
        toOffsetDateTime(
            request.getNgayBatDau().atZoneSameInstant(salesProperties.zone()).toLocalDateTime()));
    request.setNgayKetThuc(
        toOffsetDateTime(
            request.getNgayKetThuc().atZoneSameInstant(salesProperties.zone()).toLocalDateTime()));
    validateCreationConfiguration(request);
    return request;
  }

  private String changedRule(
      AdminPromotionConfigurationCreateRequest current,
      AdminPromotionConfigurationCreateRequest merged) {
    JsonNode before = objectMapper.valueToTree(current);
    JsonNode after = objectMapper.valueToTree(merged);
    for (String field : RULE_FIELDS) {
      if (field.equals("chi_tiet_khuyen_mai")) {
        if (!sameLines(current.getChiTietKhuyenMai(), merged.getChiTietKhuyenMai())) {
          return field;
        }
      } else if (!sameRuleValue(before.get(field), after.get(field))) {
        return field;
      }
    }
    return null;
  }

  private boolean sameRuleValue(JsonNode first, JsonNode second) {
    if (first.isNumber() && second.isNumber()) {
      return first.decimalValue().compareTo(second.decimalValue()) == 0;
    }
    return first.equals(second);
  }

  private boolean sameLines(
      List<AdminPromotionCreateRequest.PromotionLine> first,
      List<AdminPromotionCreateRequest.PromotionLine> second) {
    return lineSignatures(first).equals(lineSignatures(second));
  }

  private Set<PromotionLineSignature> lineSignatures(
      List<AdminPromotionCreateRequest.PromotionLine> lines) {
    return lines.stream()
        .map(
            line ->
                new PromotionLineSignature(
                    line.getPhienBanId(), line.getLoaiApDung(), line.getSoLuong()))
        .collect(Collectors.toSet());
  }

  private Map<TrangThaiApDungKhuyenMai, Long> usageCounts(Long id) {
    Map<TrangThaiApDungKhuyenMai, Long> usage = new EnumMap<>(TrangThaiApDungKhuyenMai.class);
    for (var count : adminPromotionRepository.countUsageByStatus(id)) {
      usage.put(count.getStatus(), count.getUsageCount());
    }
    return usage;
  }

  private DanhMuc loadActiveCategory(Long id) {
    if (id == null) return null;
    DanhMuc category =
        categoryRepository.findById(id).orElseThrow(() -> notFound("Danh mục không tồn tại"));
    if (category.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Danh mục đã ngừng hoạt động");
    }
    return category;
  }

  private ThuongHieu loadActiveBrand(Long id) {
    if (id == null) return null;
    ThuongHieu brand =
        brandRepository.findById(id).orElseThrow(() -> notFound("Thương hiệu không tồn tại"));
    if (brand.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Thương hiệu đã ngừng hoạt động");
    }
    return brand;
  }

  private AppException promotionConflict(String field, String code, String message) {
    return new AppException(ErrorCode.CONFLICT, field, code, message);
  }

  public record PromotionStatusResult(String message, AdminPromotionDetailResponse data) {}

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public PromotionStatusResult updatePromotionStatus(Long id, AdminPromotionStatusRequest request) {
    validateId(id);
    Integer requestedStatus = request.getTrangThai();
    if (requestedStatus == null) {
      throw invalid("Trạng thái khuyến mại không được để trống");
    }
    if (requestedStatus != 0 && requestedStatus != 1) {
      throw invalid("Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.");
    }

    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    // Usage writers lock this program too. Read current counts after obtaining the lock.
    Map<TrangThaiApDungKhuyenMai, Long> usage = usageCounts(id);
    List<ChiTietKhuyenMai> details =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());
    TrangThaiCoBanEnum targetStatus =
        requestedStatus == 1 ? TrangThaiCoBanEnum.HOAT_DONG : TrangThaiCoBanEnum.NGUNG_HOAT_DONG;

    if (promotion.getTrangThai() == targetStatus) {
      String message = requestedStatus == 0 ? "Khuyến mại đang tạm dừng" : "Khuyến mại đang bật";
      return new PromotionStatusResult(message, toDetailResponse(promotion, details, usage, now));
    }

    if (targetStatus == TrangThaiCoBanEnum.HOAT_DONG) {
      if (!now.isBefore(promotion.getNgayKetThuc())) {
        throw promotionConflict(
            "trang_thai",
            "PROMOTION_EXPIRED",
            "Chương trình đã hết hạn, không thể khôi phục áp dụng mới");
      }
      int used = Objects.requireNonNullElse(promotion.getSoLuongDaDung(), 0);
      long occupied = (long) used + usage.getOrDefault(TrangThaiApDungKhuyenMai.GIU_CHO, 0L);
      if (promotion.getSoLuongApDung() != null && occupied >= promotion.getSoLuongApDung()) {
        throw promotionConflict(
            "trang_thai",
            "PROMOTION_QUOTA_EXHAUSTED",
            "Chương trình không còn lượt khả dụng để khôi phục");
      }
    }

    promotion.setTrangThai(targetStatus);
    promotion = adminPromotionRepository.saveAndFlush(promotion);
    String message =
        requestedStatus == 0 ? "Tạm dừng khuyến mại thành công" : "Khôi phục khuyến mại thành công";
    return new PromotionStatusResult(message, toDetailResponse(promotion, details, usage, now));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminPromotionDeleteResponse deletePromotion(Long id) {
    validateId(id);

    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    // Check every application status after taking the same program lock as usage writers.
    if (!usageCounts(id).isEmpty()) {
      throw promotionConflict(
          "id",
          "PROMOTION_HAS_ORDER_HISTORY",
          "Chương trình đã có lịch sử áp dụng, hãy tạm dừng thay vì xóa");
    }

    AdminPromotionDeleteResponse response =
        AdminPromotionDeleteResponse.builder()
            .id(promotion.getId())
            .maChuongTrinh(promotion.getMaChuongTrinh())
            .build();

    List<ChiTietKhuyenMai> details =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);
    if (!details.isEmpty()) {
      adminPromotionDetailRepository.deleteAll(details);
      adminPromotionDetailRepository.flush();
    }

    adminPromotionRepository.delete(promotion);
    adminPromotionRepository.flush();
    return response;
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public AdminPromotionDetailResponse getPromotionDetail(Long id) {
    validateId(id);

    KhuyenMai promotion =
        adminPromotionRepository
            .findById(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    List<ChiTietKhuyenMai> details =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);

    return toDetailResponse(promotion, details, usageCounts(id));
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public AdminPromotionVariantListResponse getVariants(
      String keyword, Long categoryId, Long brandId, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    if (brandId != null) {
      if (brandId <= 0) {
        throw invalid("Thương hiệu được chọn không hợp lệ. Vui lòng chọn lại.");
      }
      if (!brandRepository.existsById(brandId)) {
        throw notFound("Thương hiệu được chọn lọc không tồn tại");
      }
    }
    Set<Long> categoryIds = promotionCategoryScope(categoryId);

    var result =
        variantRepository.findAll(
            PhienBanKhuyenMaiSpecification.activeVariants(normalizedKeyword, categoryIds, brandId),
            PageRequest.of(page, limit, Sort.by(Sort.Direction.ASC, "id")));

    List<Long> variantIds = result.getContent().stream().map(PhienBanSanPham::getId).toList();
    var stocks = catalogSupport.stocks(variantIds);
    var attributes = catalogSupport.attributes(variantIds);

    return AdminPromotionVariantListResponse.builder()
        .items(
            result.getContent().stream()
                .map(
                    variant ->
                        AdminPromotionVariantItemResponse.builder()
                            .id(variant.getId())
                            .sanPhamId(variant.getSanPham().getId())
                            .maSanPham(variant.getSanPham().getMaSanPham())
                            .tenSanPham(variant.getSanPham().getTenSanPham())
                            .tenPhienBan(variant.getTenPhienBan())
                            .maVach(variant.getMaVach())
                            .giaBanLe(variant.getGiaBanLe())
                            .coQuanLySerial(Boolean.TRUE.equals(variant.getCoQuanLySerial()))
                            .tonCoTheBan(
                                stocks
                                    .getOrDefault(variant.getId(), CatalogSupport.Stock.ZERO)
                                    .available())
                            .thuocTinhPhienBan(attributes.getOrDefault(variant.getId(), List.of()))
                            .build())
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

  private Set<Long> promotionCategoryScope(Long categoryId) {
    if (categoryId == null) {
      return Set.of();
    }
    if (categoryId <= 0) {
      throw invalid("Danh mục được chọn không hợp lệ. Vui lòng chọn lại.");
    }

    List<DanhMuc> categories = categoryRepository.findAll();
    if (categories.stream().noneMatch(category -> categoryId.equals(category.getId()))) {
      throw notFound("Danh mục được chọn lọc không tồn tại");
    }

    Map<Long, List<Long>> childrenByParent = new LinkedHashMap<>();
    for (DanhMuc category : categories) {
      if (category.getDanhMucCha() != null) {
        childrenByParent
            .computeIfAbsent(category.getDanhMucCha().getId(), key -> new ArrayList<>())
            .add(category.getId());
      }
    }

    Set<Long> categoryIds = new LinkedHashSet<>();
    var pending = new ArrayDeque<Long>();
    pending.add(categoryId);
    while (!pending.isEmpty()) {
      Long current = pending.removeFirst();
      if (categoryIds.add(current)) {
        pending.addAll(childrenByParent.getOrDefault(current, List.of()));
      }
    }
    return categoryIds;
  }

  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public AdminPromotionListResponse getPromotions(
      String keyword,
      String promotionMethod,
      DoiTuongKhuyenMai target,
      Integer status,
      TrangThaiHienThiKhuyenMai displayStatus,
      LocalDate from,
      LocalDate to,
      int page,
      int limit) {

    validatePagination(page, limit);
    if (LocalDate.MAX.equals(to) || (from != null && to != null && from.isAfter(to))) {
      throw invalid("Khoảng ngày khuyến mại không hợp lệ");
    }

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    PhuongThucKhuyenMai parsedMethod = parsePromotionMethod(promotionMethod);
    TrangThaiCoBanEnum parsedStatus = parseStatus(status);
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());
    Page<KhuyenMai> result =
        adminPromotionRepository.findAll(
            KhuyenMaiSpecification.build(
                normalizedKeyword,
                parsedMethod,
                target,
                parsedStatus,
                displayStatus,
                from == null ? null : from.atStartOfDay(),
                to == null ? null : to.plusDays(1).atStartOfDay(),
                now),
            PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "id")));

    List<Long> promotionIds = result.getContent().stream().map(KhuyenMai::getId).toList();
    Map<Long, Long> heldByPromotion =
        promotionIds.isEmpty()
            ? Map.of()
            : adminPromotionRepository
                .countUsageByPromotion(promotionIds, TrangThaiApDungKhuyenMai.GIU_CHO)
                .stream()
                .collect(
                    Collectors.toMap(
                        AdminPromotionRepository.PromotionUsageCount::getPromotionId,
                        AdminPromotionRepository.PromotionUsageCount::getUsageCount));

    return AdminPromotionListResponse.builder()
        .items(
            result.getContent().stream()
                .map(item -> toListItem(item, now, heldByPromotion.getOrDefault(item.getId(), 0L)))
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

  private Map<Long, PhienBanSanPham> loadActiveVariants(
      List<AdminPromotionCreateRequest.PromotionLine> lines) {

    Set<Long> requestedIds = new LinkedHashSet<>();
    for (AdminPromotionCreateRequest.PromotionLine line : lines) {
      requestedIds.add(line.getPhienBanId());
    }

    if (requestedIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, PhienBanSanPham> variants = new LinkedHashMap<>();
    for (PhienBanSanPham variant : variantRepository.findAllById(requestedIds)) {
      variants.put(variant.getId(), variant);
    }

    for (Long variantId : requestedIds) {
      PhienBanSanPham variant = variants.get(variantId);
      if (variant == null) {
        throw notFound("Sản phẩm được chọn không còn tồn tại. Vui lòng chọn lại.");
      }
      if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || variant.getSanPham().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw conflict("Sản phẩm được chọn đã ngừng hoạt động. Vui lòng chọn sản phẩm khác.");
      }
    }

    return variants;
  }

  private void populateMutationResponse(
      KhuyenMai promotion,
      List<ChiTietKhuyenMai> details,
      AdminPromotionMutationResponse.AdminPromotionMutationResponseBuilder<?, ?> builder) {
    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : Math.max(0, promotion.getSoLuongApDung() - used);
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());

    builder
        .id(promotion.getId())
        .maChuongTrinh(promotion.getMaChuongTrinh())
        .tenChuongTrinh(promotion.getTenChuongTrinh())
        .phuongThucKhuyenMai(promotion.getPhuongThucKhuyenMai())
        .doiTuongKhuyenMai(promotion.getDoiTuongKhuyenMai())
        .soLuongApDung(promotion.getSoLuongApDung())
        .soLuongDaDung(used)
        .soLuongConLai(remaining)
        .giaTriKhuyenMai(promotion.getGiaTriKhuyenMai())
        .moTa(promotion.getMoTa())
        .ngayBatDau(toOffsetDateTime(promotion.getNgayBatDau()))
        .ngayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()))
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, used))
        .chiTietKhuyenMai(
            details.stream()
                .map(
                    detail ->
                        AdminPromotionMutationDetailResponse.builder()
                            .id(detail.getId())
                            .phienBanId(detail.getPhienBan().getId())
                            .loaiApDung(detail.getLoaiApDung())
                            .soLuong(detail.getSoLuong())
                            .build())
                .toList());
  }

  private AdminPromotionDetailResponse toDetailResponse(
      KhuyenMai promotion,
      List<ChiTietKhuyenMai> details,
      Map<TrangThaiApDungKhuyenMai, Long> usage) {
    return toDetailResponse(promotion, details, usage, LocalDateTime.now(salesProperties.zone()));
  }

  private AdminPromotionDetailResponse toDetailResponse(
      KhuyenMai promotion,
      List<ChiTietKhuyenMai> details,
      Map<TrangThaiApDungKhuyenMai, Long> usage,
      LocalDateTime now) {
    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    long held = usage.getOrDefault(TrangThaiApDungKhuyenMai.GIU_CHO, 0L);
    long released = usage.getOrDefault(TrangThaiApDungKhuyenMai.DA_GIAI_PHONG, 0L);
    long occupied = used + held;
    boolean canChangeConfiguration = usage.isEmpty();
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : (int) Math.max(0, promotion.getSoLuongApDung() - occupied);
    long remainingSeconds =
        now.isBefore(promotion.getNgayKetThuc())
            ? Math.max(0, Duration.between(now, promotion.getNgayKetThuc()).getSeconds())
            : 0;

    return AdminPromotionDetailResponse.builder()
        .id(promotion.getId())
        .maChuongTrinh(promotion.getMaChuongTrinh())
        .tenChuongTrinh(promotion.getTenChuongTrinh())
        .phuongThucKhuyenMai(promotion.getPhuongThucKhuyenMai())
        .doiTuongKhuyenMai(promotion.getDoiTuongKhuyenMai())
        .loaiChietKhau(promotion.getLoaiChietKhau())
        .giaTriHangToiThieu(promotion.getGiaTriHangToiThieu())
        .soLuongMuaToiThieu(promotion.getSoLuongMuaToiThieu())
        .mucGiamToiDa(promotion.getMucGiamToiDa())
        .danhMucId(promotion.getDanhMuc() == null ? null : promotion.getDanhMuc().getId())
        .thuongHieuId(promotion.getThuongHieu() == null ? null : promotion.getThuongHieu().getId())
        .phienBanCauHinh(promotion.getPhienBanCauHinh())
        .coTheSuaCauHinh(canChangeConfiguration)
        .coTheXoa(canChangeConfiguration)
        .soLuongApDung(promotion.getSoLuongApDung())
        .soLuongDangGiu(held)
        .soLuongDaGiaiPhong(released)
        .soLuongDaDung(used)
        .soLuongConLai(remaining)
        .giaTriKhuyenMai(promotion.getGiaTriKhuyenMai())
        .moTa(promotion.getMoTa())
        .ngayBatDau(toOffsetDateTime(promotion.getNgayBatDau()))
        .ngayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()))
        .thoiGianConLaiGiay(remainingSeconds)
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, occupied))
        .chiTietKhuyenMai(
            details.stream()
                .map(
                    detail ->
                        AdminPromotionDetailLineResponse.builder()
                            .id(detail.getId())
                            .phienBanId(detail.getPhienBan().getId())
                            .maSanPham(detail.getPhienBan().getSanPham().getMaSanPham())
                            .tenSanPham(detail.getPhienBan().getSanPham().getTenSanPham())
                            .tenPhienBan(detail.getPhienBan().getTenPhienBan())
                            .loaiApDung(detail.getLoaiApDung())
                            .soLuong(detail.getSoLuong())
                            .build())
                .toList())
        .build();
  }

  private AdminPromotionListItemResponse toListItem(
      KhuyenMai promotion, LocalDateTime now, long held) {

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    long occupied = used + held;
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : (int) Math.max(0, promotion.getSoLuongApDung() - occupied);

    return AdminPromotionListItemResponse.builder()
        .id(promotion.getId())
        .maChuongTrinh(promotion.getMaChuongTrinh())
        .tenChuongTrinh(promotion.getTenChuongTrinh())
        .phuongThucKhuyenMai(promotion.getPhuongThucKhuyenMai())
        .doiTuongKhuyenMai(promotion.getDoiTuongKhuyenMai())
        .loaiChietKhau(promotion.getLoaiChietKhau())
        .giaTriKhuyenMai(promotion.getGiaTriKhuyenMai())
        .phienBanCauHinh(promotion.getPhienBanCauHinh())
        .soLuongApDung(promotion.getSoLuongApDung())
        .soLuongDaDung(used)
        .soLuongDangGiu(held)
        .soLuongConLai(remaining)
        .ngayBatDau(toOffsetDateTime(promotion.getNgayBatDau()))
        .ngayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()))
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, occupied))
        .build();
  }

  private String displayStatus(KhuyenMai promotion, LocalDateTime now, long occupied) {
    if (promotion.getTrangThai() == TrangThaiCoBanEnum.NGUNG_HOAT_DONG) {
      return "TAM_DUNG";
    }

    if (now.isBefore(promotion.getNgayBatDau())) {
      return "CHUA_BAT_DAU";
    }

    if (!now.isBefore(promotion.getNgayKetThuc())) {
      return "HET_HAN";
    }

    if (promotion.getSoLuongApDung() != null && occupied >= promotion.getSoLuongApDung()) {
      return "HET_LUOT";
    }

    return "DANG_AP_DUNG";
  }

  private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
    return value == null ? null : value.atZone(salesProperties.zone()).toOffsetDateTime();
  }

  private PhuongThucKhuyenMai parsePromotionMethod(String value) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      return null;
    }

    try {
      return PhuongThucKhuyenMai.valueOf(normalized.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("Hình thức khuyến mại không hợp lệ. Vui lòng chọn giảm giá hoặc tặng quà.");
    }
  }

  private TrangThaiCoBanEnum parseStatus(Integer value) {
    if (value == null) {
      return null;
    }

    if (value == 1) {
      return TrangThaiCoBanEnum.HOAT_DONG;
    }

    if (value == 0) {
      return TrangThaiCoBanEnum.NGUNG_HOAT_DONG;
    }

    throw invalid("Trạng thái khuyến mại không hợp lệ. Vui lòng chọn bật hoặc tạm dừng.");
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100) {
      throw invalid(
          "Số trang hoặc số kết quả mỗi trang không hợp lệ. Mỗi trang được hiển thị từ 1 đến 100"
              + " kết quả.");
    }
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("Khuyến mại được chọn không hợp lệ. Vui lòng chọn lại.");
    }
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }

    String normalized = value.trim();
    return normalized.isEmpty() ? null : normalized;
  }

  private String requireText(String value, String message) {
    String normalized = normalizeOptional(value);
    if (normalized == null) {
      throw invalid(message);
    }
    return normalized;
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
