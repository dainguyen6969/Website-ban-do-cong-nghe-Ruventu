package com.example.dantruventu.Services.order;

import com.example.dantruventu.DTO.Request.order.AdminDeliveryCancelRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryReturnRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryStatusRequest;
import com.example.dantruventu.DTO.Request.order.AdminDeliveryUpdateRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.order.AdminDeliveryResponse.*;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.order.AdminDeliveryMapper;
import com.example.dantruventu.Repository.order.*;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Specification.DeliverySpecification;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDeliveryService {

  private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999999.99");

  private final PhieuGiaoHangRepository deliveryRepository;
  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final DoiTacVanChuyenRepository partnerRepository;
  private final PhieuTraHangRepository returnRepository;
  private final ChiTietTraHangRepository returnLineRepository;
  private final DeliveryInventoryService inventoryService;
  private final AdminDeliveryMapper mapper;

  @Value("${ruventu.shipping.time-zone:Asia/Ho_Chi_Minh}")
  private String shippingTimeZone;

  public ListData getList(String keyword, String trangThai, Long partnerId, int page, int limit) {

    if (keyword != null && keyword.length() > 100) {
      throw invalid("Từ khóa tối đa 100 ký tự");
    }

    if (partnerId != null) {
      validateId(partnerId);
    }

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid("Phân trang không hợp lệ: page từ 0, limit từ 1 đến 100");
    }

    TrangThaiGiaoHangEnum status = null;

    if (trangThai != null) {
      try {
        status = TrangThaiGiaoHangEnum.valueOf(trangThai.strip());
      } catch (IllegalArgumentException exception) {
        throw invalid("Trạng thái giao hàng không hợp lệ");
      }
    }

    var result =
        deliveryRepository.findAll(
            DeliverySpecification.build(keyword, status, partnerId),
            PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "ngayTao", "id")));

    var pagination =
        PaginationResponse.builder()
            .page(result.getNumber())
            .limit(result.getSize())
            .totalElements(result.getTotalElements())
            .totalPages(result.getTotalPages())
            .build();

    ZoneId zone = zone();

    return new ListData(
        result.getContent().stream().map(entity -> mapper.toListItem(entity, zone)).toList(),
        pagination);
  }

  public Detail getDetail(Long id) {
    validateId(id);

    PhieuGiaoHang delivery =
        deliveryRepository
            .findById(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    Detail response = mapper.toDetail(delivery, zone());

    response.setSanPham(
        orderLineRepository.findByDonHang_IdOrderByIdAsc(delivery.getDonHang().getId()).stream()
            .map(
                line -> {
                  ProductData item = mapper.toProduct(line);
                  item.setQuanLySerial(inventoryService.usesSerial(line.getPhienBan()));
                  return item;
                })
            .toList());

    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action update(Long id, AdminDeliveryUpdateRequest request) {
    PhieuGiaoHang delivery = lockDelivery(id);
    DonHang order = delivery.getDonHang();

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {
      throw conflict("Hàng đã được bàn giao cho đối tác, không thể thay đổi thông tin vận đơn");
    }

    DoiTacVanChuyen partner = requireActivePartner(request.getDoiTacVanChuyenId());

    String tracking = request.getMaVanDon();

    if (tracking != null && deliveryRepository.existsByMaVanDonIgnoreCaseAndIdNot(tracking, id)) {
      throw conflict("Mã vận đơn đã được sử dụng");
    }

    delivery.setMaVanDon(tracking);
    delivery.setDoiTacVanChuyen(partner);
    delivery.setPhiTraDoiTac(money(request.getPhiTraDoiTac()));
    delivery.setTienThuHoCod(calculateCod(order));
    delivery.setNgayCapNhat(now());

    deliveryRepository.flush();

    return mapper.toAction(delivery, zone());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action changeStatus(Long id, AdminDeliveryStatusRequest request) {
    TrangThaiGiaoHangEnum target = request.getTrangThaiGiaoHang();

    if (target != TrangThaiGiaoHangEnum.DA_NHAN_HANG
        && target != TrangThaiGiaoHangEnum.DANG_GIAO
        && target != TrangThaiGiaoHangEnum.GIAO_THANH_CONG
        && target != TrangThaiGiaoHangEnum.GIAO_THAT_BAI) {
      throw invalid("Trạng thái yêu cầu không được hỗ trợ tại API này");
    }

    PhieuGiaoHang delivery = lockDelivery(id);
    DonHang order = delivery.getDonHang();
    TrangThaiGiaoHangEnum source = delivery.getTrangThaiGiaoHang();

    // Gửi lại đúng bước đã xử lý: trả dữ liệu, không xử lý tiền lần hai.
    if (source == target
        || (source == TrangThaiGiaoHangEnum.CHO_HOAN_HANG
            && target == TrangThaiGiaoHangEnum.GIAO_THAT_BAI)) {
      return mapper.toAction(delivery, zone());
    }

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (target == TrangThaiGiaoHangEnum.DA_NHAN_HANG) {
      if (source != TrangThaiGiaoHangEnum.CHO_GIAO
          || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_LAY_HANG) {
        throw conflict("Chỉ được bàn giao khi phiếu CHO_GIAO và đơn CHO_LAY_HANG");
      }

      requirePackedAndExported(order);
      requireActivePartner(delivery.getDoiTacVanChuyen().getId());

      delivery.setTienThuHoCod(calculateCod(order));
      delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DA_NHAN_HANG);
      order.setTrangThaiDonHang(TrangThaiDonHang.DANG_GIAO_HANG);

    } else if (target == TrangThaiGiaoHangEnum.DANG_GIAO) {
      if (source != TrangThaiGiaoHangEnum.DA_NHAN_HANG) {
        throw conflict("Chỉ được chuyển DA_NHAN_HANG sang DANG_GIAO");
      }

      requireInTransitOrder(order);
      delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DANG_GIAO);

    } else {
      if (source != TrangThaiGiaoHangEnum.DANG_GIAO) {
        throw conflict("Chỉ được xác nhận kết quả khi phiếu đang DANG_GIAO");
      }

      requireInTransitOrder(order);

      if (target == TrangThaiGiaoHangEnum.GIAO_THANH_CONG) {
        confirmCustomerPayment(delivery, request.getXacNhanDaThuCod());

        delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.GIAO_THANH_CONG);
        order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);
      } else {
        // Không cộng kho tại bước báo giao thất bại.
        delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.CHO_HOAN_HANG);
      }
    }

    delivery.setNgayCapNhat(now());
    deliveryRepository.flush();

    return mapper.toAction(delivery, zone());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action cancel(Long id, AdminDeliveryCancelRequest request) {
    PhieuGiaoHang delivery = lockDelivery(id);
    DonHang order = delivery.getDonHang();

    if (delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.HUY_GIAO_HANG) {
      return mapper.toAction(delivery, zone());
    }

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {
      throw conflict("Chỉ được hủy phiếu giao hàng ở trạng thái CHO_GIAO");
    }

    if (order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      throw conflict("Đơn đã xuất kho; nếu chưa bàn giao, hãy sửa đối tác bằng PUT");
    }

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DONG_GOI) {
      throw conflict("Đơn không ở giai đoạn đóng gói để hủy phiếu");
    }

    inventoryService.releaseReservation(order);

    order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);

    // ERD không có cột lý do hủy riêng trên phiếu giao.
    String note = "[Hủy " + delivery.getMaPhieuGiaoHang() + "] " + request.getLyDo().strip();

    order.setGhiChu(
        order.getGhiChu() == null || order.getGhiChu().isBlank()
            ? note
            : order.getGhiChu() + "\n" + note);

    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.HUY_GIAO_HANG);
    delivery.setNgayCapNhat(now());

    deliveryRepository.flush();

    return mapper.toAction(delivery, zone());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action receiveReturn(Long id, AdminDeliveryReturnRequest request) {
    PhieuGiaoHang delivery = lockDelivery(id);
    DonHang order = delivery.getDonHang();

    String returnCode = "TH-PGH-" + id;

    Optional<PhieuTraHang> previous = returnRepository.findByMaTraHang(returnCode);

    if (previous.isPresent()) {
      if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.DA_HOAN_HANG
          || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_HOAN_KHO
          || order.getTrangThaiDonHang() != TrangThaiDonHang.HUY_HANG
          || !Objects.equals(previous.get().getDonHang().getId(), order.getId())) {
        throw conflict("Phiếu trả đã tồn tại nhưng trạng thái dữ liệu không nhất quán");
      }

      return returnAction(delivery, previous.get());
    }

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_HOAN_HANG) {
      throw conflict("Phiếu giao chưa ở trạng thái CHO_HOAN_HANG");
    }

    requireInTransitOrder(order);

    if (order.getKhachHang() == null) {
      throw conflict("Đơn chưa gắn khách hàng; cần gắn khách hàng trước khi lập phiếu trả");
    }

    if (returnRepository.existsByDonHang_Id(order.getId())) {
      throw conflict("Đơn đã có phiếu trả khác, không thể hoàn toàn bộ lần nữa");
    }

    boolean paid = order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN;

    if (!paid && order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      throw conflict("Trạng thái thanh toán của đơn không hợp lệ");
    }

    BigDecimal refund = paid ? money(order.getTongThanhToan()) : BigDecimal.ZERO.setScale(2);

    PhieuTraHang returnDocument =
        PhieuTraHang.builder()
            .maTraHang(returnCode)
            .donHang(order)
            .khachHang(order.getKhachHang())
            .tongTienHoan(refund)
            .hinhThucHoanTien(request.getHinhThucHoanTien())
            .trangThaiTraHang(TrangThaiTraHang.DA_NHAN_HANG)
            .lyDoTra(request.getLyDoTra().strip())
            .ghiChu(
                request.getGhiChu() == null || request.getGhiChu().isBlank()
                    ? null
                    : request.getGhiChu().strip())
            .build();

    returnDocument = returnRepository.saveAndFlush(returnDocument);

    inventoryService.receiveAll(order, returnDocument, request);
    saveReturnLines(order, returnDocument, paid);

    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DA_HOAN_HANG);
    delivery.setNgayCapNhat(now());

    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);

    // Giữ nguyên trạng thái thanh toán gốc và trạng thái đóng gói.
    deliveryRepository.flush();

    return returnAction(delivery, returnDocument);
  }

  /*
   * Điểm nối cho service thanh toán trực tiếp của đơn hàng.
   * Phải gọi trong cùng transaction trước khi ghi nhận tiền.
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void requireDirectPaymentAllowed(Long orderId) {
    validateId(orderId);

    orderRepository
        .findByIdForUpdate(orderId)
        .orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    var states =
        Set.of(
            TrangThaiGiaoHangEnum.DA_NHAN_HANG,
            TrangThaiGiaoHangEnum.DANG_GIAO,
            TrangThaiGiaoHangEnum.GIAO_THAT_BAI,
            TrangThaiGiaoHangEnum.CHO_HOAN_HANG);

    boolean codInTransit =
        deliveryRepository.findByDonHang_IdOrderByIdAsc(orderId).stream()
            .anyMatch(
                delivery ->
                    states.contains(delivery.getTrangThaiGiaoHang())
                        && money(delivery.getTienThuHoCod()).signum() > 0);

    if (codInTransit) {
      throw conflict("Đơn đang được đối tác thu COD, không được thu trực tiếp lần nữa");
    }
  }

  private PhieuGiaoHang lockDelivery(Long id) {
    validateId(id);

    // Chỉ đọc scalar ID trước, tránh nạp entity cũ trước khi khóa.
    Long orderId =
        deliveryRepository
            .findOrderId(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    DonHang order =
        orderRepository
            .findByIdForUpdate(orderId)
            .orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    PhieuGiaoHang delivery =
        deliveryRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    if (!Objects.equals(delivery.getDonHang().getId(), order.getId())) {
      throw conflict("Liên kết đơn hàng đã thay đổi, vui lòng tải lại");
    }

    return delivery;
  }

  private void requireOnlyEffectiveDelivery(PhieuGiaoHang delivery) {
    boolean another =
        deliveryRepository.findByDonHang_IdOrderByIdAsc(delivery.getDonHang().getId()).stream()
            .anyMatch(
                other ->
                    !Objects.equals(other.getId(), delivery.getId())
                        && other.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.HUY_GIAO_HANG
                        && other.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.DA_HOAN_HANG);

    if (another) {
      throw conflict("Đơn có nhiều phiếu còn hiệu lực; ERD chưa có chi tiết phân chia kiện hàng");
    }
  }

  private void requireOpenOrder(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE) {
      throw conflict("Luồng giao hàng này chỉ áp dụng đơn ONLINE");
    }

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.HUY_HANG
        || order.getTrangThaiDonHang() == TrangThaiDonHang.HOAN_THANH
        || order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO) {
      throw conflict("Đơn đã hủy, hoàn thành hoặc hoàn kho");
    }
  }

  private void requirePackedAndExported(DonHang order) {
    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw conflict("Đơn hàng chưa hoàn tất đóng gói và xuất kho");
    }
  }

  private void requireInTransitOrder(DonHang order) {
    requirePackedAndExported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.DANG_GIAO_HANG) {
      throw conflict("Đơn hàng không ở trạng thái DANG_GIAO_HANG");
    }
  }

  private DoiTacVanChuyen requireActivePartner(Long id) {
    DoiTacVanChuyen partner =
        partnerRepository
            .findByIdForShare(id)
            .orElseThrow(() -> notFound("Đối tác vận chuyển không tồn tại"));

    if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Đối tác vận chuyển đã ngừng hoạt động");
    }

    return partner;
  }

  private BigDecimal calculateCod(DonHang order) {
    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN) {
      return BigDecimal.ZERO.setScale(2);
    }

    if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      throw conflict("Trạng thái thanh toán không hợp lệ");
    }

    return money(order.getTongThanhToan());
  }

  private void confirmCustomerPayment(PhieuGiaoHang delivery, Boolean confirmedCod) {

    DonHang order = delivery.getDonHang();
    BigDecimal cod = money(delivery.getTienThuHoCod());
    BigDecimal total = money(order.getTongThanhToan());

    if (cod.signum() > 0) {
      if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
          || cod.compareTo(total) != 0) {
        throw conflict("Dữ liệu COD không khớp trạng thái hoặc tổng tiền đơn");
      }

      if (!Boolean.TRUE.equals(confirmedCod)) {
        throw conflict("Phải xác nhận shipper đã thu đủ COD từ khách");
      }

      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
      return;
    }

    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN) {
      return;
    }

    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        && total.signum() == 0) {
      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
      return;
    }

    throw conflict("Đơn chưa thanh toán nhưng phiếu không có COD hợp lệ");
  }

  private void saveReturnLines(DonHang order, PhieuTraHang returnDocument, boolean paid) {

    var lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    BigDecimal goodsRefund = BigDecimal.ZERO.setScale(2);

    if (paid) {
      goodsRefund = money(order.getTongThanhToan()).subtract(money(order.getPhiGiaoHang()));

      if (goodsRefund.signum() < 0) {
        throw conflict("Phí giao hàng lớn hơn tổng thanh toán");
      }
    }

    BigDecimal weightTotal =
        lines.stream()
            .map(line -> money(line.getThanhTien()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    if (goodsRefund.signum() > 0 && weightTotal.signum() == 0) {
      throw conflict("Không có thành tiền dòng để phân bổ tiền hoàn");
    }

    BigDecimal allocated = BigDecimal.ZERO.setScale(2);

    for (int index = 0; index < lines.size(); index++) {
      ChiTietDonHang line = lines.get(index);
      BigDecimal amount;

      if (index == lines.size() - 1) {
        amount = goodsRefund.subtract(allocated);
      } else if (goodsRefund.signum() == 0) {
        amount = BigDecimal.ZERO.setScale(2);
      } else {
        amount =
            goodsRefund
                .multiply(money(line.getThanhTien()))
                .divide(weightTotal, 2, RoundingMode.DOWN);
      }

      allocated = allocated.add(amount);

      returnLineRepository.save(
          ChiTietTraHang.builder()
              .phieuTraHang(returnDocument)
              .chiTietDonHang(line)
              .soLuong(line.getSoLuong())
              .donGiaHoan(
                  amount.divide(BigDecimal.valueOf(line.getSoLuong()), 2, RoundingMode.HALF_UP))
              .thanhTienHoan(amount)
              .build());
    }
  }

  private Action returnAction(PhieuGiaoHang delivery, PhieuTraHang returnDocument) {

    Action response = mapper.toAction(delivery, zone());
    ReturnData returnData = mapper.toReturn(returnDocument);

    returnData.setCanHoanTien(
        returnDocument.getTrangThaiTraHang() == TrangThaiTraHang.DA_NHAN_HANG
            && returnDocument.getTongTienHoan().signum() > 0);

    response.setPhieuTraHang(returnData);
    return response;
  }

  private BigDecimal money(BigDecimal value) {
    if (value == null
        || value.signum() < 0
        || value.compareTo(MAX_MONEY) > 0
        || value.stripTrailingZeros().scale() > 2) {
      throw conflict("Dữ liệu tiền không hợp lệ");
    }

    return value.setScale(2);
  }

  private ZoneId zone() {
    return ZoneId.of(shippingTimeZone);
  }

  private LocalDateTime now() {
    return LocalDateTime.now(zone());
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID phải là số nguyên dương");
    }
  }

  private AppException invalid(String message) {
    return new AppException(ErrorCode.INVALID_DATA, message);
  }

  private AppException conflict(String message) {
    return new AppException(ErrorCode.CONFLICT, message);
  }

  private AppException notFound(String message) {
    return new AppException(ErrorCode.NOT_FOUND, message);
  }
}
