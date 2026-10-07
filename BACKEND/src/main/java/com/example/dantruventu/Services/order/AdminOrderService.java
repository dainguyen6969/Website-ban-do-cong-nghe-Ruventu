package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.AdminOrderResponse;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Mapper.order.AdminOrderMapper;
import com.example.dantruventu.Mapper.order.AdminSalesMapper;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.LichSuXuLyDonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.partner.DoiTacVanChuyenRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.order.sales.AdminSalesService;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Specification.OrderSpecification;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
public class AdminOrderService {

  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository lineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final LichSuXuLyDonHangRepository historyRepository;
  private final DoiTacVanChuyenRepository partnerRepository;
  private final AnhSanPhamRepository imageRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final LoaiThuChiRepository cashTypeRepository;
  private final SoQuyThuChiRepository cashRepository;

  private final AdminOrderMapper mapper;
  private final AdminSalesMapper salesMapper;
  private final AdminSalesService salesService;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final SalesProperties properties;
  private final OrderInventoryService inventory;
  private final DeliveryInventoryService deliveryInventory;
  private final EntityManager entityManager;
  private final CashbookService cashbookService;

  public AdminSalesResponse.PageData<AdminOrderResponse.ListItem> list(
      String keyword,
      LoaiDonHang type,
      TrangThaiDonHang orderStatus,
      TrangThaiThanhToanDonHang paymentStatus,
      TrangThaiDongGoi packingStatus,
      TrangThaiXuatKho stockStatus,
      LocalDate from,
      LocalDate to,
      int pageNumber,
      int limit,
      String sort) {

    page(keyword, pageNumber, limit);

    if (from != null && to != null && from.isAfter(to)) {
      throw invalid("tu_ngay không được sau den_ngay");
    }

    if ((from != null && (from.getYear() < 1 || from.getYear() > 9999))
        || (to != null && (to.getYear() < 1 || to.getYear() > 9998))) {
      throw invalid("Khoảng ngày không hợp lệ");
    }

    var result =
        orderRepository.findAll(
            OrderSpecification.build(
                keyword, type, orderStatus, paymentStatus, packingStatus, stockStatus, from, to),
            PageRequest.of(pageNumber, limit, sort(sort)));

    Map<Long, Long> productByOrder = new HashMap<>();
    Map<Long, String> imageByProduct = new HashMap<>();
    Map<Long, PhieuGiaoHang> deliveryByOrder = new HashMap<>();

    if (!result.isEmpty()) {
      var ids = result.getContent().stream().map(DonHang::getId).toList();

      for (var delivery : deliveryRepository.findByDonHang_IdInOrderByIdAsc(ids)) {
        // ID tăng dần: phiếu sau cùng là phiếu giao gần nhất của đơn.
        deliveryByOrder.put(delivery.getDonHang().getId(), delivery);
      }

      for (var line : lineRepository.findFirstLinesForOrders(ids)) {
        productByOrder.put(line.getDonHang().getId(), line.getPhienBan().getSanPham().getId());
      }
    }

    List<AdminOrderResponse.ListItem> items = new ArrayList<>();

    for (DonHang order : result.getContent()) {
      var response = mapper.toListItem(order, properties.zone());

      response.setHinhThucNhanHang(shipping(order) ? "GIAO_HANG" : "NHAN_TAI_CUA_HANG");

      PhieuGiaoHang latestDelivery = deliveryByOrder.get(order.getId());

      response.setPhieuGiaoHangGanNhatId(latestDelivery == null ? null : latestDelivery.getId());

      response.setTrangThaiGiaoHang(
          latestDelivery == null ? null : latestDelivery.getTrangThaiGiaoHang());
      if (order.getKhachHang() == null) {
        response.setTenKhachHang("Khách lẻ");
      }

      Long productId = productByOrder.get(order.getId());

      if (productId != null) {
        if (!imageByProduct.containsKey(productId)) {
          String image =
              imageRepository
                  .findFirstBySanPham_IdOrderByLaAnhChinhDescThuTuHienThiAscIdAsc(productId)
                  .map(AnhSanPham::getDuongDanAnh)
                  .orElse(null);

          imageByProduct.put(productId, image);
        }

        response.setAnhDaiDienSanPham(imageByProduct.get(productId));
      }

      items.add(response);
    }

    return new AdminSalesResponse.PageData<>(items, pagination(result));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action update(Long id, AdminSalesRequest.Online request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI) {
      throw conflict("Chỉ sửa đơn Online chờ duyệt, chưa thanh toán và chưa đóng gói");
    }

    if (request.getMaChuongTrinh() != null) {
      throw invalid("Sửa đơn không nhận ma_chuong_trinh; hãy preview không khuyến mại");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn đã có lịch sử giao hàng, không được sửa nội dung");
    }

    requireNoCash(order);
    inventory.requireNoExport(order);

    NguoiDung customer = context.customer(request.getKhachHangId(), true);

    String address = text(request.getThongTinNguoiNhan().getDiaChiGiaoHang());

    if ("GIAO_HANG".equals(request.getHinhThucNhanHang())) {
      if (address == null) {
        throw invalid("Đơn giao hàng phải có địa chỉ");
      }
    } else if (address != null || inputMoney(request.getPhiGiaoHang()).signum() != 0) {
      throw invalid("Nhận tại cửa hàng phải có địa chỉ null và phí giao hàng bằng 0");
    }

    var plan = calculation.calculate(request, LoaiDonHang.ONLINE, true);

    if (inputMoney(request.getTongThanhToanXacNhan()).compareTo(plan.data().getTongThanhToan())
        != 0) {
      throw conflict("Tổng tiền thay đổi; hãy gọi preview và xác nhận lại");
    }

    order.setKhachHang(customer);
    order.setTenNguoiNhan(request.getThongTinNguoiNhan().getTenNguoiNhan().strip());
    order.setSdtNguoiNhan(request.getThongTinNguoiNhan().getSdtNguoiNhan());
    order.setDiaChiGiaoHang(address);
    order.setPhuongThucThanhToan(request.getPhuongThucThanhToan());
    order.setMaGiaoDichThanhToan(null);
    order.setTongTienHang(plan.data().getTongTienHang());
    order.setTienChietKhau(plan.data().getTienChietKhau());
    order.setPhiGiaoHang(plan.data().getPhiGiaoHang());
    order.setTongThanhToan(plan.data().getTongThanhToan());
    order.setGhiChu(text(request.getGhiChu()));

    lineRepository.deleteAll(lineRepository.findByDonHang_IdOrderByIdAsc(order.getId()));
    lineRepository.flush();

    for (var line : plan.lines()) {
      lineRepository.save(
          ChiTietDonHang.builder()
              .donHang(order)
              .phienBan(line.variant())
              .soLuong(line.quantity())
              .donGia(line.unitPrice())
              .thanhTien(line.amount())
              .build());
    }

    // Không hoàn lượt khuyến mại cũ, không tiêu thụ lượt mới.
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action approve(Long id) {
    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      throw conflict("Đơn không còn ở trạng thái chờ duyệt hợp lệ");
    }

    if (!lockDeliveries(order).isEmpty()) {
      throw conflict("Đơn chờ duyệt không được có phiếu giao");
    }

    inventory.requireNoExport(order);
    requireNoCash(order);
    validateStoredAmounts(order);
    inventory.checkAvailable(order);

    if (money(order.getTongThanhToan()).signum() == 0) {
      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    }

    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);

