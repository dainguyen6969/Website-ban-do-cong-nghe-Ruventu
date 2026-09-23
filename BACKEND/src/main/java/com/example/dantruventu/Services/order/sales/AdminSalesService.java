package com.example.dantruventu.Services.order.sales;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.order.AdminSalesResponse;
import com.example.dantruventu.Entity.*;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Mapper.order.AdminDeliveryMapper;
import com.example.dantruventu.Mapper.order.AdminSalesMapper;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.cashbook.LoaiThuChiRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Specification.SalesSpecification;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
public class AdminSalesService {

  private final SalesContext context;
  private final SalesProperties properties;
  private final SalesCalculationService calculation;
  private final AdminSalesMapper mapper;
  private final AdminDeliveryMapper deliveryMapper;

  private final NguoiDungRepository userRepository;
  private final PhienBanSanPhamRepository variantRepository;
  private final AnhSanPhamRepository imageRepository;

  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final TheKhoRepository ledgerRepository;

  private final LoaiThuChiRepository cashTypeRepository;
  private final SoQuyThuChiRepository cashRepository;
  private final SalesIdempotencyRepository idempotencyRepository;

  private final ObjectMapper objectMapper;

  public AdminSalesResponse.Options options() {

    NguoiDung actor = context.actor();

    context.warehouse(context.defaultWarehouseId());

    return new AdminSalesResponse.Options(
        List.of("BAN_LE"),
        List.of("CHUA_BAO_GOM", "DA_BAO_GOM"),
        List.of("TIEN_MAT", "CHUYEN_KHOAN"),
        properties.isCardEnabled()
            ? List.of("TIEN_MAT", "CHUYEN_KHOAN", "THE")
            : List.of("TIEN_MAT", "CHUYEN_KHOAN"),
        List.of("NHAN_TAI_CUA_HANG", "GIAO_HANG"),
        context.defaultWarehouseId(),
        new AdminSalesResponse.Employee(actor.getId(), actor.getHoTen()));
  }

  public AdminSalesResponse.PageData<AdminSalesResponse.Customer> customers(
      String keyword, int page, int limit) {

    var result =
        userRepository.findAll(SalesSpecification.customers(keyword), page(keyword, page, limit));

    return new AdminSalesResponse.PageData<>(
        result.getContent().stream().map(mapper::toCustomer).toList(), pagination(result));
  }

  public AdminSalesResponse.PageData<AdminSalesResponse.Product> products(
      String keyword, Long warehouseId, String priceList, int page, int limit) {

    context.warehouse(warehouseId);

    if (!"BAN_LE".equals(priceList)) {
      throw conflict("Hiện chỉ hỗ trợ bảng giá BAN_LE");
    }

    var result =
        variantRepository.findAll(SalesSpecification.products(keyword), page(keyword, page, limit));

    if (result.isEmpty()) {
      return new AdminSalesResponse.PageData<>(List.of(), pagination(result));
    }

    var catalog =
        calculation.catalog(
            result.getContent().stream().map(PhienBanSanPham::getId).toList(), false);

    Map<Long, TonKho> stocks = new HashMap<>();
    Map<Long, Boolean> serialModes = new HashMap<>();

    for (var units : catalog.physicalUnits().values()) {
      for (Long id : units.keySet()) {
        if (!stocks.containsKey(id)) {
          stocks.put(id, calculation.stock(warehouseId, id, false));
          serialModes.put(id, calculation.usesSerial(id));
        }
      }
    }

    List<AdminSalesResponse.Product> items = new ArrayList<>();

    for (PhienBanSanPham variant : result.getContent()) {

      var response = mapper.toProduct(variant);

      long actual = Long.MAX_VALUE;
      long available = Long.MAX_VALUE;
      boolean managedSerial = false;

      for (var unit : catalog.physicalUnits().get(variant.getId()).entrySet()) {

        TonKho stock = stocks.get(unit.getKey());

        actual = Math.min(actual, stock == null ? 0L : stock.getTonThucTe() / unit.getValue());

        available =
            Math.min(available, stock == null ? 0L : stock.getTonCoTheBan() / unit.getValue());

        managedSerial |= Boolean.TRUE.equals(serialModes.get(unit.getKey()));
      }

      response.setTonThucTe(actual == Long.MAX_VALUE ? 0 : actual);
      response.setTonCoTheBan(available == Long.MAX_VALUE ? 0 : available);
      response.setQuanLySerial(managedSerial);
      response.setDonGia(money(variant.getGiaBanLe()));

      response.setAnhDaiDien(
          imageRepository
              .findFirstBySanPham_IdOrderByLaAnhChinhDescThuTuHienThiAscIdAsc(
                  variant.getSanPham().getId())
              .map(AnhSanPham::getDuongDanAnh)
              .orElse(null));

      items.add(response);
    }

    return new AdminSalesResponse.PageData<>(items, pagination(result));
  }

