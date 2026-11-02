package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.DTO.Request.order.AdminOrderRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Request.order.CustomerCheckoutRequest;
import com.example.dantruventu.DTO.Request.order.CustomerOrderRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.order.CustomerOrderResponse;
import com.example.dantruventu.Entity.AnhSanPham;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Enum.*;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.product.AnhSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import com.example.dantruventu.Services.CartPromotionService;
import com.example.dantruventu.Services.cashbook.CashbookService;
import com.example.dantruventu.Services.catalog.CatalogSupport;
import com.example.dantruventu.Services.documents.DocumentNumberService;
import com.example.dantruventu.Services.order.sales.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerOrderService {

  private static final String GUEST_CART_KEY_PREFIX = "cart:guest:";
  private static final String USER_PROMOTION_KEY_PREFIX = "cart:user:";
  private static final String PROMOTION_KEY_SUFFIX = ":promotion";
  private static final String CHECKOUT_IDEMPOTENCY_KEY_PREFIX = "order:checkout:idempotency:";
  private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);

  private final GioHangRepository cartRepository;
  private final NguoiDungRepository cartOwnerRepository;
  private final SoDiaChiRepository addressRepository;
  private final DonHangRepository orderRepository;
  private final OrderEvents orderEvents;
  private final ChiTietDonHangRepository orderLineRepository;
  private final AnhSanPhamRepository imageRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final ThanhPhanComboRepository comboComponentRepository;
  private final StringRedisTemplate redisTemplate;
  private final SalesCalculationService calculationService;
  private final SalesContext salesContext;
  private final SalesProperties salesProperties;
  private final ObjectMapper objectMapper;
  private final AdminOrderService adminOrderService;
  private final CashbookService cashbookService;
  private final CatalogSupport catalogSupport;
  private final OrderSaleSnapshotService saleSnapshots;
  private final SalesQuoteService saleQuotes;
  private final CartPromotionService cartPromotionService;
  private final SoldDeviceService soldDevices;
  private final OrderInventoryService orderInventory;
  private final OrderIntakePolicy intakePolicy;
  private final BackorderService backorders;
  private final DocumentNumberService documentNumbers;

  @Value("${ruventu.order.delivery-fee:30000}")
  private BigDecimal deliveryFee;

  public CustomerOrderResponse.Preview preview(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Preview request) {

    requireCheckoutPromotion(user, guestCartId, request);

    List<CartLine> cartLines = checkoutLines(user, guestCartId, request, false);

    CustomerOrderResponse.Recipient recipient = resolveRecipient(user, request);

    AdminSalesRequest.Preview salesRequest = buildSalesRequest(user, request, cartLines);

    SalesCalculationService.Plan plan =
        calculationService.calculate(salesRequest, LoaiDonHang.ONLINE, false);

    List<CustomerOrderResponse.Product> products =
        plan.lines().stream()
            .map(
                line -> {
                  BigDecimal grossUnitPrice =
                      line.gift() ? BigDecimal.ZERO : money(line.variant().getGiaBanLe());

                  BigDecimal grossLineAmount =
                      grossUnitPrice.multiply(BigDecimal.valueOf(line.quantity()));

                  return CustomerOrderResponse.Product.builder()
                      .maDong(line.key())
                      .phienBanId(line.variant().getId())
                      .tenSanPham(line.variant().getSanPham().getTenSanPham())
                      .tenPhienBan(line.variant().getTenPhienBan())
                      .soLuong(line.quantity())
                      .laQuaTang(line.gift())

                      // Giá trước VAT phục vụ dữ liệu tính toán hiện có.
                      .donGia(line.unitPrice())
                      .thanhTien(line.amount())

                      // Giá niêm yết đã gồm VAT để website hiển thị.
                      .donGiaDaGomVat(grossUnitPrice)
                      .thanhTienDaGomVat(grossLineAmount)
                      .build();
                })
            .toList();

    BigDecimal grossGoods =
        products.stream()
            .map(CustomerOrderResponse.Product::getThanhTienDaGomVat)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal goodsPayable = plan.data().getTongThanhToan().subtract(plan.data().getPhiGiaoHang());

    BigDecimal grossDiscount = grossGoods.subtract(goodsPayable);

    if (grossDiscount.signum() < 0) {
      throw conflict("Tổng tiền đã gồm VAT không khớp kết quả tính giá");
    }

    var response =
        CustomerOrderResponse.Preview.builder()
            .tongTienHang(plan.data().getTongTienHang())
            .tienChietKhau(plan.data().getTienChietKhau())
            .tongTienVat(plan.data().getTongTienVat())
            .phiGiaoHang(plan.data().getPhiGiaoHang())
            .tongThanhToan(plan.data().getTongThanhToan())
            .giaDaBaoGomVat(true)
            .tongTienHangDaGomVat(grossGoods)
            .tienGiamDaGomVat(grossDiscount)
            .sanPham(products)
            .thongTinNguoiNhan(recipient)
            .build();

    Map<String, Object> intake =
        new LinkedHashMap<>(intakePolicy.preview(user, plan.quantities(), false));

    response.setTiepNhan(intake);

    return saleQuotes.issue(
        response,
        SalesQuoteService.identity(user, guestCartId),
        SalesQuoteService.CUSTOMER_CHECKOUT,
        salesRequest,
        plan);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public CustomerOrderResponse.Created checkout(
      NguoiDung user,
      String guestCartId,
      String idempotencyKey,
      CustomerCheckoutRequest.Checkout request) {

    return checkout(user, guestCartId, idempotencyKey, request, null);
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public CustomerOrderResponse.Created checkout(
      NguoiDung user,
      String guestCartId,
      String idempotencyKey,
      CustomerCheckoutRequest.Checkout request,
      String remoteAddress) {

    if (idempotencyKey == null
        || !idempotencyKey.matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-" + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {

      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }

    String normalizedKey = UUID.fromString(idempotencyKey).toString();

    /*
     * Helper hiện có đã gắn dấu vân tay với:
     * USER:<id> hoặc GUEST:<guest_cart_id>.
     *
     * Guest không có cookie hợp lệ sẽ bị từ chối tại đây.
     */
    String identityAndRequestHash = checkoutRequestHash(user, guestCartId, request);

    /*
     * Đọc kết quả Redis cũ để vẫn trả lại kết quả của
     * các giao dịch đã hoàn tất trước khi đổi cơ chế.
     *
     * Không tạo thêm bản ghi Redis cho giao dịch mới.
     */
    String legacyValue = redisTemplate.opsForValue().get(checkoutIdempotencyKey(normalizedKey));

    if (legacyValue != null) {
      String expectedPrefix = identityAndRequestHash + "\n";

      if (!legacyValue.startsWith(expectedPrefix)) {
        throw conflict("Idempotency-Key đã được sử dụng cho yêu cầu khác");
      }

      String legacyResponse = legacyValue.substring(expectedPrefix.length());

      if (legacyResponse.isBlank()) {
        throw conflict("Yêu cầu checkout cũ đang chờ đối soát, " + "không tạo lại bằng khóa mới");
      }

      return decodeCreatedResponse(legacyResponse);
    }

    Long actorId = user == null ? 0L : user.getId();

    return cashbookService.executeOnce(
        "CHECKOUT-" + normalizedKey,
        actorId,
        identityAndRequestHash,
        CustomerOrderResponse.Created.class,
        () -> createOrder(user, guestCartId, request, remoteAddress));
  }

  private CustomerOrderResponse.Created createOrder(
      NguoiDung user,
      String guestCartId,
      CustomerCheckoutRequest.Checkout request,
      String remoteAddress) {

    intakePolicy.checkCheckoutRate(user, guestCartId, remoteAddress);

    requireCheckoutPromotion(user, guestCartId, request);

    List<Long> selectedIds = validateSelectedIds(request.getCartItemIds());

    List<CartLine> cartLines = checkoutLines(user, guestCartId, request, true);
    CustomerOrderResponse.Recipient recipient = resolveRecipient(user, request);

    AdminSalesRequest.Preview salesRequest = buildSalesRequest(user, request, cartLines);
    SalesCalculationService.Plan plan =
        calculationService.calculate(salesRequest, LoaiDonHang.ONLINE, true);

    saleQuotes.require(
        request.getMaXacNhanGia(),
        SalesQuoteService.identity(user, guestCartId),
        SalesQuoteService.CUSTOMER_CHECKOUT,
        salesRequest,
        plan);

    if (inputMoney(request.getTongThanhToanXacNhan()).compareTo(plan.data().getTongThanhToan())
        != 0) {
      throw conflict("Tổng tiền đã thay đổi. Vui lòng gọi preview và xác nhận lại");
    }

    DonHang order =
        DonHang.builder()
            .maDonHang(documentNumbers.next("DH"))
            .loaiDonHang(LoaiDonHang.ONLINE)
            .khachHang(user)
            .nhanVien(null)
            .tongTienHang(plan.data().getTongTienHang())
            .tienChietKhau(plan.data().getTienChietKhau())
            .phiGiaoHang(plan.data().getPhiGiaoHang())
            .tongThanhToan(plan.data().getTongThanhToan())
            .phuongThucThanhToan(request.getPhuongThucThanhToan())
            .trangThaiDonHang(TrangThaiDonHang.CHO_DUYET)
            .trangThaiThanhToan(TrangThaiThanhToanDonHang.CHUA_THANH_TOAN)
            .trangThaiDongGoi(TrangThaiDongGoi.CHUA_DONG_GOI)
            .trangThaiXuatKho(TrangThaiXuatKho.CHUA_XUAT_KHO)
            .tenNguoiNhan(recipient.getTenNguoiNhan())
            .sdtNguoiNhan(recipient.getSdtNguoiNhan())
            .diaChiGiaoHang(recipient.getDiaChiGiaoHang())
            .ghiChu(text(request.getGhiChu()))
            .build();

    order = orderRepository.saveAndFlush(order);

    List<ChiTietDonHang> savedLines = saleSnapshots.saveLines(order, plan, salesRequest);

    saleSnapshots.recordUnpaidCreationEvidence(order);

    /*
     * Checkout chỉ tạo đơn CHO_DUYET.
     *
     * Tạo đơn và giữ đủ hàng trong cùng transaction.
     * Chưa xuất kho, chưa giữ serial cụ thể, chưa ghi nhận thu tiền.
     *
     * Tồn kho được kiểm tra lại khi bắt đầu chuẩn bị hàng.
     */

    saleSnapshots.recordPromotion(order, plan, salesRequest, user);

    orderInventory.reserveForNewOrder(
        order, false, intakePolicy.temporaryReason(user, plan.quantities()));

    saleSnapshots.configureUnpaidPromotion(order);

    orderRepository.flush();

    if (user != null) {
      removePurchasedCartItems(user, guestCartId, selectedIds);
    }

    registerCartCleanupAfterCommit(user, guestCartId, cartLines);
    orderEvents.created(order);

    return CustomerOrderResponse.Created.builder()
        .id(order.getId())
        .maDonHang(order.getMaDonHang())
        .loaiDonHang(order.getLoaiDonHang())
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .trangThaiDongGoi(order.getTrangThaiDongGoi())
        .trangThaiXuatKho(order.getTrangThaiXuatKho())
        .phuongThucThanhToan(order.getPhuongThucThanhToan())
        .tongTienHang(plan.data().getTongTienHang())
        .tienChietKhau(plan.data().getTienChietKhau())
        .tongTienVat(plan.data().getTongTienVat())
        .phiGiaoHang(plan.data().getPhiGiaoHang())
        .tongThanhToan(plan.data().getTongThanhToan())
        .thongTinNguoiNhan(recipient)
        .sanPham(savedLines.stream().map(saleSnapshots::product).toList())
        .khuyenMai(saleSnapshots.appliedPromotion(order.getId()))
        .tiepNhan(backorders.customerIntake(order, intakePolicy.describe(order)))
        .build();
  }

  public CustomerOrderResponse.ListData getOrders(
      NguoiDung user, String statusValue, int page, int limit, String sortValue) {

    NguoiDung customer = requireAuthenticatedUser(user);

    if (page < 0 || limit < 1 || limit > 100 || (long) page * limit > Integer.MAX_VALUE) {
      throw invalid("page phải từ 0, limit phải từ 1 đến 100");
    }

    com.example.dantruventu.Enum.TrangThaiDonHang status = parseOrderStatus(statusValue);
    Sort sort = parseOrderSort(sortValue);

    Page<DonHangRepository.CustomerOrderSummary> result =
        orderRepository.findCustomerOrders(
            customer.getId(), status, PageRequest.of(page, limit, sort));

    List<CustomerOrderResponse.ListItem> items =
        result.getContent().stream()
            .map(
                order ->
                    CustomerOrderResponse.ListItem.builder()
                        .id(order.getId())
                        .maDonHang(order.getMaDonHang())
                        .ngayTao(
                            order.getNgayTao() == null
                                ? null
                                : order
                                    .getNgayTao()
                                    .atZone(salesProperties.zone())
                                    .toOffsetDateTime())
                        .tongThanhToan(order.getTongThanhToan())
                        .trangThaiThanhToan(order.getTrangThaiThanhToan())
                        .trangThaiDonHang(order.getTrangThaiDonHang())
                        .soLuongSanPham(order.getSoLuongSanPham())
                        .build())
            .toList();

    return CustomerOrderResponse.ListData.builder()
        .items(items)
        .pagination(
            new PaginationResponse(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()))
        .build();
  }

  public CustomerOrderResponse.Detail getOrderDetail(NguoiDung user, Long orderId) {

    NguoiDung customer = requireAuthenticatedUser(user);

    if (orderId == null || orderId <= 0) {
      throw invalid("ID đơn hàng không hợp lệ");
    }

    DonHang order =
        orderRepository
            .findByIdAndKhachHangId(orderId, customer.getId())
            .orElseThrow(
                () -> notFound("Đơn hàng không tồn tại hoặc không thuộc khách hàng hiện tại"));

    List<ChiTietDonHang> lines = orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());
    List<Long> productIds =
        lines.stream().map(line -> line.getPhienBan().getSanPham().getId()).distinct().toList();
    Map<Long, AnhSanPham> images = new LinkedHashMap<>();
    if (!productIds.isEmpty()) {
      for (AnhSanPham image :
          imageRepository.findBySanPhamIdInOrderByThuTuHienThiAscIdAsc(productIds)) {
        Long productId = image.getSanPham().getId();
        AnhSanPham current = images.get(productId);
        if (current == null
            || (!Boolean.TRUE.equals(current.getLaAnhChinh())
                && Boolean.TRUE.equals(image.getLaAnhChinh()))) {
          images.put(productId, image);
        }
      }
    }

    List<CustomerOrderResponse.DetailProduct> products =
        lines.stream()
            .map(
                line -> {
                  var stored = saleSnapshots.product(line);
                  var product = line.getPhienBan().getSanPham();
                  var image = images.get(product.getId());

                  return CustomerOrderResponse.DetailProduct.builder()
                      .chiTietDonHangId(stored.getChiTietDonHangId())
                      .phienBanId(stored.getPhienBanId())
                      .maDong(stored.getMaDong())
                      .anhDaiDien(image == null ? null : image.getDuongDanAnh())
                      .tenSanPham(stored.getTenSanPham())
                      .tenPhienBan(stored.getTenPhienBan())
                      .loaiSanPham(stored.getLoaiSanPham())
                      .soLuong(stored.getSoLuong())
                      .donGia(stored.getDonGia())
                      .thanhTien(stored.getThanhTien())
                      .laQuaTang(stored.getLaQuaTang())
                      .tienChietKhau(stored.getTienChietKhau())
                      .thanhToanDong(stored.getThanhToanDong())
                      .thueVat(stored.getThueVat())
                      .tienVat(stored.getTienVat())
                      .quanLySerial(stored.getQuanLySerial())
                      .thanhPhan(stored.getThanhPhan())
                      .canhBaoDuLieu(stored.getCanhBaoDuLieu())
                      .build();
                })
            .toList();

    List<CustomerOrderResponse.Serial> serials =
        soldDevices.originalSerials(order.getId()).stream()
            .map(
                serial ->
                    CustomerOrderResponse.Serial.builder()
                        .id(serial.id())
                        .phienBanId(serial.phienBanId())
                        .soSerial(serial.soSerial())
                        .trangThai(serial.trangThai())
                        .build())
            .toList();

    List<CustomerOrderResponse.Delivery> deliveries =
        deliveryRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(
                delivery ->
                    CustomerOrderResponse.Delivery.builder()
                        .id(delivery.getId())
                        .maPhieuGiaoHang(delivery.getMaPhieuGiaoHang())
                        .doiTacVanChuyenId(
                            delivery.getDoiTacVanChuyen() == null
                                ? null
                                : delivery.getDoiTacVanChuyen().getId())
                        .maVanDon(delivery.getMaVanDon())
                        .trangThaiGiaoHang(delivery.getTrangThaiGiaoHang())
                        .tienThuHoCod(delivery.getTienThuHoCod())
                        .build())
            .toList();

    BigDecimal discount =
        order.getTienChietKhau() == null ? BigDecimal.ZERO : order.getTienChietKhau();
    BigDecimal shipping = order.getPhiGiaoHang() == null ? BigDecimal.ZERO : order.getPhiGiaoHang();
    BigDecimal vat =
        order.getTongThanhToan().subtract(order.getTongTienHang()).add(discount).subtract(shipping);

    return CustomerOrderResponse.Detail.builder()
        .id(order.getId())
        .maDonHang(order.getMaDonHang())
        .loaiDonHang(order.getLoaiDonHang())
        .khachHangId(customer.getId())
        .tenKhachHang(customer.getHoTen())
        .soDienThoaiKhachHang(customer.getSoDienThoai())
        .tenNguoiNhan(order.getTenNguoiNhan())
        .sdtNguoiNhan(order.getSdtNguoiNhan())
        .diaChiGiaoHang(order.getDiaChiGiaoHang())
        .hinhThucNhanHang(
            text(order.getDiaChiGiaoHang()) == null ? "NHAN_TAI_CUA_HANG" : "GIAO_HANG")
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .trangThaiDongGoi(order.getTrangThaiDongGoi())
        .trangThaiXuatKho(order.getTrangThaiXuatKho())
        .tongTienHang(order.getTongTienHang())
        .tienChietKhau(discount)
        .tongTienVat(vat)
        .phiGiaoHang(shipping)
        .tongThanhToan(order.getTongThanhToan())
        .phuongThucThanhToan(order.getPhuongThucThanhToan())
        .sanPham(products)
        .serials(serials)
        .phieuGiaoHang(deliveries)
        .ghiChu(order.getGhiChu())
        .ngayTao(
            order.getNgayTao() == null
                ? null
                : order.getNgayTao().atZone(salesProperties.zone()).toOffsetDateTime())
        .khuyenMai(saleSnapshots.appliedPromotion(order.getId()))
        .thietBiDaGiao(soldDevices.details(order.getId()))
        .canhBaoThietBi(soldDevices.warning(order))
        .ngayHoanThanh(
            order.getNgayHoanThanh() == null
                ? null
                : order.getNgayHoanThanh().atZone(salesProperties.zone()).toOffsetDateTime())
        .tiepNhan(backorders.customerIntake(order, intakePolicy.describe(order)))
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public CustomerOrderResponse.Cancelled cancelOrder(
      NguoiDung user, Long orderId, String idempotencyKey, CustomerOrderRequest.Cancel request) {

    var customer = requireAuthenticatedUser(user);
    String key = "CANCEL-" + SalesQuoteService.uuid(idempotencyKey);

    return cashbookService.executeOnce(
        key,
        customer,
        List.of(orderId, request),
        CustomerOrderResponse.Cancelled.class,
        () -> {
          DonHang order =
              orderRepository
                  .findCustomerOrderForUpdate(orderId, customer.getId())
                  .orElseThrow(() -> notFound("Đơn không tồn tại hoặc không thuộc khách hàng"));

          List<CustomerOrderResponse.ReleasedStock> released =
              orderInventory.reservedQuantities(order).entrySet().stream()
                  .map(
                      entry ->
                          new CustomerOrderResponse.ReleasedStock(entry.getKey(), entry.getValue()))
                  .toList();

          var shared = new AdminOrderRequest.Cancel();
          shared.setLyDo(request.getLyDo());

          var cancellation = adminOrderService.cancel(orderId, shared);

          return CustomerOrderResponse.Cancelled.builder()
              .id(order.getId())
              .maDonHang(order.getMaDonHang())
              .trangThaiDonHang(order.getTrangThaiDonHang())
              .trangThaiXuatKho(order.getTrangThaiXuatKho())
              .trangThaiDongGoi(order.getTrangThaiDongGoi())
              .trangThaiThanhToan(order.getTrangThaiThanhToan())
              .khuyenMai(saleSnapshots.appliedPromotion(orderId))
              .giaiPhongGiuKho(released)
              .tienCanDoiSoatHoan(cancellation.getTienCanDoiSoatHoan())
              .build();
        });
  }

  public CustomerOrderResponse.Tracking trackOrder(String orderCode, String recipientPhone) {

    String normalizedCode = text(orderCode);
    String normalizedPhone = text(recipientPhone);

    if (normalizedCode == null || normalizedPhone == null) {
      throw invalid("Vui lòng cung cấp đầy đủ mã đơn hàng và số điện thoại người nhận");
    }

    DonHang order =
        orderRepository
            .findByMaDonHangIgnoreCaseAndSdtNguoiNhan(normalizedCode, normalizedPhone)
            .orElseThrow(() -> notFound("Không tìm thấy đơn hàng phù hợp"));

    return CustomerOrderResponse.Tracking.builder()
        .maDonHang(order.getMaDonHang())
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiThanhToan(order.getTrangThaiThanhToan())
        .tongThanhToan(order.getTongThanhToan())
        .tenNguoiNhan(maskRecipientName(order.getTenNguoiNhan()))
        .sdtNguoiNhan(maskPhone(order.getSdtNguoiNhan()))
        .build();
  }

  private List<Long> validateSelectedIds(List<Long> cartItemIds) {

    LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(cartItemIds);

    if (uniqueIds.size() != cartItemIds.size()) {
      throw invalid("cart_item_ids không được chứa ID trùng nhau");
    }

    return new ArrayList<>(uniqueIds);
  }

  private List<CartLine> loadSelectedCartLines(
      NguoiDung user, String guestCartId, List<Long> selectedIds, boolean lock) {

    if (user != null) {
      return loadUserCartLines(user.getId(), selectedIds, lock);
    }

    return loadGuestCartLines(guestCartId, selectedIds);
  }

  private List<CartLine> loadUserCartLines(Long userId, List<Long> selectedIds, boolean lock) {

    if (lock) {
      var owner =
          cartOwnerRepository
              .findForCartUpdate(userId)
              .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED_TOKEN));
      if (owner.getTrangThai() != com.example.dantruventu.Enum.TrangThaiCoBanEnum.HOAT_DONG) {
        throw new AppException(ErrorCode.ACCOUNT_LOCKED_OR_FORBIDDEN);
      }
    }

    List<GioHang> cartItems =
        lock
            ? cartRepository.findSelectedForUpdate(userId, selectedIds)
            : cartRepository.findByNguoiDungIdAndIdIn(userId, selectedIds);

    if (cartItems.size() != selectedIds.size()) {
      throw notFound("Cart item không tồn tại hoặc không thuộc giỏ hàng hiện tại");
    }

    Map<Long, GioHang> cartById = new LinkedHashMap<>();

    for (GioHang cartItem : cartItems) {
      cartById.put(cartItem.getId(), cartItem);
    }

    List<CartLine> result = new ArrayList<>();

    for (Long selectedId : selectedIds) {
      GioHang cartItem = cartById.get(selectedId);

      if (cartItem == null || cartItem.getSoLuong() == null || cartItem.getSoLuong() <= 0) {
        throw notFound("Cart item không tồn tại hoặc không thuộc giỏ hàng hiện tại");
      }

      result.add(new CartLine(cartItem.getPhienBan().getId(), cartItem.getSoLuong()));
    }

    return result;
  }

  private List<CartLine> loadGuestCartLines(String guestCartId, List<Long> selectedIds) {

    if (!isValidGuestCartId(guestCartId)) {
      throw notFound("Giỏ hàng khách không tồn tại");
    }

    String cartKey = GUEST_CART_KEY_PREFIX + guestCartId;
    List<CartLine> result = new ArrayList<>();

    for (Long selectedId : selectedIds) {
      Object rawQuantity = redisTemplate.opsForHash().get(cartKey, selectedId.toString());

      if (rawQuantity == null) {
        throw notFound("Cart item không tồn tại hoặc không thuộc giỏ hàng hiện tại");
      }

      try {
        int quantity = Integer.parseInt(rawQuantity.toString());

        if (quantity <= 0) {
          throw notFound("Cart item không tồn tại hoặc không thuộc giỏ hàng hiện tại");
        }

        // Với giỏ khách, cart_item_id hiện chính là phien_ban_id trong Redis.
        result.add(new CartLine(selectedId, quantity));

      } catch (NumberFormatException exception) {
        throw notFound("Cart item không tồn tại hoặc không thuộc giỏ hàng hiện tại");
      }
    }

    return result;
  }

  private CustomerOrderResponse.Recipient resolveRecipient(
      NguoiDung user, CustomerCheckoutRequest.Preview request) {

    CustomerCheckoutRequest.Recipient input = request.getThongTinNguoiNhan();
    SoDiaChi savedAddress = null;

    if (request.getDiaChiId() != null) {
      if (user == null) {
        throw invalid("Khách vãng lai không thể sử dụng dia_chi_id");
      }

      savedAddress =
          addressRepository
              .findByIdAndNguoiDungId(request.getDiaChiId(), user.getId())
              .orElseThrow(() -> notFound("Địa chỉ không tồn tại hoặc không thuộc tài khoản"));
    }

    String recipientName =
        input != null
            ? text(input.getTenNguoiNhan())
            : savedAddress != null
                ? savedAddress.getTenNguoiNhan()
                : user != null ? user.getHoTen() : null;

    String recipientPhone =
        input != null
            ? text(input.getSdtNguoiNhan())
            : savedAddress != null
                ? savedAddress.getSoDienThoai()
                : user != null ? user.getSoDienThoai() : null;

    if (recipientName == null || recipientPhone == null) {
      throw invalid("Vui lòng cung cấp đầy đủ tên và số điện thoại người nhận");
    }

    String deliveryAddress = null;

    if ("GIAO_HANG".equals(request.getHinhThucNhanHang())) {
      deliveryAddress = input == null ? null : text(input.getDiaChiGiaoHang());

      if (deliveryAddress == null && savedAddress != null) {
        deliveryAddress = formatAddress(savedAddress);
      }

      if (deliveryAddress == null) {
        throw invalid("Giao hàng tận nơi phải có địa chỉ giao hàng");
      }
    }

    return CustomerOrderResponse.Recipient.builder()
        .tenNguoiNhan(recipientName)
        .sdtNguoiNhan(recipientPhone)
        .diaChiGiaoHang(deliveryAddress)
        .build();
  }

  private void requireCheckoutPromotion(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Preview request) {

    boolean waitingRequested =
        Boolean.TRUE.equals(request.getChoPhepChoHang())
            || (request.getSanPhamChoHang() != null && !request.getSanPhamChoHang().isEmpty());

    if (waitingRequested) {
      throw invalid(
          "Website chỉ tiếp nhận đăng ký nhận thông báo khi có hàng. "
              + "Vui lòng liên hệ cửa hàng để được hỗ trợ tạo đơn chờ hàng.");
    }

    cartPromotionService.requireSelectedPromotion(user, guestCartId, request.getMaChuongTrinh());
  }

  private List<CartLine> checkoutLines(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Preview request, boolean lock) {

    return loadSelectedCartLines(
        user, guestCartId, validateSelectedIds(request.getCartItemIds()), lock);
  }

  private AdminSalesRequest.Preview buildSalesRequest(
      NguoiDung user, CustomerCheckoutRequest.Preview request, List<CartLine> cartLines) {

    AdminSalesRequest.Tax tax = new AdminSalesRequest.Tax();
    tax.setApDung(true);
    tax.setCheDoGia("DA_BAO_GOM");

    List<AdminSalesRequest.Line> products =
        cartLines.stream()
            .map(
                cartLine -> {
                  AdminSalesRequest.Line line = new AdminSalesRequest.Line();
                  line.setPhienBanId(cartLine.variantId());
                  line.setSoLuong(cartLine.quantity());
                  return line;
                })
            .toList();

    AdminSalesRequest.Preview salesRequest = new AdminSalesRequest.Preview();
    salesRequest.setKhachHangId(user == null ? null : user.getId());
    salesRequest.setKhoHangId(salesContext.defaultWarehouseId());
    salesRequest.setBangGia("BAN_LE");
    salesRequest.setThue(tax);
    salesRequest.setMaChuongTrinh(text(request.getMaChuongTrinh()));
    salesRequest.setSanPham(products);
    salesRequest.setPhiGiaoHang(
        "GIAO_HANG".equals(request.getHinhThucNhanHang()) ? deliveryFee : BigDecimal.ZERO);
    salesRequest.setGhiChu(text(request.getGhiChu()));
    salesRequest.setLoaiDonHang(LoaiDonHang.ONLINE);
    salesRequest.setChoPhepChoHang(false);

    return salesRequest;
  }

  private String formatAddress(SoDiaChi address) {
    return String.join(
        ", ", address.getDiaChiChiTiet(), address.getPhuongXa(), address.getTinhThanh());
  }

  private boolean isValidGuestCartId(String guestCartId) {
    if (guestCartId == null || guestCartId.isBlank()) {
      return false;
    }

    try {
      UUID.fromString(guestCartId);
      return true;
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }

  private void removePurchasedCartItems(
      NguoiDung user, String guestCartId, List<Long> selectedIds) {

    if (user != null) {
      long removed = cartRepository.deleteByNguoiDungIdAndIdIn(user.getId(), selectedIds);

      if (removed != selectedIds.size()) {
        throw conflict("Giỏ hàng đã thay đổi trong lúc đặt hàng. Vui lòng thử lại");
      }

      return;
    }

    String cartKey = GUEST_CART_KEY_PREFIX + guestCartId;
    String[] fields = selectedIds.stream().map(String::valueOf).toArray(String[]::new);
    Long removed = redisTemplate.opsForHash().delete(cartKey, (Object[]) fields);

    if (removed == null || removed != selectedIds.size()) {
      throw conflict("Giỏ hàng đã thay đổi trong lúc đặt hàng. Vui lòng thử lại");
    }

    if (Boolean.FALSE.equals(redisTemplate.hasKey(cartKey))) {
      redisTemplate.delete(cartKey);
    }
  }

  private void clearStoredPromotion(NguoiDung user, String guestCartId) {
    String promotionKey =
        user != null
            ? USER_PROMOTION_KEY_PREFIX + user.getId() + PROMOTION_KEY_SUFFIX
            : GUEST_CART_KEY_PREFIX + guestCartId + PROMOTION_KEY_SUFFIX;

    redisTemplate.delete(promotionKey);
  }

  private NguoiDung requireAuthenticatedUser(NguoiDung user) {
    if (user == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED, "Vui lòng đăng nhập để xem đơn hàng");
    }

    return user;
  }

  private com.example.dantruventu.Enum.TrangThaiDonHang parseOrderStatus(String value) {
    String normalized = text(value);

    if (normalized == null) {
      return null;
    }

    try {
      return com.example.dantruventu.Enum.TrangThaiDonHang.valueOf(
          normalized.toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw invalid("Trạng thái đơn hàng không hợp lệ");
    }
  }

  private Sort parseOrderSort(String value) {
    String normalized = text(value);

    if (normalized == null) {
      normalized = "ngay_tao,desc";
    }

    String[] parts = normalized.split(",", -1);

    if (parts.length != 2 || !"ngay_tao".equalsIgnoreCase(parts[0].strip())) {
      throw invalid("sort chỉ hỗ trợ ngay_tao,asc hoặc ngay_tao,desc");
    }

    Sort.Direction direction;

    try {
      direction = Sort.Direction.fromString(parts[1].strip());
    } catch (IllegalArgumentException exception) {
      throw invalid("sort chỉ hỗ trợ ngay_tao,asc hoặc ngay_tao,desc");
    }

    return Sort.by(direction, "ngayTao");
  }

  private String checkoutIdempotencyKey(String value) {
    if (value == null || value.isBlank()) {
      throw invalid("Thiếu header Idempotency-Key");
    }

    try {
      return CHECKOUT_IDEMPOTENCY_KEY_PREFIX + UUID.fromString(value.strip());
    } catch (IllegalArgumentException exception) {
      throw invalid("Idempotency-Key phải là UUID hợp lệ");
    }
  }

  private String checkoutRequestHash(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Checkout request) {

    String identity;

    if (user != null) {
      identity = "USER:" + user.getId();
    } else {
      if (!isValidGuestCartId(guestCartId)) {
        throw notFound("Giỏ hàng khách không tồn tại");
      }
      identity = "GUEST:" + guestCartId;
    }

    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256")
              .digest(
                  (identity + "\n" + objectMapper.writeValueAsString(request))
                      .getBytes(StandardCharsets.UTF_8));

      return HexFormat.of().formatHex(digest);
    } catch (Exception exception) {
      throw new IllegalStateException("Không thể xác định yêu cầu đặt hàng", exception);
    }
  }

  private CustomerOrderResponse.Created decodeCreatedResponse(String json) {
    try {
      return objectMapper.readValue(json, CustomerOrderResponse.Created.class);
    } catch (Exception exception) {
      throw new IllegalStateException("Không đọc được kết quả đặt hàng đã lưu", exception);
    }
  }

  private void deletePendingIdempotency(String redisKey, String pendingValue) {
    String current = redisTemplate.opsForValue().get(redisKey);

    if (pendingValue.equals(current)) {
      redisTemplate.delete(redisKey);
    }
  }

  private void mergeQuantity(Map<Long, Integer> quantities, Long variantId, int added) {
    quantities.merge(variantId, added, (current, value) -> quantity((long) current + value));
  }

  private String maskRecipientName(String value) {
    String normalized = text(value);

    if (normalized == null) {
      return "***";
    }

    String[] words = normalized.split("\\s+");

    if (words.length == 1) {
      return words[0].substring(0, 1) + "***";
    }

    return words[0] + " " + words[1].substring(0, 1) + "***";
  }

  private String maskPhone(String value) {
    String normalized = text(value);

    if (normalized == null || normalized.length() < 4) {
      return "******";
    }

    return "******" + normalized.substring(normalized.length() - 4);
  }

  private record CartLine(Long variantId, Integer quantity) {}

  private void registerCartCleanupAfterCommit(
      NguoiDung user, String guestCartId, List<CartLine> purchasedLines) {

    List<CartLine> snapshot = List.copyOf(purchasedLines);

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            try {
              if (user == null) {
                String cartKey = GUEST_CART_KEY_PREFIX + guestCartId;

                /*
                 * Chỉ xóa dòng nếu số lượng chưa bị thay đổi.
                 * Không xóa nhầm một dòng khách vừa cập nhật.
                 */
                String scriptText =
                    """
                                        for i = 1, #ARGV, 2 do
                                          if redis.call('HGET', KEYS[1], ARGV[i]) == ARGV[i + 1] then
                                            redis.call('HDEL', KEYS[1], ARGV[i])
                                          end
                                        end
                                        return 1
                                        """;

                var script =
                    new org.springframework.data.redis.core.script.DefaultRedisScript<>(
                        scriptText, Long.class);

                List<String> arguments = new ArrayList<>();

                for (CartLine line : snapshot) {
                  arguments.add(String.valueOf(line.variantId()));
                  arguments.add(String.valueOf(line.quantity()));
                }

                redisTemplate.execute(script, List.of(cartKey), arguments.toArray());
              }

              clearStoredPromotion(user, guestCartId);

            } catch (RuntimeException exception) {
              /*
               * MySQL đã commit: không báo checkout thất bại
               * chỉ vì dọn giỏ Redis thất bại.
               *
               * Gửi lại cùng Idempotency-Key vẫn nhận đúng đơn cũ.
               */
              org.slf4j.LoggerFactory.getLogger(CustomerOrderService.class)
                  .warn("Đơn đã tạo nhưng chưa dọn được giỏ/promotion Redis", exception);
            }
          }
        });
  }
}
