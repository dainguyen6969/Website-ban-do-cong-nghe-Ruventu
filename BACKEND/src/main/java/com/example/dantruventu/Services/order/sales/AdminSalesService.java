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
import com.example.dantruventu.Repository.VaiTroRepository;
import com.example.dantruventu.Repository.cashbook.SoQuyThuChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.TheKhoRepository;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.order.OrderEvents;
import com.example.dantruventu.Services.order.OrderInventoryService;
import com.example.dantruventu.Specification.SalesSpecification;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
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
  private final VaiTroRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final PhienBanSanPhamRepository variantRepository;
  private final AnhSanPhamRepository imageRepository;

  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final TheKhoRepository ledgerRepository;

  private final SalesIdempotencyRepository idempotencyRepository;

  private final ObjectMapper objectMapper;

  private final CashbookService cashbookService;
  private final OrderEvents orderEvents;
  private final SoQuyThuChiRepository cashRepository;

  private final OrderSaleSnapshotService saleSnapshots;
  private final SalesQuoteService saleQuotes;
  private final SoldDeviceService soldDevices;
  private final CatalogSupport catalogSupport;

  private final OrderDeviceHistoryService deviceHistory;
  private final OrderInventoryService orderInventory;
  private final OrderIntakePolicy intakePolicy;

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

  @Transactional
  public AdminSalesResponse.Customer createCustomer(AdminSalesRequest.Customer request) {
    String rawPhone = request.getSoDienThoai().strip();
    String phone = rawPhone.startsWith("+84") ? "0" + rawPhone.substring(3) : rawPhone;

    if (userRepository.existsBySoDienThoai(phone) || userRepository.existsBySoDienThoai(rawPhone)) {
      throw conflict("Số điện thoại đã được sử dụng");
    }

    VaiTro customerRole =
        roleRepository
            .findByTenVaiTro("USER")
            .orElseThrow(() -> conflict("Chưa cấu hình vai trò khách hàng USER"));
    String id = UUID.randomUUID().toString();

    NguoiDung customer =
        userRepository.saveAndFlush(
            NguoiDung.builder()
                .vaiTro(customerRole)
                .hoTen(request.getHoTen().strip())
                .email("pos-" + id + "@ruventu.local")
                .soDienThoai(phone)
                .matKhau(passwordEncoder.encode(id))
                .trangThai(TrangThaiCoBanEnum.HOAT_DONG)
                .build());

    return mapper.toCustomer(customer);
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

    var attributes =
        catalogSupport.attributes(
            result.getContent().stream().map(PhienBanSanPham::getId).toList());

    var parts =
        catalogSupport.comboParts(
            result.getContent().stream()
                .filter(v -> v.getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC)
                .map(v -> v.getSanPham().getId())
                .distinct()
                .toList());

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

      boolean combo = variant.getSanPham().getLoaiSanPham() == LoaiSanPham.BO_PC;

      long actualQuantity = actual == Long.MAX_VALUE ? 0 : actual;
      long availableQuantity = available == Long.MAX_VALUE ? 0 : available;

      response.setTonThucTe(combo ? null : actualQuantity);
      response.setTonCoTheBan(combo ? null : availableQuantity);
      response.setSoBoCoTheLap(combo ? availableQuantity : null);

      response.setQuanLySerial(Boolean.TRUE.equals(variant.getCoQuanLySerial()));

      response.setDonGia(money(variant.getGiaBanLe()));

      response.setThoiHanBaoHanhThang(combo ? null : variant.getSanPham().getThoiHanBaoHanhThang());

      response.setBaoHanhTheoLinhKien(combo);

      response.setThuocTinhPhienBan(attributes.getOrDefault(variant.getId(), List.of()));

      response.setThanhPhan(
          combo ? parts.getOrDefault(variant.getSanPham().getId(), List.of()) : List.of());

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

    var actor = context.actor();
    context.customer(request.getKhachHangId(), false);

    String scope;

    if (request.getLoaiDonHang() == LoaiDonHang.TAI_QUAY) {
      if (request.getDonHangId() != null) {
        throw invalid("Preview POS không nhận don_hang_id");
      }
      scope = SalesQuoteService.POS;
    } else if (request.getLoaiDonHang() == LoaiDonHang.ONLINE) {
      scope =
          request.getDonHangId() == null
              ? SalesQuoteService.ADMIN_CREATE
              : SalesQuoteService.editScope(request.getDonHangId());
    } else {
      throw invalid("Loại đơn hàng không hợp lệ");
    }

    Map<Long, Integer> ownReservation = Map.of();

    if (request.getDonHangId() != null) {
      if (Boolean.TRUE.equals(request.getChoPhepChoHang())) {
        throw invalid("Chế độ chờ hàng chỉ áp dụng khi tạo đơn mới");
      }

      DonHang editing =
          orderRepository
              .findById(request.getDonHangId())
              .orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

      if (editing.getLoaiDonHang() != LoaiDonHang.ONLINE
          || editing.getTrangThaiDonHang() != TrangThaiDonHang.CHO_DUYET
          || editing.getTrangThaiThanhToan() != TrangThaiThanhToanDonHang.CHUA_THANH_TOAN
          || editing.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI
          || editing.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO) {

        throw conflict("Đơn không còn được phép sửa");
      }

      if (orderInventory.hasQuantityReservation(editing)) {
        ownReservation = orderInventory.plan(editing, false).quantities();
      }
    }

    var plan = calculation.calculate(request, request.getLoaiDonHang(), false, ownReservation);

    plan.data()
        .setKhuyenMaiKhaDung(calculation.availablePromotions(request, request.getLoaiDonHang()));

    if (request.getLoaiDonHang() == LoaiDonHang.ONLINE && request.getDonHangId() == null) {

      plan.data().setTiepNhan(intakePolicy.preview(null, plan.quantities(), true));
    }

    return saleQuotes.issue(
        plan.data(), SalesQuoteService.identity(actor, null), scope, request, plan);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public AdminSalesResponse.Order createOnline(
      String idempotencyKey, AdminSalesRequest.Online request) {

    NguoiDung actor = context.actor();

    String key = requestKey("ORD", idempotencyKey, true);

    var entry = idempotencyRepository.acquire(key, actor.getId(), hash(actor.getId(), request));

    verifyReplay(entry, actor.getId(), hash(actor.getId(), request));

    if (entry.responseJson() != null) {
      return decode(entry.responseJson(), AdminSalesResponse.Order.class);
    }

    NguoiDung customer = context.customer(request.getKhachHangId(), false);

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

    saleQuotes.require(
        request.getMaXacNhanGia(),
        SalesQuoteService.identity(actor, null),
        SalesQuoteService.ADMIN_CREATE,
        request,
        plan);

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

    saleSnapshots.saveLines(order, plan, request);
    saleSnapshots.recordUnpaidCreationEvidence(order);
    saleSnapshots.recordPromotion(order, plan, request, actor);

    orderInventory.reserveForNewOrder(order, Boolean.TRUE.equals(request.getChoPhepChoHang()));

    saleSnapshots.configureUnpaidPromotion(order);

    orderRepository.flush();

    var response = mapper.toOrder(order, properties.zone());
    enrich(response, order);

    idempotencyRepository.complete(key, encode(response));

    orderEvents.created(order);

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

    saleQuotes.require(
        request.getMaXacNhanGia(),
        SalesQuoteService.identity(actor, null),
        SalesQuoteService.POS,
        request,
        plan);

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

    var savedLines = saleSnapshots.saveLines(order, plan, request);

    for (SoSerialSanPham serial : selectedSerials.values()) {
      serial.setTrangThai(TrangThaiSerial.DA_BAN);
      serial.setDonHang(order);
    }

    Map<String, Long> lineIds = new HashMap<>();

    for (var line : savedLines) {
      lineIds.put(saleSnapshots.requireSnapshot(line).lineKey(), line.getId());
    }

    Map<SoldDeviceService.Key, List<SoSerialSanPham>> bindings = new HashMap<>();

    for (var allocation : request.getPhanBoSerial()) {
      bindings.put(
          new SoldDeviceService.Key(
              lineIds.get(allocation.getMaDong()), allocation.getPhienBanId()),
          allocation.getSerialIds().stream().map(selectedSerials::get).toList());
    }

    soldDevices.prepare(order, savedLines, bindings);
    soldDevices.handover(order);

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

    saleSnapshots.recordPromotion(order, plan, request, actor);

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

    orderEvents.created(order);

    return response;
  }

  public AdminSalesResponse.Order getOrder(Long id) {

    if (id == null || id <= 0) {
      throw invalid("ID đơn hàng không hợp lệ");
    }

    DonHang order =
        orderRepository.findById(id).orElseThrow(() -> notFound("Đơn hàng không tồn tại"));

    var response =
        order.getLoaiDonHang() == LoaiDonHang.TAI_QUAY
            ? mapper.toCheckout(order, properties.zone())
            : mapper.toOrder(order, properties.zone());

    enrich(response, order);

    if (response instanceof AdminSalesResponse.Checkout checkout) {
      cashRepository
          .findByMaPhieu("THU-POS-" + order.getId())
          .map(mapper::toCashReceipt)
          .ifPresent(checkout::setPhieuThu);
    }

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
          || serial.getDonHang() != null
          || serial.getChiTietDongGoi() != null) {
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

    String transactionCode = text(payment.getMaGiaoDich());

    return cashbookService.createAutomatic(
        CashbookService.AutomaticVoucher.builder()
            .maPhieu("THU-POS-" + order.getId())
            .loaiPhieu(LoaiPhieuThuChi.THU)
            .maLoaiThuChi("THU_BAN_HANG")
            .nhomNguoiNopNhan(NhomNguoiNopNhanEnum.KHACH_HANG)
            .nguoiNopNhan(order.getKhachHang())
            .tenDoiTuongTuDo(order.getKhachHang() == null ? "Khách lẻ" : null)
            .maChungTuThamChieu(order.getMaDonHang())
            .soTien(order.getTongThanhToan())
            .phuongThucThanhToan(payment.getPhuongThuc())
            .ngayGhiNhan(payment.getNgayThanhToan())
            .moTa(
                "Thu bán hàng tại quầy"
                    + (transactionCode == null ? "" : "; Mã giao dịch: " + transactionCode))
            .nguoiTao(actor)
            .build());
  }

  private void enrich(AdminSalesResponse.Order response, DonHang order) {

    response.setTiepNhan(intakePolicy.describe(order));

    if (order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_HANG) {
      var rows = orderInventory.waitingStockRows(order);

      response.setGiuHangChoHang(rows);

      response.setHangConThieu(
          rows.stream()
              .filter(row -> ((Number) row.get("so_luong_thieu")).longValue() > 0)
              .toList());
    } else {
      response.setGiuHangChoHang(null);
      response.setHangConThieu(null);
    }

    response.setDaNhanLaiTruocBanGiao(saleSnapshots.hasReceivedBeforeHandover(order));

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

    response.setKhuyenMai(saleSnapshots.appliedPromotion(order.getId()));

    response.setSerials(soldDevices.originalSerials(order.getId()));

    response.setThietBiDaGiao(soldDevices.details(order.getId()));

    var historyView = deviceHistory.read(order);

    response.setThietBiDaBan(historyView.originals());
    response.setThietBiHienHanh(historyView.current());
    response.setCanXacMinhLichSu(historyView.needsVerification());
    response.setCanhBao(historyView.warnings());

    response.setCanhBaoThietBi(soldDevices.warning(order));

    response.setNgayHoanThanh(
        order.getNgayHoanThanh() == null
            ? null
            : order.getNgayHoanThanh().atZone(properties.zone()).toOffsetDateTime());

    response.setPhieuGiaoHang(
        deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(mapper::toDelivery)
            .toList());

    response.setDaGhiNhanThuCod(
        response.getPhieuGiaoHang().stream()
            .anyMatch(
                delivery ->
                    cashRepository
                        .findByMaPhieu("THU-COD-" + delivery.id())
                        .filter(
                            voucher ->
                                voucher.getLoaiPhieu() == LoaiPhieuThuChi.THU
                                    && voucher.getNguonTao() == NguonTaoPhieuThuChi.TU_DONG
                                    && voucher.getTrangThai() == TrangThaiPhieuThuChi.DA_GHI_NHAN
                                    && Objects.equals(
                                        voucher.getMaChungTuThamChieu(), order.getMaDonHang()))
                        .isPresent()));
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