  public AdminSalesResponse.Preview preview(AdminSalesRequest.Preview request) {

    context.customer(request.getKhachHangId(), false);

    var plan = calculation.calculate(request, request.getLoaiDonHang(), false);

    plan.data()
        .setKhuyenMaiKhaDung(calculation.availablePromotions(request, request.getLoaiDonHang()));

    return plan.data();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminSalesResponse.Order createOnline(
      String idempotencyKey, AdminSalesRequest.Online request) {

    NguoiDung actor = context.actor();

    String key = requestKey("ORD", idempotencyKey, false);

    var entry = idempotencyRepository.acquire(key, actor.getId(), hash(actor.getId(), request));

    verifyReplay(entry, actor.getId(), hash(actor.getId(), request));

    if (entry.responseJson() != null) {
      return decode(entry.responseJson(), AdminSalesResponse.Order.class);
    }

    NguoiDung customer = context.customer(request.getKhachHangId(), true);

    String address = text(request.getThongTinNguoiNhan().getDiaChiGiaoHang());
    BigDecimal shipping = inputMoney(request.getPhiGiaoHang());

    if ("GIAO_HANG".equals(request.getHinhThucNhanHang())) {
      if (address == null) {
        throw invalid("Đơn giao hàng phải có địa chỉ người nhận");
      }
    } else {
      if (address != null || shipping.signum() != 0) {
        throw invalid("Nhận tại cửa hàng phải có địa chỉ null và phí giao hàng bằng 0");
      }
    }

    var plan = calculation.calculate(request, LoaiDonHang.ONLINE, true);

    confirmTotal(request.getTongThanhToanXacNhan(), plan.data().getTongThanhToan());

    DonHang order =
        newOrder(
            key,
            LoaiDonHang.ONLINE,
            actor,
            customer,
            request.getPhuongThucThanhToan(),
            request.getGhiChu(),
            plan);

    order.setTenNguoiNhan(request.getThongTinNguoiNhan().getTenNguoiNhan().strip());
    order.setSdtNguoiNhan(request.getThongTinNguoiNhan().getSdtNguoiNhan());
    order.setDiaChiGiaoHang(address);

    order = orderRepository.saveAndFlush(order);

    saveLines(order, plan);
    consumePromotion(plan);

    orderRepository.flush();

    var response = mapper.toOrder(order, properties.zone());
    enrich(response, order);

    idempotencyRepository.complete(key, encode(response));

    return response;
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminSalesResponse.Checkout checkout(
      String idempotencyKey, AdminSalesRequest.Pos request) {

    NguoiDung actor = context.actor();

    String key = requestKey("POS", idempotencyKey, true);
    String hash = hash(actor.getId(), request);

    var entry = idempotencyRepository.acquire(key, actor.getId(), hash);

    verifyReplay(entry, actor.getId(), hash);

    if (entry.responseJson() != null) {
      return decode(entry.responseJson(), AdminSalesResponse.Checkout.class);
    }

    NguoiDung customer = context.customer(request.getKhachHangId(), false);
    NguoiDung employee = context.employee(request.getNhanVienId(), actor);

    var plan = calculation.calculate(request, LoaiDonHang.TAI_QUAY, true);

    BigDecimal total = plan.data().getTongThanhToan();

    confirmTotal(request.getTongThanhToanXacNhan(), total);

    BigDecimal change = validatePayment(request.getThanhToan(), total);

    Map<Long, SoSerialSanPham> selectedSerials = validateAndLockSerials(request, plan);

    DonHang order =
        newOrder(
            key,
            LoaiDonHang.TAI_QUAY,
            employee,
            customer,
            request.getThanhToan().getPhuongThuc(),
            request.getGhiChu(),
            plan);

    order.setTrangThaiDonHang(TrangThaiDonHang.HOAN_THANH);
    order.setTrangThaiThanhToan(TrangThaiThanhToanDonHang.DA_THANH_TOAN);
    order.setTrangThaiDongGoi(TrangThaiDongGoi.DA_DONG_GOI);
    order.setTrangThaiXuatKho(TrangThaiXuatKho.DA_XUAT_KHO);
    order.setMaGiaoDichThanhToan(text(request.getThanhToan().getMaGiaoDich()));

    order = orderRepository.saveAndFlush(order);

    saveLines(order, plan);

    LocalDateTime activationTime = LocalDateTime.now(properties.zone());

    for (SoSerialSanPham serial : selectedSerials.values()) {
      serial.setTrangThai(TrangThaiSerial.DA_BAN);
      serial.setDonHang(order);
      serial.setNgayKichHoat(activationTime);
      // Không tự suy ra hoặc đặt thêm thời hạn bảo hành.
    }

    for (var requirement : plan.quantities().entrySet()) {

      TonKho stock = plan.stocks().get(requirement.getKey());
      int quantity = requirement.getValue();

      stock.setTonThucTe(stock.getTonThucTe() - quantity);
      stock.setTonCoTheBan(stock.getTonCoTheBan() - quantity);

      ledgerRepository.save(
          TheKho.builder()
              .khoHang(stock.getKhoHang())
              .phienBan(stock.getPhienBan())
              .loaiGiaoDich(LoaiGiaoDichKho.XUAT_BAN)
              .maChungTuGoc(order.getId())
              .soLuongThayDoi(-quantity)
              .tonCuoi(stock.getTonThucTe())
              .ghiChu("Xuất bán POS " + order.getMaDonHang())
              .build());
    }

    consumePromotion(plan);

    SoQuyThuChi receipt = createCashReceipt(order, actor, request.getThanhToan());

    orderRepository.flush();

    var response = mapper.toCheckout(order, properties.zone());

    enrich(response, order);

    if ("TIEN_MAT".equals(request.getThanhToan().getPhuongThuc())) {
      response.setTienKhachDua(inputMoney(request.getThanhToan().getTienKhachDua()));
      response.setTienThua(change);
    }

    response.setPhieuThu(receipt == null ? null : mapper.toCashReceipt(receipt));

    idempotencyRepository.complete(key, encode(response));

    return response;
  }

  public AdminSalesResponse.Order getOrder(Long id) {

    if (id == null || id <= 0) {
      throw invalid("ID đơn hàng không hợp lệ");
    }

    DonHang order =
        orderRepository.findById(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    var response = mapper.toOrder(order, properties.zone());

    enrich(response, order);

    return response;
  }

  private DonHang newOrder(
      String code,
      LoaiDonHang type,
      NguoiDung employee,
      NguoiDung customer,
      String paymentMethod,
      String note,
      SalesCalculationService.Plan plan) {

    return DonHang.builder()
        .maDonHang(code)
        .loaiDonHang(type)
        .khachHang(customer)
        .nhanVien(employee)
        .tongTienHang(plan.data().getTongTienHang())
        .tienChietKhau(plan.data().getTienChietKhau())
        .phiGiaoHang(plan.data().getPhiGiaoHang())
        .tongThanhToan(plan.data().getTongThanhToan())
        .phuongThucThanhToan(paymentMethod)
        .trangThaiDonHang(TrangThaiDonHang.CHO_DUYET)
        .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
        .trangThaiDongGoi(TrangThaiDongGoi.CHUA_DONG_GOI)
        .trangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO)
        .ghiChu(text(note))
        .build();
  }

  private void saveLines(DonHang order, SalesCalculationService.Plan plan) {

    for (var line : plan.lines()) {

      orderLineRepository.save(
          ChiTietDonHang.builder()
              .donHang(order)
              .phienBan(line.variant())
              .soLuong(line.quantity())
              .donGia(line.unitPrice())
              .thanhTien(line.amount())
              .build());
    }
  }

  private void consumePromotion(SalesCalculationService.Plan plan) {

    if (plan.promotion() == null) {
      return;
    }

    Integer used = plan.promotion().getSoLuongDaDung();

    plan.promotion().setSoLuongDaDung((used == null ? 0 : used) + 1);
  }

  private void confirmTotal(BigDecimal confirmed, BigDecimal actual) {

    if (inputMoney(confirmed).compareTo(actual) != 0) {
      throw conflict("Tổng tiền đã thay đổi. Vui lòng gọi preview và xác nhận lại");
    }
  }

  private BigDecimal validatePayment(AdminSalesRequest.Payment payment, BigDecimal total) {

    if (!Boolean.TRUE.equals(payment.getXacNhanDaNhanTien())) {
      throw invalid("Phải xác nhận đã nhận tiền từ khách");
    }

    if ("THE".equals(payment.getPhuongThuc()) && !properties.isCardEnabled()) {
      throw conflict("Cửa hàng chưa bật xác nhận thanh toán thẻ");
    }

    if ("TIEN_MAT".equals(payment.getPhuongThuc())) {

      if (payment.getSoTienDaNhan() != null) {
        throw invalid("Tiền mặt dùng tien_khach_dua, không gửi so_tien_da_nhan");
      }

      BigDecimal tendered = inputMoney(payment.getTienKhachDua());

      if (tendered.compareTo(total) < 0) {
        throw invalid("Số tiền khách đưa chưa đủ");
      }

      return tendered.subtract(total);
    }

    if (payment.getTienKhachDua() != null) {
      throw invalid("Chuyển khoản/thẻ dùng so_tien_da_nhan");
    }

    if (text(payment.getMaGiaoDich()) == null) {
      throw invalid("Chuyển khoản/thẻ phải có mã giao dịch");
    }

    if (inputMoney(payment.getSoTienDaNhan()).compareTo(total) != 0) {
      throw invalid("Số tiền thực nhận phải bằng đúng tổng thanh toán");
    }

    return BigDecimal.ZERO;
  }

  private Map<Long, SoSerialSanPham> validateAndLockSerials(
      AdminSalesRequest.Pos request, SalesCalculationService.Plan plan) {

    var expected = plan.serialRequirements();

    Set<SalesCalculationService.SerialKey> suppliedGroups = new HashSet<>();
    Map<Long, Long> expectedVariantBySerial = new TreeMap<>();

    for (var allocation : request.getPhanBoSerial()) {

      var group =
          new SalesCalculationService.SerialKey(allocation.getMaDong(), allocation.getPhienBanId());

      if (!suppliedGroups.add(group)) {
        throw invalid("Nhóm phân bổ serial bị trùng");
      }

      Integer required = expected.get(group);

      if (required == null) {
        throw invalid("Phân bổ serial không thuộc yêu cầu của đơn");
      }

      if (allocation.getSerialIds().size() != required) {
        throw conflict("Số lượng serial thiếu hoặc thừa tại dòng " + group.lineKey());
      }

      for (Long serialId : allocation.getSerialIds()) {

        if (expectedVariantBySerial.putIfAbsent(serialId, allocation.getPhienBanId()) != null) {
          throw invalid("Một serial không được xuất hiện nhiều lần trong đơn");
        }
      }
    }

    if (!suppliedGroups.equals(expected.keySet())) {
      throw invalid("Chưa phân bổ đủ serial theo kết quả preview");
    }

    Map<Long, SoSerialSanPham> selected = new TreeMap<>();

    for (var entry : expectedVariantBySerial.entrySet()) {

      SoSerialSanPham serial =
          serialRepository
              .findByIdForUpdate(entry.getKey())
              .orElseThrow(() -> notFound("Serial không tồn tại: " + entry.getKey()));

      if (!Objects.equals(serial.getPhienBan().getId(), entry.getValue())
          || serial.getTrangThai() != TrangThaiSerial.TRONG_KHO
          || serial.getDonHang() != null) {
        throw conflict(
            "Serial sai phiên bản, đã bán hoặc không còn khả dụng: " + serial.getSoSerial());
      }

      selected.put(serial.getId(), serial);
    }

    return selected;
  }

  private SoQuyThuChi createCashReceipt(
      DonHang order, NguoiDung actor, AdminSalesRequest.Payment payment) {

    if (order.getTongThanhToan().signum() == 0) {
      return null;
    }

    LoaiThuChi cashType =
        cashTypeRepository
            .findByMaLoaiAndTrangThai("THU_BAN_HANG", TrangThaiCoBanEnum.HOAT_DONG)
            .orElseThrow(() -> conflict("Chưa cấu hình loại thu THU_BAN_HANG"));

    if (cashType.getLoaiPhieu() != LoaiPhieuThuChi.THU) {
      throw conflict("THU_BAN_HANG phải thuộc loại phiếu THU");
    }

    return cashRepository.saveAndFlush(
        SoQuyThuChi.builder()
            .maPhieu("THU-POS-" + order.getId())
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .loaiThuChi(cashType)
            .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.KHACH_HANG)
            .tenNguoiNopNhan(
                order.getKhachHang() == null ? "Khách lẻ" : order.getKhachHang().getHoTen())
            .maChungTuThamChieu(order.getMaDonHang())
            .soTien(order.getTongThanhToan())
            .phuongThucThanhToan(payment.getPhuongThuc())
            .moTa(
                "Thu bán hàng tại quầy"
                    + (text(payment.getMaGiaoDich()) == null
                        ? ""
                        : "; Mã giao dịch: " + payment.getMaGiaoDich().strip()))
            .ngayGhiNhan(
                payment.getNgayThanhToan().atZoneSameInstant(properties.zone()).toLocalDateTime())
            .nguoiTao(actor)
            .nguonTao(NguonTaoPhieuThuChi.TU_DONG)
            .trangThai(TrangThaiPhieuThuChi.DA_GHI_NHAN)
            .build());
  }

  private void enrich(AdminSalesResponse.Order response, DonHang order) {

    response.setTenKhachHang(
        order.getKhachHang() == null ? "Khách lẻ" : order.getKhachHang().getHoTen());

    response.setHinhThucNhanHang(
        text(order.getDiaChiGiaoHang()) == null ? "NHAN_TAI_CUA_HANG" : "GIAO_HANG");

    response.setTongTienVat(
        order
            .getTongThanhToan()
            .subtract(order.getTongTienHang())
            .add(order.getTienChietKhau() == null ? BigDecimal.ZERO : order.getTienChietKhau())
            .subtract(order.getPhiGiaoHang() == null ? BigDecimal.ZERO : order.getPhiGiaoHang()));

    response.setSanPham(
        orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(
                line -> {
                  var item = deliveryMapper.toProduct(line);

                  item.setQuanLySerial(
                      line.getPhienBan().getSanPham().getLoaiSanPham() == LoaiSanPham.DON
                          ? calculation.usesSerial(line.getPhienBan().getId())
                          : usesComboSerial(line.getPhienBan()));

                  // Các giá trị VAT/chiết khấu từng dòng không có snapshot trong ERD.
                  item.setThueVat(null);
                  item.setTienChietKhau(null);
                  item.setTienVat(null);

                  return item;
                })
            .toList());

    response.setSerials(
        serialRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(mapper::toSerial)
            .toList());

    response.setPhieuGiaoHang(
        deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(mapper::toDelivery)
            .toList());
  }

  private boolean usesComboSerial(PhienBanSanPham variant) {
    // Đọc lịch sử không yêu cầu combo còn đang kinh doanh.
    return variant.getSanPham().getDanhSachThanhPhanCombo().stream()
        .anyMatch(component -> calculation.usesSerial(component.getPhienBanThanhPhan().getId()));
  }

  private String requestKey(String prefix, String input, boolean required) {

    if (input == null || input.isBlank()) {
      if (required) {
        throw invalid("Thiếu header Idempotency-Key");
      }
      return prefix + "-" + UUID.randomUUID();
    }

    String key = input.strip();

    if (!key.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    return prefix + "-" + UUID.fromString(key);
  }

  private String hash(Long actorId, Object request) {

    try {
      String payload = actorId + "\n" + objectMapper.writeValueAsString(request);

      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(payload.getBytes(StandardCharsets.UTF_8)));

    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Không thể xác định yêu cầu bán hàng");
    }
  }

  private void verifyReplay(SalesIdempotencyRepository.Entry entry, Long actorId, String hash) {

    if (entry == null
        || !Objects.equals(entry.actorId(), actorId)
        || !Objects.equals(entry.requestHash(), hash)) {
      throw conflict("Idempotency-Key đã được sử dụng cho yêu cầu khác");
    }
  }

  private String encode(Object response) {
    try {
      return objectMapper.writeValueAsString(response);
    } catch (Exception exception) {
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
    }
  }

  private <T> T decode(String json, Class<T> type) {
    try {
      return objectMapper.readValue(json, type);
    } catch (Exception exception) {
      throw new AppException(
          ErrorCode.INTERNAL_SERVER_ERROR, "Không đọc được kết quả xử lý đã lưu");
    }
  }
}