    // Duyệt chưa giữ hàng và không tính lại giá danh mục.
    recordHistory(order, "DUYET_DON", "Duyệt đơn hàng");
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action fulfillment(Long id, AdminOrderRequest.Fulfillment request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận bắt đầu đóng gói");
    }

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.HUY_DONG_GOI) {
      throw conflict("Đơn đã bắt đầu xử lý");
    }

    List<PhieuGiaoHang> deliveries = lockDeliveries(order);

    if (!effective(deliveries).isEmpty()) {
      throw conflict("Đơn đã có phiếu giao còn hiệu lực");
    }

    DoiTacVanChuyen partner = null;
    BigDecimal partnerFee = BigDecimal.ZERO;

    // Chấp nhận client cũ gửi đủ đối tác/phí; client mới chọn ở bước bắt đầu giao hàng.
    if (shipping(order)
        && (request.getDoiTacVanChuyenId() != null || request.getPhiTraDoiTac() != null)) {
      if (request.getDoiTacVanChuyenId() == null || request.getPhiTraDoiTac() == null) {
        throw invalid("Giao hàng phải chọn đối tác và phí trả đối tác");
      }

      partner =
          partnerRepository
              .findByIdForShare(request.getDoiTacVanChuyenId())
              .orElseThrow(() -> notFound("Đối tác vận chuyển không tồn tại"));

      if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
        throw conflict("Đối tác vận chuyển đã ngừng hoạt động");
      }

      partnerFee = inputMoney(request.getPhiTraDoiTac());
    } else if (!shipping(order)
        && (request.getDoiTacVanChuyenId() != null || request.getPhiTraDoiTac() != null)) {
      throw invalid("Nhận tại cửa hàng không gửi đối tác hoặc phí trả đối tác");
    }

    inventory.reserve(order);

    order.setTrangThaiDongGoi(TrangThaiDongGoi.DANG_DONG_GOI);

    if (partner != null) {
      deliveryRepository.save(
          PhieuGiaoHang.builder()
              .maPhieuGiaoHang(
                  "PGH" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
              .donHang(order)
              .doiTacVanChuyen(partner)
              .trangThaiGiaoHang(TrangThaiGiaoHangEnum.CHO_GIAO)
              .tienThuHoCod(
                  order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN
                      ? BigDecimal.ZERO
                      : money(order.getTongThanhToan()))
              .phiTraDoiTac(partnerFee)
              .ngayCapNhat(now())
              .build());
    }

    recordHistory(order, "BAT_DAU_DONG_GOI", "Bắt đầu đóng gói");
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action startDelivery(Long id, AdminOrderRequest.DeliveryStart request) {

    DonHang order = lockOrder(id);
    requireOnline(order);

    if (!Boolean.TRUE.equals(request.getXacNhan())) {
      throw invalid("Phải xác nhận bắt đầu giao hàng");
    }

    validateId(request.getDoiTacVanChuyenId());

    BigDecimal partnerFee = request.getPhiTraDoiTac();

    if (partnerFee == null
        || partnerFee.signum() < 0
        || partnerFee.compareTo(new BigDecimal("9999999999999.99")) > 0
        || partnerFee.stripTrailingZeros().scale() > 2) {
      throw invalid("Phí trả đối tác phải không âm và tối đa hai chữ số thập phân");
    }

    partnerFee = partnerFee.setScale(2);

    if (!shipping(order)
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO) {
      throw conflict("Chỉ bắt đầu giao đơn giao hàng đã đóng gói và xuất kho");
    }

    var active = effective(lockDeliveries(order));

    if (active.size() > 1) {
      throw conflict("Đơn có nhiều phiếu giao còn hiệu lực");
    }

    PhieuGiaoHang delivery = active.isEmpty() ? null : active.get(0);

    // Client cũ không gửi ma_van_don: giữ mã hiện tại.
    // Client gửi chuỗi rỗng: bàn giao không có mã vận đơn.
    String tracking =
        request.getMaVanDon() == null
            ? (delivery == null ? null : delivery.getMaVanDon())
            : text(request.getMaVanDon());

    if (tracking != null && tracking.length() > 50) {
      throw invalid("Mã vận đơn tối đa 50 ký tự");
    }

    // Gửi lại cùng thao tác đã thành công: trả kết quả hiện tại.
    if (order.getTrangThaiDonHang() == TrangThaiDonHang.DANG_GIAO_HANG
        && delivery != null
        && delivery.getTrangThaiGiaoHang() == TrangThaiGiaoHangEnum.DA_NHAN_HANG
        && Objects.equals(delivery.getDoiTacVanChuyen().getId(), request.getDoiTacVanChuyenId())
        && delivery.getPhiTraDoiTac().compareTo(partnerFee) == 0
        && Objects.equals(delivery.getMaVanDon(), tracking)) {
      return action(order);
    }

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_LAY_HANG
        || (delivery != null
            && delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO)) {
      throw conflict("Chỉ bắt đầu giao khi đơn đang chờ lấy hàng, chưa bàn giao đối tác");
    }

    DoiTacVanChuyen partner =
        partnerRepository
            .findByIdForShare(request.getDoiTacVanChuyenId())
            .orElseThrow(() -> notFound("Đối tác vận chuyển không tồn tại"));

    if (partner.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG) {
      throw conflict("Đối tác vận chuyển đã ngừng hoạt động");
    }

    if (tracking != null
        && deliveryRepository.existsByMaVanDonIgnoreCaseAndIdNot(
            tracking, delivery == null ? 0L : delivery.getId())) {
      throw conflict("Mã vận đơn đã được sử dụng");
    }

    if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
        && order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {
      throw conflict("Trạng thái thanh toán không hợp lệ");
    }

    if (delivery == null) {
      delivery =
          PhieuGiaoHang.builder()
              .maPhieuGiaoHang(
                  "PGH" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
              .donHang(order)
              .build();
    }

    delivery.setDoiTacVanChuyen(partner);
    delivery.setPhiTraDoiTac(partnerFee);
    delivery.setMaVanDon(tracking);

    delivery.setTienThuHoCod(
        order.getTrangThaiThanhToan() == TrangThaiThanhToanDonHang.DA_THANH_TOAN
            ? BigDecimal.ZERO
            : money(order.getTongThanhToan()));

    delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.DA_NHAN_HANG);
    delivery.setNgayCapNhat(now());

    deliveryRepository.save(delivery);
    order.setTrangThaiDonHang(TrangThaiDonHang.DANG_GIAO_HANG);

    recordHistory(
        order,
        "GIAO_VAN_DA_NHAN_HANG",
        "Bàn giao hàng cho đối tác; phiếu " + delivery.getMaPhieuGiaoHang());

    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action packing(Long id, AdminOrderRequest.Packing request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    var deliveries = lockDeliveries(order);
    TrangThaiDongGoi target = request.getTrangThaiDongGoi();

    if (target == TrangThaiDongGoi.DA_DONG_GOI) {
      if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DANG_DONG_GOI) {
        throw conflict("Chỉ hoàn tất khi đang đóng gói");
      }

      order.setTrangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI);

    } else if (target == TrangThaiDongGoi.HUY_DONG_GOI) {
      if (!hasReservation(order)) {
        throw conflict("Đơn không có phần giữ hàng để hủy");
      }

      cancelWaitingDeliveries(deliveries);
      deliveryInventory.releaseReservation(order);
      order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);

    } else {
      throw invalid("Chỉ nhận DA_DONG_GOI hoặc HUY_DONG_GOI");
    }

    recordPackingHistory(order);
    return action(order);
  }

  public List<AdminOrderResponse.History> history(Long id) {
    findOrder(id);
    return historyRepository.findByDonHang_IdOrderByNgayThucHienAscIdAsc(id).stream()
        .map(
            event ->
                new AdminOrderResponse.History(
                    event.getId(),
                    event.getHanhDong(),
                    event.getMoTa(),
                    event.getNguoiThucHien().getHoTen(),
                    event.getNgayThucHien().atZone(properties.zone()).toOffsetDateTime(),
                    event.getTrangThaiDonHang(),
                    event.getTrangThaiDongGoi(),
                    event.getTrangThaiXuatKho()))
        .toList();
  }

  private void recordPackingHistory(DonHang order) {
    switch (order.getTrangThaiDongGoi()) {
      case DA_DONG_GOI -> recordHistory(order, "HOAN_TAT_DONG_GOI", "Hoàn tất đóng gói");
      case HUY_DONG_GOI -> recordHistory(order, "HUY_DONG_GOI", "Hủy đóng gói");
      default -> throw invalid("Trạng thái đóng gói không hợp lệ");
    }
  }

  void recordHistory(DonHang order, String action, String description) {
    historyRepository.save(
        LichSuXuLyDonHang.builder()
            .donHang(order)
            .nguoiThucHien(context.actor())
            .hanhDong(action)
            .moTa(description)
            .ngayThucHien(now())
            .trangThaiDonHang(order.getTrangThaiDonHang())
            .trangThaiDongGoi(order.getTrangThaiDongGoi())
            .trangThaiXuatKho(order.getTrangThaiXuatKho())
            .build());
  }

  public AdminOrderResponse.Requirements requirements(Long id) {
    DonHang order = findOrder(id);
    requireSerialPreparation(order);

    var plan = inventory.plan(order, false);

    return new AdminOrderResponse.Requirements(
        order.getId(),
        order.getTrangThaiDonHang(),
        order.getTrangThaiDongGoi(),
        order.getTrangThaiXuatKho(),
        plan.requirements());
  }

  public AdminOrderResponse.Candidates candidates(
      Long id,
      Long lineId,
      Long variantId,
      String keyword,
      String exactSerial,
      int pageNumber,
      int limit) {

    validateId(lineId);
    validateId(variantId);

    var pageable = page(keyword, pageNumber, limit);

    if (exactSerial != null && exactSerial.length() > 100) {
      throw invalid("so_serial tối đa 100 ký tự");
    }

    DonHang order = findOrder(id);
    requireSerialPreparation(order);

    var plan = inventory.plan(order, false);

    if (plan.lines().stream().noneMatch(x -> x.getId().equals(lineId))) {
      throw notFound("Chi tiết đơn hàng không thuộc đơn này");
    }

    if (!variantRepository.existsById(variantId)) {
      throw notFound("Phiên bản không tồn tại");
    }

    Integer required = plan.serials().get(new OrderInventoryService.Key(lineId, variantId));

    if (required == null) {
      throw conflict("Phiên bản không thuộc yêu cầu serial của dòng đơn");
    }

    String exact = text(exactSerial);
    String word = text(keyword);

    Specification<SoSerialSanPham> specification =
        (root, query, cb) -> {
          var condition =
              cb.and(
                  cb.equal(root.get("phienBan").get("id"), variantId),
                  cb.equal(root.get("trangThai"), TrangThaiSerial.TRONG_KHO),
                  cb.isNull(root.get("donHang")));

          if (exact != null) {
            return cb.and(condition, cb.equal(root.get("soSerial"), exact));
          }

          if (word != null) {
            String pattern =
                "%"
                    + word.toLowerCase(Locale.ROOT)
                        .replace("!", "!!")
                        .replace("%", "!%")
                        .replace("_", "!_")
                    + "%";

            return cb.and(condition, cb.like(cb.lower(root.get("soSerial")), pattern, '!'));
          }

          return condition;
        };

    var result = serialRepository.findAll(specification, pageable);

    return new AdminOrderResponse.Candidates(
        lineId,
        variantId,
        required,
        result.getContent().stream().map(salesMapper::toSerial).toList(),
        pagination(result));
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action export(Long id, AdminOrderRequest.Export request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);
    requireProcessing(order);

    if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI) {
      throw conflict("Phải hoàn tất đóng gói trước khi xuất");
    }

    var active = effective(lockDeliveries(order));

    if (shipping(order)) {
      if (active.size() > 1
          || (!active.isEmpty()
              && active.get(0).getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO)) {
        throw conflict("Đơn giao hàng chỉ được có tối đa một phiếu CHO_GIAO");
      }
    } else if (!active.isEmpty()) {
      throw conflict("Đơn nhận tại cửa hàng không được có phiếu giao hiệu lực");
    }

    inventory.export(order, request);

    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO);
    order.setTrangThaiDonHang(TrangThaiDonHang.CHO_LAY_HANG);

    recordHistory(order, "XUAT_KHO", "Xuất kho đơn hàng");
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action confirmPayment(
      Long id, String idempotencyKey, AdminOrderRequest.Payment request) {

    NguoiDung actor = context.actor();

    String key = paymentRequestKey("THU-DH-REQ-", idempotencyKey);

    return cashbookService.executeOnce(
        key,
        actor,
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> doConfirmPayment(id, request, actor));
  }

  private AdminOrderResponse.Action doConfirmPayment(
      Long id, AdminOrderRequest.Payment request, NguoiDung actor) {

    DonHang order = lockOrder(id);

    requireOnline(order);
    validateStoredAmounts(order);

    if (!Boolean.TRUE.equals(request.getXacNhanDaNhanTien())) {
      throw invalid("Phải xác nhận cửa hàng đã thực nhận tiền");
    }

    validatePaymentMethod(request.getPhuongThucThanhToan(), request.getMaGiaoDichThanhToan());

    BigDecimal total = money(order.getTongThanhToan());
    BigDecimal received = inputMoney(request.getSoTienThanhToan());

    if (total.signum() <= 0) {
      throw conflict("Đơn có tổng tiền bằng 0 không phát sinh phiếu thu");
    }

    if (received.signum() <= 0) {
      throw invalid("Số tiền thực nhận phải lớn hơn 0");
    }

    // Thống nhất thứ tự khóa: đơn hàng trước, phiếu giao hàng sau.
    List<PhieuGiaoHang> deliveries = lockDeliveries(order);

    SoQuyThuChi receipt;

    if ("KHACH_HANG".equals(request.getNguonThu())) {

      if (request.getPhieuGiaoHangId() != null) {
        throw invalid("Thu trực tiếp từ khách không được gửi phieu_giao_hang_id");
      }

      Set<TrangThaiDonHang> allowedStates =
          Set.of(
              TrangThaiDonHang.CHO_THANH_TOAN,
              TrangThaiDonHang.CHO_DONG_GOI,
              TrangThaiDonHang.CHO_LAY_HANG);

      if (!allowedStates.contains(order.getTrangThaiDonHang())) {
        throw conflict("Chỉ thu tiền khách sau duyệt và trước khi hoàn tất bàn giao");
      }

      if (order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN) {

        throw conflict("Đơn hàng đã được xác nhận thanh toán");
      }

      if (order.getTrangThaiXuatKho() == TrangThaiXuatKho.DA_HOAN_KHO) {
        throw conflict("Không thu tiền trực tiếp cho đơn đã hoàn kho");
      }

      for (PhieuGiaoHang delivery : effective(deliveries)) {
        if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {

          throw conflict(
              "Hàng đã bàn giao đối tác; không được thu trực tiếp " + "thay cho nghiệp vụ nộp COD");
        }
      }

      if (received.compareTo(total) != 0) {
        throw invalid("MVP phải thu đủ một lần, số tiền phải bằng tổng thanh toán");
      }

      requireNoCash(order);

      receipt =
          createCash(
              order,
              actor,
              "THU-DH-" + order.getId(),
              LoaiPhieuThuChi.THU,
              "THU_BAN_HANG",
              NhomNguoiNopNhanEnum.KHACH_HANG,
              order.getKhachHang(),
              null,
              customerName(order),
              received,
              request.getPhuongThucThanhToan(),
              request.getNgayThanhToan(),
              request.getMaGiaoDichThanhToan(),
              "Cửa hàng thực nhận tiền thanh toán từ khách");

      order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);

      order.setPhuongThucThanhToan(request.getPhuongThucThanhToan());

      order.setMaGiaoDichThanhToan(text(request.getMaGiaoDichThanhToan()));

      if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_THANH_TOAN) {

        order.setTrangThaiDonHang(TrangThaiDonHang.CHO_DONG_GOI);
      }

      // Khách đã trả trực tiếp: các phiếu chưa bàn giao không thu COD nữa.
      for (PhieuGiaoHang delivery : effective(deliveries)) {
        delivery.setTienThuHoCod(BigDecimal.ZERO);
        delivery.setNgayCapNhat(now());
      }

    } else if ("DOI_TAC_GIAO_HANG".equals(request.getNguonThu())) {

      if (request.getPhieuGiaoHangId() == null) {
        throw invalid("Thu COD phải có phieu_giao_hang_id");
      }

      PhieuGiaoHang delivery =
          deliveries.stream()
              .filter(item -> Objects.equals(item.getId(), request.getPhieuGiaoHangId()))
              .findFirst()
              .orElseThrow(() -> notFound("Phiếu giao hàng không tồn tại hoặc không thuộc đơn"));

      if (order.getTrangThaiDonHang() != TrangThaiDonHang.HOAN_THANH
          || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN
          || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO
          || delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.GIAO_THANH_CONG) {

        throw conflict("Chỉ nhận COD khi giao thành công và khách đã thanh toán");
      }

      if (delivery.getDoiTacVanChuyen() == null) {
        throw conflict("Phiếu giao hàng chưa có đối tác vận chuyển");
      }

      BigDecimal cod = delivery.getTienThuHoCod();

      if (cod == null || cod.signum() <= 0) {
        throw conflict("Phiếu giao hàng không có khoản COD phải nộp");
      }

      if (cod.compareTo(total) != 0) {
        throw conflict("Tiền COD không khớp tổng thanh toán theo quy tắc thu đủ của MVP");
      }

      if (received.compareTo(cod) != 0) {
        throw invalid("Số tiền đối tác nộp phải bằng toàn bộ COD của phiếu giao hàng");
      }

      // Không được vừa thực thu trực tiếp vừa thực thu COD cho cùng đơn.
      if (sumCash(order, LoaiPhieuThuChi.THU).signum() != 0
          || sumCash(order, LoaiPhieuThuChi.CHI).signum() != 0) {

        throw conflict("Đơn đã có thực thu hoặc hoàn tiền; cần đối soát trước khi nhận COD");
      }

      receipt =
          createCash(
              order,
              actor,
              "THU-COD-" + delivery.getId(),
              LoaiPhieuThuChi.THU,
              "THU_BAN_HANG",
              NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG,
              null,
              delivery.getDoiTacVanChuyen(),
              delivery.getDoiTacVanChuyen().getTenDoiTac(),
              received,
              request.getPhuongThucThanhToan(),
              request.getNgayThanhToan(),
              request.getMaGiaoDichThanhToan(),
              "Cửa hàng thực nhận COD từ đối tác, phiếu " + delivery.getMaPhieuGiaoHang());

      /*
       * Giữ phương thức khách đã thanh toán trên don_hang.
       *
       * Phương thức đối tác nộp COD được lưu trên phiếu thu.
       * Không đổi tien_thu_ho_cod thành 0 vì đây là giá trị
       * COD lịch sử của phiếu giao hàng.
       */

    } else {
      throw invalid("Nguồn thu không hợp lệ");
    }

    recordHistory(order, "XAC_NHAN_THU_TIEN", "Ghi nhận thực thu " + receipt.getMaPhieu());

    AdminOrderResponse.Action response = action(order);

    response.setPhieuThu(mapper.toCashDocument(receipt, properties.zone()));

    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action cancel(Long id, AdminOrderRequest.Cancel request) {

    DonHang order = lockOrder(id);
    requireOnline(order);
    requireUnexported(order);

    if (!Set.of(
            TrangThaiDonHang.CHO_DUYET,
            TrangThaiDonHang.CHO_THANH_TOAN,
            TrangThaiDonHang.CHO_DONG_GOI)
        .contains(order.getTrangThaiDonHang())) {
      throw conflict("Đơn không còn được phép hủy trực tiếp");
    }

    inventory.requireNoExport(order);

    var deliveries = lockDeliveries(order);
    cancelWaitingDeliveries(deliveries);

    if (hasReservation(order)) {
      deliveryInventory.releaseReservation(order);
      order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);
    } else if (order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
        && order.getTrangThaiDongGoi() != TrangThaiDongGoi.HUY_DONG_GOI) {
      throw conflict("Trạng thái đóng gói không nhất quán");
    }

    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);

    String note = "[Hủy đơn] " + request.getLyDo().strip();
    order.setGhiChu(text(order.getGhiChu()) == null ? note : order.getGhiChu() + "\n" + note);

    // Giữ trạng thái thanh toán và các phiếu thu đã phát sinh.
    recordHistory(order, "HUY_DON", "Hủy đơn hàng trước xuất kho");
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action pickup(Long id) {
    DonHang order = lockOrder(id);
    requireOnline(order);

    if (shipping(order)
        || order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_LAY_HANG
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.DA_DONG_GOI
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.DA_XUAT_KHO
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN) {
      throw conflict("Chỉ bàn giao tại cửa hàng khi đã thanh toán và xuất kho đầy đủ");
    }

    if (!effective(lockDeliveries(order)).isEmpty()) {
      throw conflict("Đơn đang có phiếu giao hàng hiệu lực");
    }

    order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);
    recordHistory(order, "XAC_NHAN_NHAN_TAI_CUA_HANG", "Xác nhận khách đã nhận hàng tại cửa hàng");
    return action(order);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminOrderResponse.Action refund(
      Long id, String idempotencyKey, AdminOrderRequest.Refund request) {

    NguoiDung actor = context.actor();

    String key = paymentRequestKey("HOAN-DH-REQ-", idempotencyKey);

    return cashbookService.executeOnce(
        key,
        actor,
        List.of(id, request),
        AdminOrderResponse.Action.class,
        () -> doRefund(id, request, actor));
  }

  private AdminOrderResponse.Action doRefund(
      Long id, AdminOrderRequest.Refund request, NguoiDung actor) {

    DonHang order = lockOrder(id);

    requireOnline(order);
    requireUnexported(order);
    inventory.requireNoExport(order);

    if (!Boolean.TRUE.equals(request.getXacNhanDaHoanTien())) {
      throw invalid("Phải xác nhận đã hoàn tiền thực tế cho khách");
    }

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.HUY_HANG
        || order.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.DA_THANH_TOAN) {

      throw conflict("Chỉ hoàn tiền đơn đã hủy, đã thanh toán và chưa xuất kho");
    }

    validatePaymentMethod(request.getPhuongThucHoan(), request.getMaGiaoDich());

    SoQuyThuChi original =
        cashRepository
            .findByMaPhieu("THU-DH-" + order.getId())
            .orElseThrow(() -> conflict("Không có phiếu thực thu tự động của đơn hàng"));

    BigDecimal total = money(order.getTongThanhToan());

    boolean validOriginal =
        total.signum() > 0
            && original.getLoaiPhieu() == LoaiPhieuThuChi.THU
            && original.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
            && original.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
            && original.getLoaiThuChi() != null
            && "THU_BAN_HANG".equals(original.getLoaiThuChi().getMaLoai())
            && Objects.equals(original.getMaChungTuThamChieu(), order.getMaDonHang())
            && matchesCustomerCounterparty(order, original)
            && original.getSoTien() != null
            && original.getSoTien().compareTo(total) == 0;

    if (!validOriginal) {
      throw conflict("Phiếu thực thu không khớp đơn hàng hoặc đối tượng thanh toán");
    }

    if (sumCash(order, LoaiPhieuThuChi.THU).compareTo(total) != 0) {
      throw conflict("Tổng tiền thực thu không nhất quán, cần đối soát trước khi hoàn");
    }

    if (sumCash(order, LoaiPhieuThuChi.CHI).signum() != 0
        || cashRepository.findByMaPhieu("CHI-HUY-DH-" + order.getId()).isPresent()) {

      throw conflict("Đơn hàng đã có chứng từ hoàn tiền");
    }

    /*
     * Số tiền hoàn lấy từ chứng từ đã thực thu.
     * Request không được quyết định số tiền này.
     */
    SoQuyThuChi expense =
        createCash(
            order,
            actor,
            "CHI-HUY-DH-" + order.getId(),
            LoaiPhieuThuChi.CHI,
            "CHI_HOAN_DON_HANG",
            NhomNguoiNopNhanEnum.KHACH_HANG,
            order.getKhachHang(),
            null,
            customerName(order),
            original.getSoTien(),
            request.getPhuongThucHoan(),
            request.getNgayHoanTien(),
            request.getMaGiaoDich(),
            "Ghi nhận đã hoàn tiền đơn hủy trước xuất kho");

    /*
     * Giữ DA_THANH_TOAN để thể hiện lịch sử khách đã thanh toán.
     * Khoản hoàn được thể hiện bằng phiếu CHI riêng.
     */
    recordHistory(order, "HOAN_TIEN_DON_HUY", "Ghi nhận hoàn tiền " + expense.getMaPhieu());

    AdminOrderResponse.Action response = action(order);

    response.setPhieuChi(mapper.toCashDocument(expense, properties.zone()));

    return response;
  }

  private SoQuyThuChi createCash(
      DonHang order,
      NguoiDung actor,
      String code,
      LoaiPhieuThuChi type,
      String typeCode,
      NhomNguoiNopNhanEnum group,
      NguoiDung counterpartyUser,
      DoiTacVanChuyen counterpartyPartner,
      String payer,
      BigDecimal amount,
      String method,
      OffsetDateTime date,
      String transactionCode,
      String description) {

    String reference = text(transactionCode);

    return cashbookService.createAutomatic(
        CashbookService.AutomaticVoucher.builder()
            .maPhieu(code)
            .loaiPhieu(type)
            .maLoaiThuChi(typeCode)
            .nhomNguoiNopNhan(group)
            .nguoiNopNhan(counterpartyUser)
            .doiTacVanChuyen(counterpartyPartner)
            .tenDoiTuongTuDo(counterpartyUser == null && counterpartyPartner == null ? payer : null)
            .maChungTuThamChieu(order.getMaDonHang())
            .soTien(amount)
            .phuongThucThanhToan(method)
            .ngayGhiNhan(date)
            .moTa(description + (reference == null ? "" : "; Mã giao dịch: " + reference))
            .nguoiTao(actor)
            .build());
  }

  private void validatePaymentMethod(String method, String transactionCode) {
    if ("THE".equals(method) && !properties.isCardEnabled()) {
      throw conflict("Chưa bật phương thức thanh toán thẻ");
    }

    if (!"TIEN_MAT".equals(method) && text(transactionCode) == null) {
      throw invalid("Chuyển khoản/thẻ phải có mã giao dịch");
    }
  }

  private BigDecimal sumCash(DonHang order, LoaiPhieuThuChi type) {

    return cashRepository.findByMaChungTuThamChieu(order.getMaDonHang()).stream()
        .filter(
            voucher ->
                voucher.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
                    && voucher.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
                    && voucher.getLoaiPhieu() == type)
        .filter(voucher -> belongsToOrderCashFlow(order, voucher, type))
        .map(SoQuyThuChi::getSoTien)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private boolean belongsToOrderCashFlow(DonHang order, SoQuyThuChi voucher, LoaiPhieuThuChi type) {

    if (voucher.getLoaiThuChi() == null
        || voucher.getSoTien() == null
        || voucher.getSoTien().signum() <= 0
        || voucher.getNhaCungCap() != null) {

      return false;
    }

    String cashType = voucher.getLoaiThuChi().getMaLoai();

    if (type == LoaiPhieuThuChi.CHI) {
      return "CHI_HOAN_DON_HANG".equals(cashType)
          && Objects.equals(voucher.getMaPhieu(), "CHI-HUY-DH-" + order.getId())
          && matchesCustomerCounterparty(order, voucher);
    }

    if (!"THU_BAN_HANG".equals(cashType)) {
      return false;
    }

    if (Objects.equals(voucher.getMaPhieu(), "THU-DH-" + order.getId())) {

      return matchesCustomerCounterparty(order, voucher);
    }

    if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.DOI_TAC_GIAO_HANG
        || voucher.getNguoiNopNhan() != null
        || voucher.getDoiTacVanChuyen() == null) {

      return false;
    }

    return deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
        .anyMatch(
            delivery ->
                Objects.equals(voucher.getMaPhieu(), "THU-COD-" + delivery.getId())
                    && delivery.getDoiTacVanChuyen() != null
                    && Objects.equals(
                        voucher.getDoiTacVanChuyen().getId(),
                        delivery.getDoiTacVanChuyen().getId()));
  }

  private boolean matchesCustomerCounterparty(DonHang order, SoQuyThuChi voucher) {

    if (voucher.getNhomNguoiNopNhan() != NhomNguoiNopNhanEnum.KHACH_HANG
        || voucher.getNhaCungCap() != null
        || voucher.getDoiTacVanChuyen() != null) {

      return false;
    }

    Long customerId = order.getKhachHang() == null ? null : order.getKhachHang().getId();

    Long counterpartyId =
        voucher.getNguoiNopNhan() == null ? null : voucher.getNguoiNopNhan().getId();

    return Objects.equals(customerId, counterpartyId);
  }

  private void requireNoCash(DonHang order) {
    if (sumCash(order, LoaiPhieuThuChi.THU).signum() != 0
        || sumCash(order, LoaiPhieuThuChi.CHI).signum() != 0) {
      throw conflict("Đơn đã có khoản thực thu/chi, không xử lý trùng");
    }
  }

  private void validateStoredAmounts(DonHang order) {
    BigDecimal goods = money(order.getTongTienHang());
    BigDecimal discount =
        order.getTienChietKhau() == null ? BigDecimal.ZERO : money(order.getTienChietKhau());
    BigDecimal shippingFee =
        order.getPhiGiaoHang() == null ? BigDecimal.ZERO : money(order.getPhiGiaoHang());
    BigDecimal total = money(order.getTongThanhToan());

    if (discount.compareTo(goods) > 0
        || total.subtract(goods).add(discount).subtract(shippingFee).signum() < 0) {
      throw conflict("Tổng tiền đã lưu trên đơn không hợp lệ");
    }

    BigDecimal sum = BigDecimal.ZERO;

    for (var line : lineRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {
      if (line.getSoLuong() == null
          || line.getSoLuong() <= 0
          || line.getDonGia() == null
          || line.getDonGia().signum() < 0
          || line.getThanhTien() == null
          || line.getDonGia()
                  .multiply(BigDecimal.valueOf(line.getSoLuong()))
                  .compareTo(line.getThanhTien())
              != 0) {
        throw conflict("Thành tiền dòng đơn không hợp lệ");
      }

      sum = sum.add(line.getThanhTien());
    }

    if (sum.compareTo(goods) != 0) {
      throw conflict("Tổng tiền hàng không khớp các dòng đơn");
    }
  }

  private List<PhieuGiaoHang> lockDeliveries(DonHang order) {
    List<PhieuGiaoHang> locked = new ArrayList<>();

    for (var item : deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId())) {
      PhieuGiaoHang delivery =
          deliveryRepository
              .findByIdForUpdate(item.getId())
              .orElseThrow(() -> conflict("Phiếu giao hàng đã thay đổi"));

      entityManager.refresh(delivery);
      locked.add(delivery);
    }

    return locked;
  }

  private List<PhieuGiaoHang> effective(List<PhieuGiaoHang> deliveries) {
    return deliveries.stream()
        .filter(x -> x.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.HUY_GIAO_HANG)
        .filter(x -> x.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.DA_HOAN_HANG)
        .toList();
  }

  private void cancelWaitingDeliveries(List<PhieuGiaoHang> deliveries) {
    for (var delivery : effective(deliveries)) {
      if (delivery.getTrangThaiGiaoHang() != TrangThaiGiaoHangEnum.CHO_GIAO) {
        throw conflict("Có phiếu đã bàn giao đối tác, không được hủy trực tiếp");
      }
    }

    for (var delivery : effective(deliveries)) {
      delivery.setTrangThaiGiaoHang(TrangThaiGiaoHangEnum.HUY_GIAO_HANG);
      delivery.setNgayCapNhat(now());
    }
  }

  private DonHang lockOrder(Long id) {
    validateId(id);
    context.actor();

    DonHang order =
        orderRepository.findByIdForUpdate(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    entityManager.refresh(order);
    return order;
  }

  private DonHang findOrder(Long id) {
    validateId(id);
    return orderRepository.findById(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));
  }

  private void requireOnline(DonHang order) {
    if (order.getLoaiDonHang() != LoaiDonHang.ONLINE) {
      throw conflict("Thao tác này chỉ áp dụng đơn ONLINE");
    }
  }

  private void requireUnexported(DonHang order) {
    if (order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {
      throw conflict("Đơn đã xuất hoặc hoàn kho");
    }
  }

  private void requireProcessing(DonHang order) {
    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DONG_GOI) {
      throw conflict("Đơn phải ở trạng thái CHO_DONG_GOI");
    }
  }

  private void requireSerialPreparation(DonHang order) {
    requireOnline(order);
    requireUnexported(order);

    if (order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DONG_GOI
        && order.getTrangThaiDonHang() != TrangThaiDonHang.CHO_THANH_TOAN) {
      throw conflict("Chỉ xem serial cho đơn đã duyệt, chưa hủy và chưa xuất");
    }
  }

  private boolean hasReservation(DonHang order) {
    return order.getTrangThaiDongGoi() == TrangThaiDongGoi.DANG_DONG_GOI
        || order.getTrangThaiDongGoi() == TrangThaiDongGoi.DA_DONG_GOI;
  }

  private boolean shipping(DonHang order) {
    return text(order.getDiaChiGiaoHang()) != null;
  }

  private String customerName(DonHang order) {
    if (order.getKhachHang() != null) {
      return order.getKhachHang().getHoTen();
    }
    return text(order.getTenNguoiNhan()) == null ? "Khách lẻ" : order.getTenNguoiNhan();
  }

  private AdminOrderResponse.Action action(DonHang order) {
    entityManager.flush();
    return mapper.toAction(salesService.getOrder(order.getId()));
  }

  private LocalDateTime now() {
    return LocalDateTime.now(properties.zone());
  }

  private void validateId(Long id) {
    if (id == null || id <= 0) {
      throw invalid("ID phải là số nguyên dương");
    }
  }

  private Sort sort(String input) {
    String value = text(input);

    if (value == null) {
      value = "ngay_tao,desc";
    }

    String[] parts = value.split(",", -1);

    Map<String, String> fields =
        Map.of(
            "ngay_tao", "ngayTao",
            "tong_thanh_toan", "tongThanhToan",
            "ma_don_hang", "maDonHang",
            "id", "id");

    if (parts.length != 2 || !fields.containsKey(parts[0])) {
      throw invalid("sort phải có dạng ngay_tao,desc");
    }

    Sort.Direction direction;

    if ("asc".equalsIgnoreCase(parts[1])) {
      direction = Sort.Direction.ASC;
    } else if ("desc".equalsIgnoreCase(parts[1])) {
      direction = Sort.Direction.DESC;
    } else {
      throw invalid("Chiều sắp xếp phải là asc hoặc desc");
    }

    Sort result = Sort.by(direction, fields.get(parts[0]));

    return "id".equals(parts[0]) ? result : result.and(Sort.by(Sort.Direction.DESC, "id"));
  }

  private String paymentRequestKey(String prefix, String value) {
    if (value == null
        || !value.matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-" + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {

      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    String normalized = UUID.fromString(value).toString();

    String key = prefix + normalized;

    if (key.length() > 50) {
      throw new IllegalStateException(
          "Khóa idempotency vượt giới hạn sales_idempotency.request_key");
    }

    return key;
  }
}
