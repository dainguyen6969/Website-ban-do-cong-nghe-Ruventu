package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.partner.AdminShippingPartnerCreateRequest;
import com.example.dantruventu.DTO.Request.partner.AdminShippingPartnerStatusRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingDeliveryListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerListResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerResponse;
import com.example.dantruventu.DTO.Response.partner.AdminShippingPartnerStatusResponse;
import com.example.dantruventu.Entity.DoiTacVanChuyen;
import com.example.dantruventu.Enum.LoaiDoiTacVanChuyenEnum;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Enum.TrangThaiGiaoHangEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.partner.DoiTacVanChuyenMapper;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Repository.partner.PhieuGiaoHangRepository;
import com.example.dantruventu.Specification.DoiTacVanChuyenSpecification;
import com.example.dantruventu.Specification.PhieuGiaoHangSpecification;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminShippingPartnerService {

  private static final String DUPLICATE_PHONE =
      "Số điện thoại này đã được đăng ký cho đối tác vận chuyển khác";

  private final DoiTacVanChuyenRepository partnerRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final DoiTacVanChuyenMapper mapper;

  @Value("${ruventu.shipping.time-zone:Asia/Ho_Chi_Minh}")
  private String shippingTimeZone;

  public AdminShippingPartnerListResponse getPartners(
      String keyword, String loaiDoiTac, Short trangThai, int page, int limit) {

    validateKeyword(keyword);
    var pageable = pageable(page, limit);

    LoaiDoiTacVanChuyenEnum type =
        parseEnum(loaiDoiTac, LoaiDoiTacVanChuyenEnum.class, "Loại đối tác không hợp lệ");

    TrangThaiCoBanEnum status = trangThai == null ? null : parseStatus(trangThai);

    var result =
        partnerRepository.findAll(
            DoiTacVanChuyenSpecification.build(keyword, type, status), pageable);

    return AdminShippingPartnerListResponse.builder()
        .items(result.getContent().stream().map(mapper::toListItem).toList())
        .pagination(toPagination(result))
        .build();
  }

  public AdminShippingPartnerResponse getDetail(Long id) {
    return mapper.toResponse(requirePartner(id), timeZone());
  }

  public AdminShippingDeliveryListResponse getDeliveries(
      Long id, String keyword, String trangThaiGiaoHang, int page, int limit) {

    validateId(id);
    validateKeyword(keyword);

    var pageable = pageable(page, limit);

    TrangThaiGiaoHangEnum status =
        parseEnum(
            trangThaiGiaoHang, TrangThaiGiaoHangEnum.class, "Trạng thái giao hàng không hợp lệ");

    if (!partnerRepository.existsById(id)) {
      throw notFound();
    }

    var result =
        deliveryRepository.findAll(
            PhieuGiaoHangSpecification.byPartner(id, keyword, status), pageable);

    ZoneId zone = timeZone();

    return AdminShippingDeliveryListResponse.builder()
        .items(
            result.getContent().stream()
                .map(delivery -> mapper.toDeliveryResponse(delivery, zone))
                .toList())
        .pagination(toPagination(result))
        .build();
  }

  @Transactional
  public AdminShippingPartnerResponse create(AdminShippingPartnerCreateRequest request) {

    if (partnerRepository.existsBySoDienThoai(request.getSoDienThoai())) {
      throw conflict(DUPLICATE_PHONE);
    }

    DoiTacVanChuyen partner = mapper.toEntity(request);

    ZoneId zone = timeZone();
    LocalDateTime now = LocalDateTime.now(zone);

    partner.setTrangThai(TrangThaiCoBanEnum.HOAT_DONG);
    partner.setNgayTao(now);
    partner.setNgayCapNhat(now);

    /*
     * Mã tạm để INSERT lấy ID tự tăng.
     * Sau đó đổi thành DTVC + ID trong cùng transaction.
     */
    partner.setMaDoiTac(
        "TMP"
            + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 16)
                .toUpperCase(Locale.ROOT));

    try {
      partner = partnerRepository.saveAndFlush(partner);

      String code = String.format(Locale.ROOT, "DTVC%06d", partner.getId());

      if (code.length() > 20) {
        throw conflict("ID vượt độ dài mã đối tác cho phép");
      }

      partner.setMaDoiTac(code);
      partnerRepository.flush();

      return mapper.toResponse(partner, zone);
    } catch (DataIntegrityViolationException exception) {
      String message = exception.getMostSpecificCause().getMessage();

      if (message != null && message.toLowerCase(Locale.ROOT).contains("uk_dtvc_sdt")) {
        throw conflict(DUPLICATE_PHONE);
      }

      throw conflict("Mã hoặc thông tin đối tác bị trùng, vui lòng kiểm tra và thử lại");
    }
  }

  @Transactional
  public AdminShippingPartnerStatusResponse updateStatus(
      Long id, AdminShippingPartnerStatusRequest request) {

    validateId(id);
    TrangThaiCoBanEnum requestedStatus = parseStatus(request.getTrangThai());

    DoiTacVanChuyen partner = partnerRepository.findByIdForUpdate(id).orElseThrow(this::notFound);

    if (partner.getTrangThai() != requestedStatus) {
      partner.setTrangThai(requestedStatus);
      partner.setNgayCapNhat(LocalDateTime.now(timeZone()));

      partnerRepository.flush();
    }

    return mapper.toStatusResponse(partner, timeZone());
  }

  /*
   * Gọi từ transaction tạo phiếu giao / đổi sang đối tác mới.
   * Không dùng hàm này để chặn xử lý phiếu đã gán trước đó.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public DoiTacVanChuyen requireActiveForDelivery(Long id) {
    validateId(id);

    DoiTacVanChuyen partner = partnerRepository.findByIdForShare(id).orElseThrow(this::notFound);

    if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw invalid("Đối tác đã ngừng hoạt động, không thể gán giao hàng mới");
    }

    return partner;
  }

  private DoiTacVanChuyen requirePartner(Long id) {
    validateId(id);

    return partnerRepository.findById(id).orElseThrow(this::notFound);
  }

  private TrangThaiCoBanEnum parseStatus(Short value) {
    if (value == null || (value != 0 && value != 1)) {
      throw invalid("Trạng thái chỉ nhận 0 hoặc 1");
    }

    return TrangThaiCoBanEnum.fromValue(value);
  }

  private <E extends Enum<E>> E parseEnum(String value, Class<E> enumType, String message) {

    if (value == null) {
      return null;
    }

    try {
      return Enum.valueOf(enumType, value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalid(message);
    }
  }

  private PageRequest pageable(int page, int limit) {
    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {

      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }

    return PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "ngayTao", "id"));
  }

  private PaginationResponse toPagination(Page<?> page) {
    return PaginationResponse.builder()
        .page(page.getNumber())
        .limit(page.getSize())
        .totalElements(page.getTotalElements())
        .totalPages(page.getTotalPages())
        .build();
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID đối tác phải là số nguyên dương");
    }
  }

  private void validateKeyword(String keyword) {
    if (keyword != null && keyword.length() > 100) {
      throw invalid("Từ khóa tìm kiếm tối đa 100 ký tự");
    }
  }

  private ZoneId timeZone() {
    return ZoneId.of(shippingTimeZone);
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  private AppException notFound() {
    return new AppException(ErrorCode.NOT_FOUND, "Đối tác vận chuyển không tồn tại");
  }
}
