package com.example.dantruventu.Services;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionCreateRequest;
import com.example.dantruventu.DTO.Request.promotion.AdminPromotionStatusRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDeleteResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailLineResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListItemResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionListResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionMutationDetailResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionMutationResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionStatusResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantItemResponse;
import com.example.dantruventu.DTO.Response.promotion.AdminPromotionVariantListResponse;
import com.example.dantruventu.Entity.ChiTietKhuyenMai;
import com.example.dantruventu.Entity.KhuyenMai;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Enum.DoiTuongKhuyenMai;
import com.example.dantruventu.Enum.LoaiApDungKhuyenMai;
import com.example.dantruventu.Enum.PhuongThucKhuyenMai;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionDetailRepository;
import com.example.dantruventu.Repository.promotion.AdminPromotionRepository;
import com.example.dantruventu.Specification.KhuyenMaiSpecification;
import com.example.dantruventu.Specification.PhienBanKhuyenMaiSpecification;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPromotionService {

  private record PromotionLineSignature(
      Long variantId, LoaiApDungKhuyenMai applicationType, Integer quantity) {}

  private final AdminPromotionRepository adminPromotionRepository;
  private final AdminPromotionDetailRepository adminPromotionDetailRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final SalesProperties salesProperties;

  @Transactional
  public AdminPromotionMutationResponse createPromotion(AdminPromotionCreateRequest request) {

    String code =
        requireText(request.getMaChuongTrinh(), "Mã chương trình không được để trống")
            .toUpperCase(Locale.ROOT);
    String name = requireText(request.getTenChuongTrinh(), "Tên chương trình không được để trống");

    if (code.length() > 255) {
      throw invalid("Mã chương trình tối đa 255 ký tự");
    }
    if (name.length() > 255) {
      throw invalid("Tên chương trình tối đa 255 ký tự");
    }

    Integer usageLimit = request.getSoLuongApDung();
    if (usageLimit != null && usageLimit <= 0) {
      throw invalid("Số lượng áp dụng phải là số nguyên dương");
    }

    if (request.getNgayBatDau() == null || request.getNgayKetThuc() == null) {
      throw invalid("Ngày bắt đầu và ngày kết thúc không được để trống");
    }

    LocalDateTime start =
        request.getNgayBatDau().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();
    LocalDateTime end =
        request.getNgayKetThuc().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();

    if (!start.isBefore(end)) {
      throw invalid("Ngày bắt đầu phải trước ngày kết thúc");
    }

    List<AdminPromotionCreateRequest.PromotionLine> requestedLines = request.getChiTietKhuyenMai();

    validateConfiguration(
        request.getPhuongThucKhuyenMai(),
        request.getDoiTuongKhuyenMai(),
        request.getGiaTriKhuyenMai(),
        requestedLines);

    Map<Long, PhienBanSanPham> variants = loadActiveVariants(requestedLines);

    if (adminPromotionRepository.existsByMaChuongTrinhIgnoreCase(code)) {
      throw conflict("Mã chương trình đã tồn tại");
    }

    KhuyenMai promotion =
        KhuyenMai.builder()
            .maChuongTrinh(code)
            .tenChuongTrinh(name)
            .phuongThucKhuyenMai(request.getPhuongThucKhuyenMai())
            .doiTuongKhuyenMai(request.getDoiTuongKhuyenMai())
            .soLuongApDung(usageLimit)
            .soLuongDaDung(0)
            .giaTriKhuyenMai(request.getGiaTriKhuyenMai())
            .moTa(normalizeOptional(request.getMoTa()))
            .ngayBatDau(start)
            .ngayKetThuc(end)
            .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
            .build();

    try {
      promotion = adminPromotionRepository.saveAndFlush(promotion);
    } catch (DataIntegrityViolationException exception) {
      throw conflict("Mã chương trình đã tồn tại");
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

    return toMutationResponse(promotion, details);
  }

  @Transactional
  public AdminPromotionMutationResponse updatePromotion(
      Long id, AdminPromotionCreateRequest request) {

    validateId(id);

    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    List<ChiTietKhuyenMai> existingDetails =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);

    String code =
        requireText(request.getMaChuongTrinh(), "Mã chương trình không được để trống")
            .toUpperCase(Locale.ROOT);
    String name = requireText(request.getTenChuongTrinh(), "Tên chương trình không được để trống");

    if (code.length() > 255) {
      throw invalid("Mã chương trình tối đa 255 ký tự");
    }
    if (name.length() > 255) {
      throw invalid("Tên chương trình tối đa 255 ký tự");
    }

    Integer usageLimit = request.getSoLuongApDung();
    if (usageLimit != null && usageLimit <= 0) {
      throw invalid("Số lượng áp dụng phải là số nguyên dương");
    }

    if (request.getNgayBatDau() == null || request.getNgayKetThuc() == null) {
      throw invalid("Ngày bắt đầu và ngày kết thúc không được để trống");
    }

    LocalDateTime start =
        request.getNgayBatDau().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();
    LocalDateTime end =
        request.getNgayKetThuc().atZoneSameInstant(salesProperties.zone()).toLocalDateTime();

    if (!start.isBefore(end)) {
      throw invalid("Ngày bắt đầu phải trước ngày kết thúc");
    }

    List<AdminPromotionCreateRequest.PromotionLine> requestedLines = request.getChiTietKhuyenMai();
    validateConfiguration(
        request.getPhuongThucKhuyenMai(),
        request.getDoiTuongKhuyenMai(),
        request.getGiaTriKhuyenMai(),
        requestedLines);

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    if (used < 0) {
      throw conflict("Số lượt khuyến mại đã dùng không hợp lệ");
    }
    if (usageLimit != null && usageLimit < used) {
      throw conflict("Số lượng áp dụng mới không được thấp hơn số lượng đã dùng");
    }

    if (adminPromotionRepository.existsByMaChuongTrinhIgnoreCaseAndIdNot(code, id)) {
      throw conflict("Mã chương trình đã tồn tại");
    }

    if (used > 0
        && configurationChanged(promotion, existingDetails, code, start, request, requestedLines)) {
      throw conflict(
          "Khuyến mại đã được sử dụng, không thể sửa mã, giá trị " + "hoặc cấu hình sản phẩm");
    }

    Map<Long, PhienBanSanPham> variants = loadActiveVariants(requestedLines);

    promotion.setMaChuongTrinh(code);
    promotion.setTenChuongTrinh(name);
    promotion.setPhuongThucKhuyenMai(request.getPhuongThucKhuyenMai());
    promotion.setDoiTuongKhuyenMai(request.getDoiTuongKhuyenMai());
    promotion.setSoLuongApDung(usageLimit);
    promotion.setGiaTriKhuyenMai(request.getGiaTriKhuyenMai());
    promotion.setMoTa(normalizeOptional(request.getMoTa()));
    promotion.setNgayBatDau(start);
    promotion.setNgayKetThuc(end);

    try {
      promotion = adminPromotionRepository.saveAndFlush(promotion);
    } catch (DataIntegrityViolationException exception) {
      throw conflict("Mã chương trình đã tồn tại");
    }

    List<ChiTietKhuyenMai> responseDetails = existingDetails;
    if (used == 0) {
      if (!existingDetails.isEmpty()) {
        adminPromotionDetailRepository.deleteAll(existingDetails);
        adminPromotionDetailRepository.flush();
      }

      responseDetails = new ArrayList<>();
      for (AdminPromotionCreateRequest.PromotionLine line : requestedLines) {
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

    return toMutationResponse(promotion, responseDetails);
  }

  @Transactional
  public AdminPromotionStatusResponse updatePromotionStatus(
      Long id, AdminPromotionStatusRequest request) {

    validateId(id);
    Integer requestedStatus = request.getTrangThai();
    if (requestedStatus == null) {
      throw invalid("Trạng thái khuyến mại không được để trống");
    }
    if (requestedStatus != 0 && requestedStatus != 1) {
      throw invalid("Trạng thái khuyến mại chỉ nhận 0 hoặc 1");
    }

    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    TrangThaiCoBanEnum targetStatus =
        requestedStatus == 1 ? TrangThaiCoBanEnum.HOAT_DONG : TrangThaiCoBanEnum.NGUNG_HOAT_DONG;

    if (promotion.getTrangThai() == targetStatus) {
      return toStatusResponse(promotion);
    }

    if (targetStatus == TrangThaiCoBanEnum.HOAT_DONG) {
      LocalDateTime now = LocalDateTime.now(salesProperties.zone());
      int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();

      if (now.isAfter(promotion.getNgayKetThuc())) {
        throw conflict("Không thể khôi phục khuyến mại đã hết hạn");
      }
      if (promotion.getSoLuongApDung() != null && used >= promotion.getSoLuongApDung()) {
        throw conflict("Không thể khôi phục khuyến mại đã hết lượt");
      }
    }

    promotion.setTrangThai(targetStatus);
    promotion = adminPromotionRepository.saveAndFlush(promotion);
    return toStatusResponse(promotion);
  }

  @Transactional
  public AdminPromotionDeleteResponse deletePromotion(Long id) {
    validateId(id);

    KhuyenMai promotion =
        adminPromotionRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();

    if (used != 0) {
      throw conflict("Chương trình đã được sử dụng, không thể xóa");
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

  public AdminPromotionDetailResponse getPromotionDetail(Long id) {
    validateId(id);

    KhuyenMai promotion =
        adminPromotionRepository
            .findById(id)
            .orElseThrow(() -> notFound("Chương trình khuyến mại không tồn tại"));
    List<ChiTietKhuyenMai> details =
        adminPromotionDetailRepository.findByKhuyenMai_IdOrderByIdAsc(id);

    return toDetailResponse(promotion, details);
  }

  public AdminPromotionVariantListResponse getVariants(String keyword, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    var result =
        variantRepository.findAll(
            PhienBanKhuyenMaiSpecification.activeVariants(normalizedKeyword),
            PageRequest.of(page, limit, Sort.by(Sort.Direction.ASC, "id")));

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

  public AdminPromotionListResponse getPromotions(
      String keyword, String promotionMethod, Integer status, int page, int limit) {

    validatePagination(page, limit);

    String normalizedKeyword = normalizeOptional(keyword);
    if (normalizedKeyword != null && normalizedKeyword.length() > 200) {
      throw invalid("Từ khóa tìm kiếm tối đa 200 ký tự");
    }

    PhuongThucKhuyenMai parsedMethod = parsePromotionMethod(promotionMethod);
    TrangThaiCoBanEnum parsedStatus = parseStatus(status);

    Page<KhuyenMai> result =
        adminPromotionRepository.findAll(
            KhuyenMaiSpecification.build(normalizedKeyword, parsedMethod, parsedStatus),
            PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "id")));

    LocalDateTime now = LocalDateTime.now(salesProperties.zone());

    return AdminPromotionListResponse.builder()
        .items(result.getContent().stream().map(item -> toListItem(item, now)).toList())
        .pagination(
            PaginationResponse.builder()
                .page(result.getNumber())
                .limit(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build())
        .build();
  }

  private void validateConfiguration(
      PhuongThucKhuyenMai method,
      DoiTuongKhuyenMai target,
      BigDecimal discountValue,
      List<AdminPromotionCreateRequest.PromotionLine> lines) {

    if (method == null) {
      throw invalid("Phương thức khuyến mại không được để trống");
    }
    if (target == null) {
      throw invalid("Đối tượng khuyến mại không được để trống");
    }
    if (lines == null) {
      throw invalid("Chi tiết khuyến mại không được để trống");
    }
    if (lines.size() > 1000) {
      throw invalid("Tối đa 1000 dòng chi tiết khuyến mại");
    }

    Set<Long> variantIds = new LinkedHashSet<>();
    boolean hasPurchase = false;
    boolean hasGift = false;

    for (AdminPromotionCreateRequest.PromotionLine line : lines) {
      if (line == null) {
        throw invalid("Chi tiết khuyến mại không hợp lệ");
      }
      if (line.getPhienBanId() == null || line.getPhienBanId() <= 0) {
        throw invalid("Phiên bản sản phẩm không hợp lệ");
      }
      if (line.getLoaiApDung() == null) {
        throw invalid("Loại áp dụng không được để trống");
      }
      if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
        throw invalid("Số lượng chi tiết phải là số nguyên dương");
      }
      if (!variantIds.add(line.getPhienBanId())) {
        throw invalid("Phiên bản không được lặp trong chi tiết khuyến mại");
      }

      hasPurchase |= line.getLoaiApDung() == LoaiApDungKhuyenMai.SAN_PHAM_MUA;
      hasGift |= line.getLoaiApDung() == LoaiApDungKhuyenMai.SAN_PHAM_TANG;
    }

    if (method == PhuongThucKhuyenMai.CHIET_KHAU) {
      if (discountValue == null || discountValue.signum() <= 0) {
        throw invalid("Khuyến mại chiết khấu yêu cầu giá trị tiền dương");
      }

      if (target == DoiTuongKhuyenMai.TONG_DON) {
        if (!lines.isEmpty()) {
          throw invalid("Khuyến mại toàn đơn không nhận chi tiết sản phẩm");
        }
        return;
      }

      if (target == DoiTuongKhuyenMai.TUNG_SAN_PHAM) {
        if (lines.isEmpty()) {
          throw invalid("Phải chọn ít nhất một phiên bản được giảm giá");
        }
        if (hasGift) {
          throw invalid("Khuyến mại giảm giá chỉ nhận loại SAN_PHAM_MUA");
        }
        return;
      }

      throw invalid("Đối tượng khuyến mại chưa được hỗ trợ");
    }

    if (method == PhuongThucKhuyenMai.TANG_SAN_PHAM) {
      if (target != DoiTuongKhuyenMai.TUNG_SAN_PHAM) {
        throw invalid("Khuyến mại tặng sản phẩm chỉ hỗ trợ TUNG_SAN_PHAM");
      }
      if (discountValue != null) {
        throw invalid("Khuyến mại tặng sản phẩm phải để gia_tri_khuyen_mai là null");
      }
      if (!hasPurchase || !hasGift) {
        throw invalid("Khuyến mại tặng sản phẩm cần cả SAN_PHAM_MUA và SAN_PHAM_TANG");
      }
      return;
    }

    throw invalid("Phương thức khuyến mại chưa được hỗ trợ");
  }

  private boolean configurationChanged(
      KhuyenMai promotion,
      List<ChiTietKhuyenMai> existingDetails,
      String requestedCode,
      LocalDateTime requestedStart,
      AdminPromotionCreateRequest request,
      List<AdminPromotionCreateRequest.PromotionLine> requestedLines) {

    if (!promotion.getMaChuongTrinh().equals(requestedCode)
        || promotion.getPhuongThucKhuyenMai() != request.getPhuongThucKhuyenMai()
        || promotion.getDoiTuongKhuyenMai() != request.getDoiTuongKhuyenMai()
        || !sameMoney(promotion.getGiaTriKhuyenMai(), request.getGiaTriKhuyenMai())
        || !promotion.getNgayBatDau().equals(requestedStart)
        || existingDetails.size() != requestedLines.size()) {
      return true;
    }

    Set<PromotionLineSignature> existingSignatures = new LinkedHashSet<>();
    for (ChiTietKhuyenMai detail : existingDetails) {
      existingSignatures.add(
          new PromotionLineSignature(
              detail.getPhienBan().getId(), detail.getLoaiApDung(), detail.getSoLuong()));
    }

    Set<PromotionLineSignature> requestedSignatures = new LinkedHashSet<>();
    for (AdminPromotionCreateRequest.PromotionLine line : requestedLines) {
      requestedSignatures.add(
          new PromotionLineSignature(
              line.getPhienBanId(), line.getLoaiApDung(), line.getSoLuong()));
    }

    return existingSignatures.size() != existingDetails.size()
        || requestedSignatures.size() != requestedLines.size()
        || !existingSignatures.equals(requestedSignatures);
  }

  private boolean sameMoney(BigDecimal first, BigDecimal second) {
    if (first == null || second == null) {
      return first == null && second == null;
    }
    return first.compareTo(second) == 0;
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
        throw notFound("Phiên bản sản phẩm không tồn tại: " + variantId);
      }
      if (variant.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG
          || variant.getSanPham().getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw conflict("Sản phẩm hoặc phiên bản đã ngừng hoạt động: " + variantId);
      }
    }

    return variants;
  }

  private AdminPromotionMutationResponse toMutationResponse(
      KhuyenMai promotion, List<ChiTietKhuyenMai> details) {

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : Math.max(0, promotion.getSoLuongApDung() - used);
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());

    return AdminPromotionMutationResponse.builder()
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
                .toList())
        .build();
  }

  private AdminPromotionDetailResponse toDetailResponse(
      KhuyenMai promotion, List<ChiTietKhuyenMai> details) {

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : Math.max(0, promotion.getSoLuongApDung() - used);
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());
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
        .soLuongApDung(promotion.getSoLuongApDung())
        .soLuongDaDung(used)
        .soLuongConLai(remaining)
        .giaTriKhuyenMai(promotion.getGiaTriKhuyenMai())
        .moTa(promotion.getMoTa())
        .ngayBatDau(toOffsetDateTime(promotion.getNgayBatDau()))
        .ngayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()))
        .thoiGianConLaiGiay(remainingSeconds)
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, used))
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

  private AdminPromotionStatusResponse toStatusResponse(KhuyenMai promotion) {
    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    LocalDateTime now = LocalDateTime.now(salesProperties.zone());

    return AdminPromotionStatusResponse.builder()
        .id(promotion.getId())
        .maChuongTrinh(promotion.getMaChuongTrinh())
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, used))
        .build();
  }

  private AdminPromotionListItemResponse toListItem(KhuyenMai promotion, LocalDateTime now) {

    int used = promotion.getSoLuongDaDung() == null ? 0 : promotion.getSoLuongDaDung();
    Integer remaining =
        promotion.getSoLuongApDung() == null
            ? null
            : Math.max(0, promotion.getSoLuongApDung() - used);

    return AdminPromotionListItemResponse.builder()
        .id(promotion.getId())
        .maChuongTrinh(promotion.getMaChuongTrinh())
        .tenChuongTrinh(promotion.getTenChuongTrinh())
        .phuongThucKhuyenMai(promotion.getPhuongThucKhuyenMai())
        .doiTuongKhuyenMai(promotion.getDoiTuongKhuyenMai())
        .soLuongApDung(promotion.getSoLuongApDung())
        .soLuongDaDung(used)
        .soLuongConLai(remaining)
        .ngayBatDau(toOffsetDateTime(promotion.getNgayBatDau()))
        .ngayKetThuc(toOffsetDateTime(promotion.getNgayKetThuc()))
        .trangThai(promotion.getTrangThai().getValue())
        .trangThaiHienThi(displayStatus(promotion, now, used))
        .build();
  }

  private String displayStatus(KhuyenMai promotion, LocalDateTime now, int used) {
    if (promotion.getTrangThai() == TrangThaiCoBanEnum.NGUNG_HOAT_DONG) {
      return "TAM_DUNG";
    }

    if (now.isBefore(promotion.getNgayBatDau())) {
      return "CHUA_BAT_DAU";
    }

    if (now.isAfter(promotion.getNgayKetThuc())) {
      return "HET_HAN";
    }

    if (promotion.getSoLuongApDung() != null && used >= promotion.getSoLuongApDung()) {
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
      throw invalid("Phương thức khuyến mại không hợp lệ");
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

    throw invalid("Trạng thái khuyến mại chỉ nhận 0 hoặc 1");
  }

  private void validatePagination(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID khuyến mại phải là số nguyên dương");
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
