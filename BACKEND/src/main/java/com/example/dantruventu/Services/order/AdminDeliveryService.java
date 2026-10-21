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
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.sales.OrderSaleSnapshotService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SoldDeviceService;
import com.example.dantruventu.Specification.DeliverySpecification;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

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
  private final AdminOrderService orderService;
  private final EntityManager entityManager;
  private final CatalogSupport catalogSupport;
  private final OrderSaleSnapshotService saleSnapshots;
  private final SoldDeviceService soldDevices;
  private final CashbookService cashbookService;
  private final SalesContext salesContext;
  private final ObjectMapper objectMapper;

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
        pagination,
        statusCounts(keyword, partnerId));
  }

  public ReturnRequirements getReturnRequirements(Long id) {
    validateId(id);

    PhieuGiaoHang delivery =
        deliveryRepository
            .findById(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    DonHang order = delivery.getDonHang();

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_HOAN_HANG) {
      throw conflict("Phiếu giao chưa ở trạng thái CHO_HOAN_HANG");
    }

    requireInTransitOrder(order);

    if (order.getNgayHoanThanh() != null) {
      throw conflict("Đơn đã có mốc khách thực nhận, không thuộc hoàn giao thất bại");
    }

    ReturnWarehouse warehouse = inventoryService.returnWarehouse();

    List<String> reasons = new ArrayList<>();
    List<ReturnRequirement> items = List.of();

    try {
      items = inventoryService.getReturnRequirements(order);
    } catch (AppException exception) {
      if (exception.getErrorCode() != ErrorCode.CONFLICT
          && exception.getErrorCode() != ErrorCode.UNPROCESSABLE_ENTITY) {
        throw exception;
      }

      reasons.add("EXPORT_HISTORY_UNVERIFIED");
    }

    Map<String, Object> moneyEvidence = orderService.failedDeliveryMoney(order);

    if (!Boolean.TRUE.equals(moneyEvidence.get("co_du_can_cu"))) {
      reasons.add("PAYMENT_HISTORY_UNVERIFIED");
    }

    var existing = returnRepository.findByMaTraHang("TH-PGH-" + delivery.getId());

    if (returnRepository.existsByDonHang_Id(order.getId())) {
      reasons.add("RETURN_ALREADY_EXISTS");
    }

    if (!validReturnContact(order)) {
      reasons.add("RECIPIENT_HISTORY_UNVERIFIED");
    }

    return new ReturnRequirements(
        delivery.getId(),
        delivery.getMaPhieuGiaoHang(),
        delivery.getTrangThaiGiaoHang(),
        mapper.toOrder(order, zone()),
        warehouse,
        "HOAN_GIAO_HANG",
        reasons.isEmpty(),
        List.copyOf(reasons),
        items,
        moneyEvidence,
        existing.map(this::returnData).orElse(null));
  }

  public Detail getDetail(Long id) {
    validateId(id);

    PhieuGiaoHang delivery =
        deliveryRepository
            .findById(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    DonHang order = delivery.getDonHang();

    Detail response = mapper.toDetail(delivery, zone());

    var lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    var images =
        catalogSupport.primaryImages(
            lines.stream()
                .map(line -> line.getPhienBan().getSanPham().getId())
                .distinct()
                .toList());

    response.setSanPham(
        lines.stream()
            .map(
                line -> {
                  var item = saleSnapshots.product(line);
                  item.setAnhDaiDien(images.get(line.getPhienBan().getSanPham().getId()));
                  return item;
                })
            .toList());

    if (response.getTongTien() != null
        && order.getTongThanhToan() != null
        && order.getTongTienHang() != null
        && order.getTienChietKhau() != null
        && order.getPhiGiaoHang() != null) {

      BigDecimal vat =
          order
              .getTongThanhToan()
              .subtract(order.getTongTienHang())
              .add(order.getTienChietKhau())
              .subtract(order.getPhiGiaoHang());

      response.getTongTien().setTongTienVat(vat.signum() < 0 ? null : vat);
    }

    returnRepository
        .findByMaTraHang("TH-PGH-" + delivery.getId())
        .ifPresent(document -> response.setPhieuTraHang(returnData(document)));

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

    orderService.recordHistory(
        order,
        "CAP_NHAT_GIAO_VAN",
        "Cập nhật đối tác, phí trả và mã vận đơn của phiếu " + delivery.getMaPhieuGiaoHang());
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

    var promotionBefore = saleSnapshots.appliedPromotion(order.getId());

    // Gửi lại đúng bước đã xử lý: trả dữ liệu, không xử lý tiền lần hai.
    if (source == target
        || (source == TrangThaiGiaoHangEnum.CHO_HOAN_HANG
            && target == TrangThaiGiaoHangEnum.GIAO_THAT_BAI)) {

      throw conflict("Trạng thái này đã được xử lý");
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

        soldDevices.handover(order);

        delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.GIAO_THANH_CONG);

        // Hoàn thành giao nhận là mốc khách đã thực nhận hàng.
        // Thanh toán COD vẫn chờ đến khi cửa hàng thực nhận tiền đối tác.
        order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);

        saleSnapshots.onOrderStateChanged(order);

      } else {
        // Báo giao thất bại, chờ nhận hàng hoàn.
        delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.CHO_HOAN_HANG);
      }
    }

    delivery.setNgayCapNhat(now());
    String description =
        switch (target) {
          case DA_NHAN_HANG -> "Bàn giao hàng cho đối tác";
          case DANG_GIAO -> "Đối tác đang giao hàng";
          case GIAO_THANH_CONG -> "Giao hàng thành công";
          case GIAO_THAT_BAI -> "Giao hàng thất bại, chờ hoàn hàng";
          default -> throw invalid("Trạng thái giao hàng không hợp lệ");
        };
    orderService.recordHistory(
        order,
        "GIAO_VAN_" + target.name(),
        description + "; phiếu " + delivery.getMaPhieuGiaoHang());
    deliveryRepository.flush();

    Action response = mapper.toAction(delivery, zone());

    var promotionAfter = saleSnapshots.appliedPromotion(order.getId());
    response.setKhuyenMai(promotionAfter);

    Map<String, Object> usage = new LinkedHashMap<>();
    usage.put(
        "trang_thai_truoc", promotionBefore == null ? null : promotionBefore.trangThaiApDung());
    usage.put("trang_thai_sau", promotionAfter == null ? null : promotionAfter.trangThaiApDung());

    boolean consumed =
        promotionBefore != null
            && promotionAfter != null
            && promotionBefore.trangThaiApDung() == TrangThaiApDungKhuyenMai.GIU_CHO
            && promotionAfter.trangThaiApDung() == TrangThaiApDungKhuyenMai.DA_SU_DUNG;

    usage.put("tang_so_luong_da_dung", consumed ? 1 : 0);
    response.setCapNhatLuot(usage);

    boolean customerCodCollected =
        target == TrangThaiGiaoHangEnum.GIAO_THANH_CONG
            && delivery.getTienThuHoCod() != null
            && delivery.getTienThuHoCod().signum() > 0;

    Map<String, Object> settlement = new LinkedHashMap<>();
    settlement.put("nguon", customerCodCollected ? "DOI_TAC_GIAO_HANG" : null);
    settlement.put(
        "so_tien_da_thu_cod", customerCodCollected ? delivery.getTienThuHoCod() : BigDecimal.ZERO);
    settlement.put("phieu_thu_moi", null);
    settlement.put(
        "can_doi_soat_doi_tac",
        customerCodCollected
            && order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN);

    response.setThanhToanGiaoHang(settlement);
    return response;
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

    orderService.recordHistory(
        order, "HUY_PHIEU_GIAO", "Hủy phiếu giao hàng " + delivery.getMaPhieuGiaoHang());
    deliveryRepository.flush();

    return mapper.toAction(delivery, zone());
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action receiveReturn(Long id, AdminDeliveryReturnRequest request) {

    PhieuGiaoHang delivery = lockDelivery(id);
    DonHang order = delivery.getDonHang();

    String returnCode = "TH-PGH-" + id;

    if (returnRepository.findByMaTraHang(returnCode).isPresent()) {
      throw conflict("Phiếu giao hàng đã được nhận hoàn");
    }

    requireOpenOrder(order);
    requireOnlyEffectiveDelivery(delivery);

    if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_HOAN_HANG) {
      throw conflict("Phiếu giao chưa ở trạng thái CHO_HOAN_HANG");
    }

    requireInTransitOrder(order);

    if (order.getNgayHoanThanh() != null) {
      throw conflict("Đơn đã có mốc khách thực nhận, không thuộc hoàn giao thất bại");
    }

    orderLineRepository.findByDonHangIdForUpdate(order.getId());

    if (returnRepository.existsByDonHang_Id(order.getId())) {
      throw conflict("Đơn đã có phiếu trả khác, cần đối soát trước khi nhận toàn bộ");
    }

    if (!Boolean.TRUE.equals(request.getXacNhanDaNhanDuHang())) {
      throw invalid("Phải xác nhận đã thực nhận đủ hàng");
    }

    if (!validReturnContact(order)) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "don_hang_id",
          "RECIPIENT_HISTORY_UNVERIFIED",
          "Thiếu thông tin liên hệ đã lưu trên đơn hàng");
    }

    validateReturnEvidence(request.getBangChungUrls());

    LocalDateTime receivedAt = validateReceivedAt(order, request.getThoiDiemNhan());

    Map<String, Object> moneyEvidence = orderService.failedDeliveryMoney(order);

    if (!Boolean.TRUE.equals(moneyEvidence.get("co_du_can_cu"))) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "don_hang_id",
          "PAYMENT_HISTORY_UNVERIFIED",
          "Chưa đủ căn cứ xác định khoản tiền cần hoàn");
    }

    BigDecimal refund = (BigDecimal) moneyEvidence.get("tong_tien_can_hoan");

    ReturnWarehouse warehouse = inventoryService.returnWarehouse();

    List<ReturnRequirement> originalItems;

    try {
      originalItems = inventoryService.getReturnRequirements(order);
    } catch (AppException exception) {
      if (exception.getErrorCode() != ErrorCode.CONFLICT
          && exception.getErrorCode() != ErrorCode.UNPROCESSABLE_ENTITY) {
        throw exception;
      }

      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "hang_nhan",
          "EXPORT_HISTORY_UNVERIFIED",
          "Chưa đủ căn cứ đối chiếu toàn bộ hàng xuất gốc");
    }

    NguoiDung actor = salesContext.actor();

    PhieuTraHang document =
        PhieuTraHang.builder()
            .maTraHang(returnCode)
            .donHang(order)
            .khachHang(order.getKhachHang())
            .tenNguoiLienHe(order.getTenNguoiNhan().strip())
            .sdtNguoiLienHe(order.getSdtNguoiNhan().strip())
            .nguoiTao(actor)
            .tongTienHoan(refund)
            .hinhThucHoanTien(request.getHinhThucHoanTien())
            .trangThaiTraHang(
                refund.signum() == 0 ? TrangThaiTraHang.HOAN_TAT : TrangThaiTraHang.DA_NHAN_HANG)
            .lyDoTra(request.getLyDoTra().strip())
            .ngayTiepNhanThucTe(receivedAt)
            .ngayNhanHang(receivedAt)
            .ngayKetThuc(refund.signum() == 0 ? receivedAt : null)
            .build();

    returnRepository.saveAndFlush(document);

    List<ReturnStockChange> movements = inventoryService.receiveAll(order, document, request);

    Map<Long, ChiTietTraHang> returnLines = saveReturnLines(order, document);

    soldDevices.markReturned(order, returnLines);

    Map<String, Object> source = new LinkedHashMap<>();
    source.put("phien_ban", 1);
    source.put("nguon", "HOAN_GIAO_HANG");
    source.put("don_hang_id", order.getId());
    source.put("phieu_giao_hang_id", delivery.getId());
    source.put("kho_nhan", warehouse);
    source.put("nguoi_nhan_hang_id", actor.getId());
    source.put("thoi_diem_nhan", request.getThoiDiemNhan());
    source.put("hang_da_xuat", originalItems);
    source.put("hang_nhan", request.getHangNhan());
    source.put("bang_chung_urls", request.getBangChungUrls());
    source.put("doi_soat_tien", moneyEvidence);
    source.put("bien_dong_kho", movements);

    document.setDuLieuNhanHang(objectMapper.writeValueAsString(source));

    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DA_HOAN_HANG);
    delivery.setNgayCapNhat(now());

    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_HOAN_KHO);

    saleSnapshots.onOrderStateChanged(order);

    orderService.recordHistory(
        order, "NHAN_HOAN_GIAO_HANG", "Nhận hoàn hàng từ phiếu " + delivery.getMaPhieuGiaoHang());

    deliveryRepository.flush();

    Action response = returnAction(delivery, document);
    response.setKhoNhan(warehouse);
    response.setBienDongKho(movements);

    return response;
  }

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

    Long orderId =
        deliveryRepository
            .findOrderId(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    DonHang order =
        orderRepository
            .findByIdForUpdate(orderId)
            .orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    entityManager.refresh(order);
    orderService.watchStatuses(order);

    saleSnapshots.lockPromotionForOrder(order.getId());

    PhieuGiaoHang delivery =
        deliveryRepository
            .findByIdForUpdate(id)
            .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại"));

    entityManager.refresh(delivery);

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

      // Shipper đã thu tiền khách, cửa hàng chưa thực nhận COD.
      // Giữ CHUA_THANH_TOAN đến khi ghi nhận phiếu thu từ đối tác.
      return;
    }

    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN) {
      return;
    }

    // Đơn bằng 0 không phát sinh khoản tiền cần thu.
    if (order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        && total.signum() == 0) {

      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);

      return;
    }

    throw conflict("Đơn chưa thanh toán nhưng phiếu không có COD hợp lệ");
  }

  private boolean validReturnContact(DonHang order) {
    String name = order.getTenNguoiNhan();
    String phone = order.getSdtNguoiNhan();

    return name != null
        && !name.isBlank()
        && name.strip().length() <= 100
        && phone != null
        && !phone.isBlank()
        && phone.strip().length() <= 20;
  }

  private void validateReturnEvidence(List<String> urls) {
    if (urls == null || urls.isEmpty() || urls.size() > 50) {
      throw invalid("Cần từ 1 đến 50 ảnh bằng chứng");
    }

    Set<String> unique = new HashSet<>();

    for (String raw : urls) {
      if (raw == null || raw.isBlank() || raw.length() > 2048) {
        throw invalid("Đường dẫn bằng chứng không hợp lệ");
      }

      String value = raw.strip();

      if (!unique.add(value)) {
        throw invalid("Ảnh bằng chứng bị gửi trùng");
      }

      if (value.startsWith("/uploads/")) {
        URI uri;

        try {
          uri = URI.create(value);
        } catch (IllegalArgumentException exception) {
          throw invalid("Đường dẫn bằng chứng không hợp lệ");
        }

        if (uri.getHost() != null
            || uri.getScheme() != null
            || value.contains("..")
            || value.contains("\\")) {
          throw invalid("Đường dẫn bằng chứng không hợp lệ");
        }

        continue;
      }

      URI uri;

      try {
        uri = URI.create(value);
      } catch (IllegalArgumentException exception) {
        throw invalid("Đường dẫn bằng chứng không hợp lệ");
      }

      if (!"https".equalsIgnoreCase(uri.getScheme())
          || uri.getHost() == null
          || uri.getHost().isBlank()
          || uri.getUserInfo() != null) {
        throw invalid("Bằng chứng phải là URL HTTPS hoặc đường dẫn /uploads/");
      }
    }
  }

  private LocalDateTime validateReceivedAt(DonHang order, OffsetDateTime occurredAt) {

    if (occurredAt == null || occurredAt.toInstant().isAfter(java.time.Instant.now())) {
      throw invalid("Thời điểm thực nhận không hợp lệ");
    }

    LocalDateTime receivedAt = occurredAt.atZoneSameInstant(zone()).toLocalDateTime();

    LocalDateTime exportedAt =
        entityManager
            .createQuery(
                """
                                select max(t.ngayTao)
                                from TheKho t
                                where t.maChungTuGoc = :orderId
                                  and t.loaiGiaoDich = :type
                                """,
                LocalDateTime.class)
            .setParameter("orderId", order.getId())
            .setParameter("type", LoaiGiaoDichKho.XUAT_BAN)
            .getSingleResult();

    if (exportedAt == null) {
      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY,
          "hang_nhan",
          "EXPORT_HISTORY_UNVERIFIED",
          "Thiếu thời điểm xuất kho gốc");
    }

    if (receivedAt.isBefore(exportedAt)
        || (order.getNgayTao() != null && receivedAt.isBefore(order.getNgayTao()))) {
      throw invalid("Thời điểm nhận hoàn không được nằm trước lần xuất kho");
    }

    return receivedAt;
  }

  private ReturnData returnData(PhieuTraHang document) {
    ReturnData response = mapper.toReturn(document, zone());

    response.setCanHoanTien(
        document.getTrangThaiTraHang() == TrangThaiTraHang.DA_NHAN_HANG
            && document.getTongTienHoan() != null
            && document.getTongTienHoan().signum() > 0);

    if (document.getDuLieuNhanHang() != null) {
      try {
        var source = objectMapper.readTree(document.getDuLieuNhanHang());

        if ("HOAN_GIAO_HANG".equals(source.path("nguon").asString())) {
          response.setNguonYeuCau("HOAN_GIAO_HANG");
        }
      } catch (RuntimeException ignored) {
        // Không tự dựng nguồn cho dữ liệu cũ thiếu bản chụp.
      }
    }

    return response;
  }

  private Map<Long, ChiTietTraHang> saveReturnLines(DonHang order, PhieuTraHang returnDocument) {

    var lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if (lines.isEmpty()) {
      throw new AppException(ErrorCode.UNPROCESSABLE_ENTITY, "Đơn hàng không có chi tiết xuất gốc");
    }

    Map<Long, BigDecimal> weights = new LinkedHashMap<>();
    BigDecimal weightTotal = BigDecimal.ZERO;

    for (var line : lines) {
      saleSnapshots.requireSnapshot(line);

      if (line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getThanhToanDong() == null
          || line.getThanhToanDong().signum() < 0) {

        throw new AppException(
            ErrorCode.UNPROCESSABLE_ENTITY, "Thiếu dữ liệu tiền đã chốt của dòng đơn");
      }

      BigDecimal weight =
          Boolean.TRUE.equals(line.getLaQuaTang()) ? BigDecimal.ZERO : line.getThanhToanDong();

      weights.put(line.getId(), weight);
      weightTotal = weightTotal.add(weight);
    }

    BigDecimal totalRefund = money(returnDocument.getTongTienHoan());

    /*
     * Hoàn giao nhận đủ toàn bộ hàng:
     * phân bổ khoản thực thu còn phải hoàn cho các dòng mua.
     * Quà luôn có tiền hoàn bằng 0.
     *
     * Nếu tiền hàng sau ưu đãi bằng 0 nhưng có phí giao đã thu,
     * dùng số lượng các dòng mua làm trọng số phân bổ khoản phí.
     */
    if (totalRefund.signum() > 0 && weightTotal.signum() == 0) {

      for (var line : lines) {
        if (!Boolean.TRUE.equals(line.getLaQuaTang())) {
          BigDecimal weight = BigDecimal.valueOf(line.getSoLuong());

          weights.put(line.getId(), weight);
          weightTotal = weightTotal.add(weight);
        }
      }
    }

    if (totalRefund.signum() > 0 && weightTotal.signum() == 0) {

      throw new AppException(
          ErrorCode.UNPROCESSABLE_ENTITY, "Không có dòng mua để đối soát khoản tiền cần hoàn");
    }

    Long lastWeightedLineId = null;

    for (var line : lines) {
      if (weights.get(line.getId()).signum() > 0) {
        lastWeightedLineId = line.getId();
      }
    }

    Map<Long, ChiTietTraHang> saved = new LinkedHashMap<>();
    BigDecimal allocated = BigDecimal.ZERO.setScale(2);

    for (var line : lines) {
      BigDecimal weight = weights.get(line.getId());
      BigDecimal amount = BigDecimal.ZERO.setScale(2);

      if (totalRefund.signum() > 0 && weight.signum() > 0) {
        amount =
            Objects.equals(line.getId(), lastWeightedLineId)
                ? totalRefund.subtract(allocated)
                : totalRefund.multiply(weight).divide(weightTotal, 0, RoundingMode.DOWN);
      }

      allocated = allocated.add(amount);

      ChiTietTraHang returnLine =
          returnLineRepository.save(
              ChiTietTraHang.builder()
                  .phieuTraHang(returnDocument)
                  .chiTietDonHang(line)
                  .soLuong(line.getSoLuong())
                  .donGiaHoan(
                      amount.divide(BigDecimal.valueOf(line.getSoLuong()), 2, RoundingMode.HALF_UP))
                  .thanhTienHoan(amount)
                  .build());

      saved.put(line.getId(), returnLine);
    }

    if (allocated.compareTo(totalRefund) != 0) {
      throw conflict("Tổng phân bổ tiền hoàn không khớp");
    }

    return saved;
  }

  private Action returnAction(PhieuGiaoHang delivery, PhieuTraHang returnDocument) {

    Action response = mapper.toAction(delivery, zone());
    response.setPhieuTraHang(returnData(returnDocument));

    response.setKhuyenMai(saleSnapshots.appliedPromotion(delivery.getDonHang().getId()));

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

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action changeStatus(Long id, String idempotencyKey, AdminDeliveryStatusRequest request) {

    validateId(id);

    return cashbookService.executeOnce(
        deliveryRequestKey("PGH-ST-", idempotencyKey),
        salesContext.actor(),
        List.of(id, request),
        Action.class,
        () -> changeStatus(id, request));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public Action receiveReturn(Long id, String idempotencyKey, AdminDeliveryReturnRequest request) {

    validateId(id);

    return cashbookService.executeOnce(
        deliveryRequestKey("PGH-RET-", idempotencyKey),
        salesContext.actor(),
        List.of(id, request),
        Action.class,
        () -> receiveReturn(id, request));
  }

  private String deliveryRequestKey(String prefix, String value) {
    if (value == null
        || !value.matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-" + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {

      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    String key = prefix + UUID.fromString(value);

    if (key.length() > 50) {
      throw new IllegalStateException("Khóa idempotency vượt 50 ký tự");
    }

    return key;
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

  private Map<String, Long> statusCounts(String keyword, Long partnerId) {
    Map<String, Long> counts = new LinkedHashMap<>();

    for (TrangThaiGiaoHangEnum value : TrangThaiGiaoHangEnum.values()) {
      counts.put(value.name(), 0L);
    }

    var cb = entityManager.getCriteriaBuilder();
    var query = cb.createTupleQuery();
    var root = query.from(PhieuGiaoHang.class);
    var status = root.<TrangThaiGiaoHangEnum>get("trangThaiGiaoHang");

    query.multiselect(status.alias("status"), cb.countDistinct(root.get("id")).alias("total"));

    // Giữ bộ lọc từ khóa và đối tác; thống kê tất cả trạng thái.
    var predicate =
        DeliverySpecification.build(keyword, null, partnerId).toPredicate(root, query, cb);

    if (predicate != null) {
      query.where(predicate);
    }

    query.groupBy(status);

    for (var row : entityManager.createQuery(query).getResultList()) {
      TrangThaiGiaoHangEnum value = row.get("status", TrangThaiGiaoHangEnum.class);

      if (value != null) {
        counts.put(value.name(), row.get("total", Long.class));
      }
    }

    return counts;
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
