package com.example.dantruventu.Services.order;

import static com.example.dantruventu.Services.order.sales.SalesSupport.invalid;
import static com.example.dantruventu.Services.order.sales.SalesSupport.inputMoney;
import static com.example.dantruventu.Services.order.sales.SalesSupport.notFound;
import static com.example.dantruventu.Services.order.sales.SalesSupport.quantity;
import static com.example.dantruventu.Services.order.sales.SalesSupport.text;
import static com.example.dantruventu.Services.order.sales.SalesSupport.conflict;

import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Request.order.CustomerCheckoutRequest;
import com.example.dantruventu.DTO.Request.order.CustomerOrderRequest;
import com.example.dantruventu.DTO.Response.PaginationResponse;
import com.example.dantruventu.DTO.Response.order.CustomerOrderResponse;
import com.example.dantruventu.Config.SalesProperties;
import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.DonHang;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.SoDiaChi;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Enum.LoaiSanPham;
import com.example.dantruventu.Enum.TrangThaiDonHang;
import com.example.dantruventu.Enum.TrangThaiDongGoi;
import com.example.dantruventu.Enum.TrangThaiThanhToanDonHang;
import com.example.dantruventu.Enum.TrangThaiXuatKho;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Repository.SoDiaChiRepository;
import com.example.dantruventu.Repository.order.ChiTietDonHangRepository;
import com.example.dantruventu.Repository.order.DonHangRepository;
import com.example.dantruventu.Repository.order.PhieuGiaoHangRepository;
import com.example.dantruventu.Repository.warehouse.SoSerialSanPhamRepository;
import com.example.dantruventu.Repository.warehouse.ThanhPhanComboRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;
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
  private final SoDiaChiRepository addressRepository;
  private final DonHangRepository orderRepository;
  private final ChiTietDonHangRepository orderLineRepository;
  private final PhieuGiaoHangRepository deliveryRepository;
  private final SoSerialSanPhamRepository serialRepository;
  private final ThanhPhanComboRepository comboComponentRepository;
  private final StringRedisTemplate redisTemplate;
  private final SalesCalculationService calculationService;
  private final SalesContext salesContext;
  private final SalesProperties salesProperties;
  private final ObjectMapper objectMapper;

  @Value("${ruventu.order.delivery-fee:30000}")
  private BigDecimal deliveryFee;

  public CustomerOrderResponse.Preview preview(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Preview request) {

    List<Long> selectedIds = validateSelectedIds(request.getCartItemIds());
    List<CartLine> cartLines = loadSelectedCartLines(user, guestCartId, selectedIds, false);

    CustomerOrderResponse.Recipient recipient = resolveRecipient(user, request);

    AdminSalesRequest.Preview salesRequest = buildSalesRequest(user, request, cartLines);

    SalesCalculationService.Plan plan =
        calculationService.calculate(salesRequest, LoaiDonHang.ONLINE, false);

    List<CustomerOrderResponse.Product> products =
        plan.data().getSanPham().stream()
            .map(
                line ->
                    CustomerOrderResponse.Product.builder()
                        .phienBanId(line.phienBanId())
                        .soLuong(line.soLuong())
                        .donGia(line.donGia())
                        .thanhTien(line.thanhTien())
                        .build())
            .toList();

    return CustomerOrderResponse.Preview.builder()
        .tongTienHang(plan.data().getTongTienHang())
        .tienChietKhau(plan.data().getTienChietKhau())
        .tongTienVat(plan.data().getTongTienVat())
        .phiGiaoHang(plan.data().getPhiGiaoHang())
        .tongThanhToan(plan.data().getTongThanhToan())
        .sanPham(products)
        .thongTinNguoiNhan(recipient)
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public CustomerOrderResponse.Created checkout(
      NguoiDung user,
      String guestCartId,
      String idempotencyKey,
      CustomerCheckoutRequest.Checkout request) {

    String redisKey = checkoutIdempotencyKey(idempotencyKey);
    String requestHash = checkoutRequestHash(user, guestCartId, request);
    String pendingValue = requestHash + "\n";

    Boolean acquired =
        redisTemplate.opsForValue().setIfAbsent(redisKey, pendingValue, IDEMPOTENCY_TTL);

    if (!Boolean.TRUE.equals(acquired)) {
      String existing = redisTemplate.opsForValue().get(redisKey);

      if (existing == null || !existing.startsWith(requestHash + "\n")) {
        throw conflict("Idempotency-Key đã được sử dụng cho yêu cầu khác");
      }

      String responseJson = existing.substring((requestHash + "\n").length());

      if (responseJson.isBlank()) {
        throw conflict("Yêu cầu đặt hàng đang được xử lý. Vui lòng thử lại sau");
      }

      return decodeCreatedResponse(responseJson);
    }

    try {
      CustomerOrderResponse.Created response = createOrder(user, guestCartId, request);
      String completedValue = requestHash + "\n" + objectMapper.writeValueAsString(response);

      registerIdempotencyCompletion(redisKey, pendingValue, completedValue);
      return response;

    } catch (RuntimeException exception) {
      deletePendingIdempotency(redisKey, pendingValue);
      throw exception;
    } catch (Exception exception) {
      deletePendingIdempotency(redisKey, pendingValue);
      throw new IllegalStateException("Không thể lưu kết quả đặt hàng", exception);
    }
  }

  private CustomerOrderResponse.Created createOrder(
      NguoiDung user, String guestCartId, CustomerCheckoutRequest.Checkout request) {

    List<Long> selectedIds = validateSelectedIds(request.getCartItemIds());
    List<CartLine> cartLines = loadSelectedCartLines(user, guestCartId, selectedIds, true);
    CustomerOrderResponse.Recipient recipient = resolveRecipient(user, request);

    AdminSalesRequest.Preview salesRequest = buildSalesRequest(user, request, cartLines);
    SalesCalculationService.Plan plan =
        calculationService.calculate(salesRequest, LoaiDonHang.ONLINE, true);

    if (inputMoney(request.getTongThanhToanXacNhan())
        .compareTo(plan.data().getTongThanhToan()) != 0) {
      throw conflict("Tổng tiền đã thay đổi. Vui lòng gọi preview và xác nhận lại");
    }

    DonHang order =
        DonHang.builder()
            .maDonHang("ORD-" + UUID.randomUUID())
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

    List<ChiTietDonHang> savedLines = new ArrayList<>();

    for (SalesCalculationService.SaleLine line : plan.lines()) {
      savedLines.add(
          orderLineRepository.save(
              ChiTietDonHang.builder()
                  .donHang(order)
                  .phienBan(line.variant())
                  .soLuong(line.quantity())
                  .donGia(line.unitPrice())
                  .thanhTien(line.amount())
                  .build()));
    }

    // Đơn online chỉ giữ hàng: giảm tồn có thể bán, chưa giảm tồn thực tế.
    for (Map.Entry<Long, Integer> requirement : plan.quantities().entrySet()) {
      var stock = plan.stocks().get(requirement.getKey());
      stock.setTonCoTheBan(stock.getTonCoTheBan() - requirement.getValue());
    }

    if (plan.promotion() != null) {
      Integer used = plan.promotion().getSoLuongDaDung();
      plan.promotion().setSoLuongDaDung((used == null ? 0 : used) + 1);
    }

    orderRepository.flush();

    removePurchasedCartItems(user, guestCartId, selectedIds);
    clearStoredPromotion(user, guestCartId);

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
        .sanPham(
            savedLines.stream()
                .map(
                    line ->
                        CustomerOrderResponse.CreatedProduct.builder()
                            .chiTietDonHangId(line.getId())
                            .phienBanId(line.getPhienBan().getId())
                            .soLuong(line.getSoLuong())
                            .build())
                .toList())
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

    List<CustomerOrderResponse.DetailProduct> products =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(
                line ->
                    CustomerOrderResponse.DetailProduct.builder()
                        .chiTietDonHangId(line.getId())
                        .phienBanId(line.getPhienBan().getId())
                        .tenSanPham(line.getPhienBan().getSanPham().getTenSanPham())
                        .tenPhienBan(line.getPhienBan().getTenPhienBan())
                        .soLuong(line.getSoLuong())
                        .donGia(line.getDonGia())
                        .thanhTien(line.getThanhTien())
                        // ERD hiện không lưu snapshot VAT/chiết khấu theo từng dòng.
                        .thueVat(null)
                        .tienChietKhau(null)
                        .tienVat(null)
                        .quanLySerial(calculationService.usesSerial(line.getPhienBan().getId()))
                        .build())
            .toList();

    List<CustomerOrderResponse.Serial> serials =
        serialRepository.findByDonHang_IdOrderByIdAsc(order.getId()).stream()
            .map(
                serial ->
                    CustomerOrderResponse.Serial.builder()
                        .id(serial.getId())
                        .phienBanId(serial.getPhienBan().getId())
                        .soSerial(serial.getSoSerial())
                        .trangThai(serial.getTrangThai())
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
    BigDecimal shipping =
        order.getPhiGiaoHang() == null ? BigDecimal.ZERO : order.getPhiGiaoHang();
    BigDecimal vat =
        order.getTongThanhToan()
            .subtract(order.getTongTienHang())
            .add(discount)
            .subtract(shipping);

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
        .build();
  }

  @Transactional(isolation = Isolation.READ_COMMITTED)
  public CustomerOrderResponse.Cancelled cancelOrder(
      NguoiDung user, Long orderId, CustomerOrderRequest.Cancel request) {

    NguoiDung customer = requireAuthenticatedUser(user);

    if (orderId == null || orderId <= 0) {
      throw invalid("ID đơn hàng không hợp lệ");
    }

    DonHang order =
        orderRepository
            .findCustomerOrderForUpdate(orderId, customer.getId())
            .orElseThrow(
                () -> notFound("Đơn hàng không tồn tại hoặc không thuộc khách hàng hiện tại"));

    boolean cancellableState =
        order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_DUYET
            || order.getTrangThaiDonHang() == TrangThaiDonHang.CHO_THANH_TOAN;

    if (!cancellableState
        || order.getTrangThaiXuatKho() != TrangThaiXuatKho.CHUA_XUAT_KHO
        || order.getTrangThaiDongGoi() != TrangThaiDongGoi.CHUA_DONG_GOI) {
      throw invalid("Không thể hủy đơn ở trạng thái hiện tại");
    }

    restoreReservedStock(order);

    String cancelNote = "[Khách hủy] " + request.getLyDo().strip();
    order.setGhiChu(
        text(order.getGhiChu()) == null ? cancelNote : order.getGhiChu() + "\n" + cancelNote);
    order.setTrangThaiDonHang(TrangThaiDonHang.HUY_HANG);
    order.setTrangThaiDongGoi(TrangThaiDongGoi.HUY_DONG_GOI);

    orderRepository.flush();

    return CustomerOrderResponse.Cancelled.builder()
        .id(order.getId())
        .maDonHang(order.getMaDonHang())
        .trangThaiDonHang(order.getTrangThaiDonHang())
        .trangThaiXuatKho(order.getTrangThaiXuatKho())
        .build();
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

  private List<CartLine> loadUserCartLines(
      Long userId, List<Long> selectedIds, boolean lock) {

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
            : savedAddress != null ? savedAddress.getTenNguoiNhan() : user != null ? user.getHoTen() : null;

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

  private AdminSalesRequest.Preview buildSalesRequest(
      NguoiDung user,
      CustomerCheckoutRequest.Preview request,
      List<CartLine> cartLines) {

    AdminSalesRequest.Tax tax = new AdminSalesRequest.Tax();
    tax.setApDung(true);
    tax.setCheDoGia("CHUA_BAO_GOM");

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
        "GIAO_HANG".equals(request.getHinhThucNhanHang())
            ? deliveryFee
            : BigDecimal.ZERO);
    salesRequest.setGhiChu(text(request.getGhiChu()));
    salesRequest.setLoaiDonHang(LoaiDonHang.ONLINE);

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

  private void registerIdempotencyCompletion(
      String redisKey, String pendingValue, String completedValue) {

    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            redisTemplate.opsForValue().set(redisKey, completedValue, IDEMPOTENCY_TTL);
          }

          @Override
          public void afterCompletion(int status) {
            if (status != TransactionSynchronization.STATUS_COMMITTED) {
              deletePendingIdempotency(redisKey, pendingValue);
            }
          }
        });
  }

  private void deletePendingIdempotency(String redisKey, String pendingValue) {
    String current = redisTemplate.opsForValue().get(redisKey);

    if (pendingValue.equals(current)) {
      redisTemplate.delete(redisKey);
    }
  }

  private void restoreReservedStock(DonHang order) {

    List<ChiTietDonHang> orderLines =
        orderLineRepository.findByDonHang_IdOrderByIdAsc(order.getId());

    if (orderLines.isEmpty()) {
      throw conflict("Đơn hàng không có chi tiết sản phẩm");
    }

    Map<Long, Integer> physicalQuantities = new TreeMap<>();

    for (ChiTietDonHang line : orderLines) {
      if (line.getSoLuong() == null || line.getSoLuong() <= 0) {
        throw conflict("Số lượng trong chi tiết đơn hàng không hợp lệ");
      }

      var saleVariant = line.getPhienBan();
      LoaiSanPham productType = saleVariant.getSanPham().getLoaiSanPham();

      if (productType == LoaiSanPham.DON) {
        mergeQuantity(physicalQuantities, saleVariant.getId(), line.getSoLuong());
        continue;
      }

      if (productType != LoaiSanPham.BO_PC) {
        throw conflict("Loại sản phẩm trong đơn hàng không được hỗ trợ");
      }

      var components =
          comboComponentRepository.findByComboIds(List.of(saleVariant.getSanPham().getId()));

      if (components.isEmpty()) {
        throw conflict("Combo trong đơn hàng không có cấu hình thành phần");
      }

      for (var component : components) {
        if (component.getSoLuong() == null || component.getSoLuong() <= 0) {
          throw conflict("Số lượng thành phần combo không hợp lệ");
        }

        int componentQuantity =
            quantity((long) line.getSoLuong() * component.getSoLuong());

        mergeQuantity(
            physicalQuantities,
            component.getPhienBanThanhPhan().getId(),
            componentQuantity);
      }
    }

    for (Map.Entry<Long, Integer> entry : physicalQuantities.entrySet()) {
      var stock =
          calculationService.stock(
              salesContext.defaultWarehouseId(), entry.getKey(), true);

      if (stock == null) {
        throw conflict("Không tìm thấy tồn kho của phiên bản " + entry.getKey());
      }

      long restored = (long) stock.getTonCoTheBan() + entry.getValue();
      long maximumAvailable = (long) stock.getTonThucTe() - stock.getHangLoi();

      if (restored > maximumAvailable || restored > Integer.MAX_VALUE) {
        throw conflict("Dữ liệu giữ hàng không nhất quán tại phiên bản " + entry.getKey());
      }

      stock.setTonCoTheBan((int) restored);
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
}
