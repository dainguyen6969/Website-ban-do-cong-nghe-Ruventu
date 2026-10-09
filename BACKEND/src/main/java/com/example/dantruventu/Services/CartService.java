package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Request.AddCartItemRequest;
import com.example.dantruventu.DTO.Request.CartPcBuildRequest;
import com.example.dantruventu.DTO.Request.PcBuilderPreviewRequest;
import com.example.dantruventu.DTO.Request.UpdateCartItemRequest;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartPcBuildResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.Entity.AnhSanPham;
import com.example.dantruventu.Entity.GioHang;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Entity.PhienBanSanPham;
import com.example.dantruventu.Entity.SanPham;
import com.example.dantruventu.Enum.TrangThaiCoBanEnum;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Repository.GioHangRepository;
import com.example.dantruventu.Repository.NguoiDungRepository;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import com.example.dantruventu.Repository.product.PhienBanSanPhamRepository;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartService {

  private static final String GUEST_CART_KEY_PREFIX = "cart:guest:";

  private final GioHangRepository gioHangRepository;
  private final PhienBanSanPhamRepository phienBanSanPhamRepository;
  private final StringRedisTemplate redisTemplate;
  private final NguoiDungRepository userRepository;
  private final EntityManager entityManager;
  private final PlatformTransactionManager transactionManager;
  private final SalesIdempotencyRepository idempotencyRepository;
  private final PcBuilderService pcBuilderService;
  private final PcBuilderStockSupport pcBuilderStockSupport;
  private final SalesCalculationService calculationService;
  private final CartGuestStore guestStore;
  private final ObjectMapper objectMapper;

  /** TransactionTemplate cho phép bắt cả lỗi commit, trước khi controller báo thành công. */
  public CartPcBuildResponse addPcBuild(
      NguoiDung user, String guestId, String idempotencyKey, CartPcBuildRequest request) {
    try {
      String key = requirePcBuildKey(idempotencyKey);
      ValidatedBuild build = validatePcBuild(request);
      String owner = user == null ? "GUEST:" + guestId : "USER:" + user.getId();
      String hash = fingerprint(owner, build);
      TransactionTemplate transaction = new TransactionTemplate(transactionManager);
      transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
      if (user != null) {
        return transaction.execute(
            status -> {
              NguoiDung lockedUser = lockUserCart(user);
              String storedKey =
                  "PCB-"
                      + UUID.nameUUIDFromBytes(
                          (owner + ":" + key).getBytes(StandardCharsets.UTF_8));
              var entry = idempotencyRepository.acquire(storedKey, lockedUser.getId(), hash);
              if (!Objects.equals(entry.actorId(), lockedUser.getId())
                  || !hash.equals(entry.requestHash())) {
                throw new AppException(ErrorCode.CART_PC_BUILD_IDEMPOTENCY_CONFLICT);
              }
              if (entry.responseJson() != null)
                return objectMapper.readValue(entry.responseJson(), CartPcBuildResponse.class);
              List<GioHang> rows =
                  gioHangRepository.findByNguoiDungIdOrderByNgayCapNhatDesc(lockedUser.getId());
              Map<Long, GioHang> byVariant = new LinkedHashMap<>();
              Map<Long, Integer> current = new LinkedHashMap<>();
              for (GioHang row : rows) {
                Long id = row.getPhienBan().getId();
                if (byVariant.put(id, row) != null)
                  throw new IllegalStateException("Giỏ có dòng phiên bản trùng.");
                current.put(id, row.getSoLuong());
              }
              CartPcBuildResponse result = evaluatePcBuild(build, current, true);
              // Chỉ ghi sau khi TẤT CẢ giá/socket/tồn đã hợp lệ; không gọi addItem từng dòng.
              for (var item : result.items()) {
                GioHang row = byVariant.get(item.phienBanId());
                if (row == null)
                  row =
                      GioHang.builder()
                          .nguoiDung(lockedUser)
                          .phienBan(phienBanSanPhamRepository.getReferenceById(item.phienBanId()))
                          .build();
                row.setSoLuong(item.soLuongSau());
                gioHangRepository.save(row);
              }
              gioHangRepository.flush();
              idempotencyRepository.complete(storedKey, objectMapper.writeValueAsString(result));
              return result;
            });
      }
      // Cookie phải do server cấp; cookie đúng dạng nhưng phiên hết hạn không tự tạo giỏ khác.
      String effectiveId = guestStore.prepare(guestId, true);
      if (!effectiveId.equals(guestId)) throw new AppException(ErrorCode.GUEST_CART_EXPIRED);
      var prior = guestStore.replay(guestId, key, hash);
      if (prior != null) return prior;
      GuestBuild prepared =
          transaction.execute(
              status -> {
                Map<String, String> snapshot = guestStore.snapshot(guestId);
                Map<Long, Integer> current = new LinkedHashMap<>();
                snapshot.forEach(
                    (id, quantity) -> {
                      Long variantId = Long.valueOf(id);
                      Integer count = Integer.valueOf(quantity);
                      if (variantId <= 0 || count <= 0 || count > 99)
                        throw new IllegalStateException("Dữ liệu giỏ khách không hợp lệ.");
                      current.put(variantId, count);
                    });
                return new GuestBuild(snapshot, evaluatePcBuild(build, current, false));
              });
      // MySQL chỉ đọc ở nhánh guest, đã kết thúc thành công trước khi Lua ghi vào Redis.
      return guestStore.commit(guestId, key, hash, prepared.snapshot(), prepared.response());
    } catch (AppException exception) {
      throw mapPcBuildError(exception);
    } catch (Exception exception) {
      log.error("Không cập nhật được toàn bộ giỏ từ PC Builder", exception);
      throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    }
  }

  public String preparePcBuildGuest(String cookie) {
    if (cookie == null || cookie.isBlank()) {
      throw new AppException(
          ErrorCode.GUEST_CART_EXPIRED,
          "Vui lòng gọi GET /api/v1/cart để nhận cookie giỏ khách trước khi thêm cấu hình.");
    }
    try {
      return guestStore.prepare(cookie, true);
    } catch (AppException exception) {
      throw exception;
    } catch (Exception exception) {
      log.error("Không nhận diện được giỏ khách", exception);
      throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    }
  }

  private CartPcBuildResponse evaluatePcBuild(
      ValidatedBuild build, Map<Long, Integer> current, boolean lock) {
    pcBuilderService.validateVariants(build.selections());
    var increments =
        pcBuilderStockSupport.aggregateDemand(
            build.selections().stream()
                .map(
                    item ->
                        new PcBuilderStockSupport.DemandInput(item.variantId(), item.quantity()))
                .toList());
    Map<Long, Integer> after = new TreeMap<>(current);
    List<CartPcBuildResponse.Item> resultItems = new ArrayList<>();
    long added = 0;
    for (var entry : increments.entrySet()) {
      int before = current.getOrDefault(entry.getKey(), 0);
      long total = Math.addExact(before, entry.getValue());
      if (before < 0 || total > 99) throw new AppException(ErrorCode.INVALID_CART_QUANTITY);
      int count = Math.toIntExact(total);
      after.put(entry.getKey(), count);
      resultItems.add(
          new CartPcBuildResponse.Item(
              entry.getKey(), before, Math.toIntExact(entry.getValue()), count));
      added = Math.addExact(added, entry.getValue());
    }
    var catalog = calculationService.catalog(after.keySet(), lock);
    // Preview dùng lại chính mapper hạng mục, giá hiện tại, socket và tổng nhu cầu tồn.
    var preview = pcBuilderService.preview(build.previewRequest());
    for (int i = 0; i < preview.items().size(); i++) {
      if (preview.items().get(i).donGia().compareTo(build.confirmedPrices().get(i)) != 0) {
        throw new AppException(ErrorCode.CART_PC_BUILD_PRICE_CHANGED);
      }
    }
    String socketStatus = preview.kiemTraCpuMain().trangThai();
    if ("KHONG_KHOP_SOCKET".equals(socketStatus) || "CHUA_DU_DU_LIEU".equals(socketStatus)) {
      throw new AppException(ErrorCode.CART_PC_BUILD_SOCKET_INVALID);
    }
    Long warehouseId = pcBuilderService.resolveWarehouse(ErrorCode.CART_PC_BUILD_FAILED);
    // Bao gồm nhu cầu linh kiện dùng chung của combo đã có trong giỏ, cùng phép tính của đơn hàng.
    for (var need : calculationService.physicalDemand(catalog, after).entrySet()) {
      var stock = calculationService.stock(warehouseId, need.getKey(), lock);
      if (stock == null || stock.getTonCoTheBan() < need.getValue()) {
        throw new AppException(ErrorCode.CART_PC_BUILD_INSUFFICIENT_STOCK);
      }
    }
    return new CartPcBuildResponse(
        build.selections().size(), resultItems.size(), added, List.copyOf(resultItems));
  }

  private ValidatedBuild validatePcBuild(CartPcBuildRequest request) {
    if (request == null || request.items() == null || request.items().isEmpty()) {
      throw new AppException(ErrorCode.INVALID_CART_PC_BUILD, "Cấu hình hiện đang trống.");
    }
    var previewRequest =
        new PcBuilderPreviewRequest(
            request.items().stream()
                .map(
                    item ->
                        item == null
                            ? null
                            : new PcBuilderPreviewRequest.Item(
                                item.maHangMuc(), item.phienBanId(), item.soLuong()))
                .toList());
    var selections = pcBuilderService.validateSelections(previewRequest);
    List<BigDecimal> prices = new ArrayList<>();
    for (var item : request.items()) {
      if (!(item.donGiaXacNhan() instanceof Number number)) {
        throw new AppException(ErrorCode.INVALID_CART_PC_BUILD, "Thiếu hoặc sai don_gia_xac_nhan.");
      }
      try {
        BigDecimal price = new BigDecimal(number.toString()).stripTrailingZeros();
        if (price.signum() < 0
            || price.scale() > 2
            || (long) price.precision() - price.scale() > 36) throw new NumberFormatException();
        prices.add(price);
      } catch (NumberFormatException exception) {
        throw new AppException(ErrorCode.INVALID_CART_PC_BUILD, "don_gia_xac_nhan không hợp lệ.");
      }
    }
    return new ValidatedBuild(previewRequest, selections, prices);
  }

  private String requirePcBuildKey(String key) {
    if (key == null
        || !key.matches(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {
      throw new AppException(
          ErrorCode.INVALID_CART_PC_BUILD, "Idempotency-Key bắt buộc và phải là UUID.");
    }
    return UUID.fromString(key).toString();
  }

  private String fingerprint(String owner, ValidatedBuild build) throws Exception {
    List<Object> normalized = new ArrayList<>();
    for (int i = 0; i < build.selections().size(); i++) {
      var item = build.selections().get(i);
      normalized.add(
          List.of(
              item.category().name(),
              item.variantId(),
              item.quantity(),
              build.confirmedPrices().get(i).toPlainString()));
    }
    return HexFormat.of()
        .formatHex(
            MessageDigest.getInstance("SHA-256")
                .digest(
                    (owner + "\n" + objectMapper.writeValueAsString(normalized))
                        .getBytes(StandardCharsets.UTF_8)));
  }

  private AppException mapPcBuildError(AppException exception) {
    return switch (exception.getErrorCode()) {
      case INVALID_PC_BUILDER_PREVIEW ->
          new AppException(ErrorCode.INVALID_CART_PC_BUILD, exception.getMessage());
      case PC_BUILDER_PREVIEW_UNAVAILABLE -> new AppException(ErrorCode.CART_PC_BUILD_DISCONTINUED);
      case NOT_FOUND -> new AppException(ErrorCode.PC_BUILDER_PREVIEW_VARIANT_NOT_FOUND);
      case PC_BUILDER_CONFIGURATION_INVALID, PC_BUILDER_PREVIEW_FAILED ->
          new AppException(ErrorCode.CART_PC_BUILD_FAILED);
      case CONFLICT ->
          exception.getMessage().contains("ngừng")
              ? new AppException(ErrorCode.CART_PC_BUILD_DISCONTINUED)
              : new AppException(ErrorCode.CART_PC_BUILD_FAILED);
      default -> exception;
    };
  }

  private NguoiDung lockUserCart(NguoiDung user) {
    NguoiDung locked =
        userRepository
            .findForCartUpdate(user.getId())
            .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED_TOKEN));
    entityManager.refresh(locked);
    if (locked.getTrangThai() != TrangThaiCoBanEnum.HOAT_DONG)
      throw new AppException(ErrorCode.ACCOUNT_LOCKED_OR_FORBIDDEN);
    return locked;
  }

  private record ValidatedBuild(
      PcBuilderPreviewRequest previewRequest,
      List<PcBuilderService.Selection> selections,
      List<BigDecimal> confirmedPrices) {}

  private record GuestBuild(Map<String, String> snapshot, CartPcBuildResponse response) {}

  @Transactional(readOnly = true)
  public CartResponse getCurrentCart(NguoiDung nguoiDung, String guestCartId) {

    if (nguoiDung != null) {
      return getUserCart(nguoiDung.getId());
    }

    return getGuestCart(guestCartId);
  }

  @Transactional
  public CartItemMutationResponse addItem(
      NguoiDung nguoiDung, String guestCartId, AddCartItemRequest request) {

    if (nguoiDung != null) lockUserCart(nguoiDung);

    PhienBanSanPham phienBan =
        phienBanSanPhamRepository
            .findById(request.getPhienBanId())
            .filter(this::isActiveVariant)
            .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND));

    int tonKhoKhaDung = calculateAvailableStock(phienBan);

    if (nguoiDung != null) {
      return addUserItem(nguoiDung, phienBan, request.getSoLuong(), tonKhoKhaDung);
    }

    if (!isValidGuestCartId(guestCartId)) {
      throw new AppException(ErrorCode.INVALID_DATA);
    }

    return addGuestItem(guestCartId, phienBan, request.getSoLuong(), tonKhoKhaDung);
  }

  @Transactional
  public CartItemMutationResponse updateItem(
      NguoiDung nguoiDung, String guestCartId, Long cartItemId, UpdateCartItemRequest request) {

    if (nguoiDung != null) lockUserCart(nguoiDung);

    if (cartItemId == null || cartItemId <= 0) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }

    if (nguoiDung != null) {
      return updateUserItem(nguoiDung, cartItemId, request.getSoLuong());
    }

    if (!isValidGuestCartId(guestCartId)) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }

    return updateGuestItem(guestCartId, cartItemId, request.getSoLuong());
  }

  @Transactional
  public CartItemMutationResponse deleteItem(
      NguoiDung nguoiDung, String guestCartId, Long cartItemId) {

    if (nguoiDung != null) lockUserCart(nguoiDung);

    if (cartItemId == null || cartItemId <= 0) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }

    if (nguoiDung != null) {
      return deleteUserItem(nguoiDung, cartItemId);
    }

    if (!isValidGuestCartId(guestCartId)) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }

    return deleteGuestItem(guestCartId, cartItemId);
  }

  @Transactional
  public boolean mergeGuestCart(NguoiDung nguoiDung, String guestCartId) {

    if (nguoiDung == null || guestCartId == null || guestCartId.isBlank()) {

      return false;
    }

    if (!isValidGuestCartId(guestCartId)) {
      return true;
    }

    lockUserCart(nguoiDung);

    String redisKey = buildGuestCartKey(guestCartId);

    Map<Object, Object> redisItems = redisTemplate.opsForHash().entries(redisKey);

    for (Map.Entry<Object, Object> entry : redisItems.entrySet()) {

      try {

        Long phienBanId = Long.valueOf(entry.getKey().toString());

        int guestQuantity = Integer.parseInt(entry.getValue().toString());

        if (guestQuantity <= 0) {
          continue;
        }

        phienBanSanPhamRepository
            .findById(phienBanId)
            .ifPresent(phienBan -> mergeGuestItemIntoUserCart(nguoiDung, phienBan, guestQuantity));

      } catch (NumberFormatException exception) {

      }
    }

    gioHangRepository.flush();
    // Không xóa giỏ guest trước khi MySQL commit hoặc xóa nhầm dòng vừa được pc-build cập nhật.
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            try {
              guestStore.removeUnchanged(guestCartId, redisItems);
            } catch (RuntimeException exception) {
              log.warn("Đã merge giỏ nhưng chưa dọn được Redis", exception);
            }
          }
        });

    return true;
  }

  public String getOrCreateGuestCartId(String guestCartId) {
    return guestStore.prepare(guestCartId, false);
  }

  private void mergeGuestItemIntoUserCart(
      NguoiDung nguoiDung, PhienBanSanPham phienBan, int guestQuantity) {

    GioHang gioHang =
        gioHangRepository
            .findByNguoiDungIdAndPhienBanId(nguoiDung.getId(), phienBan.getId())
            .orElseGet(
                () -> GioHang.builder().nguoiDung(nguoiDung).phienBan(phienBan).soLuong(0).build());

    int mergedQuantity = Math.min(99, gioHang.getSoLuong() + guestQuantity);

    gioHang.setSoLuong(mergedQuantity);
    gioHangRepository.save(gioHang);
  }

  private CartItemMutationResponse addUserItem(
      NguoiDung nguoiDung, PhienBanSanPham phienBan, Integer addedQuantity, int tonKhoKhaDung) {

    GioHang gioHang =
        gioHangRepository
            .findByNguoiDungIdAndPhienBanId(nguoiDung.getId(), phienBan.getId())
            .orElseGet(
                () -> GioHang.builder().nguoiDung(nguoiDung).phienBan(phienBan).soLuong(0).build());

    int newQuantity = gioHang.getSoLuong() + addedQuantity;

    validateQuantity(newQuantity, tonKhoKhaDung);

    gioHang.setSoLuong(newQuantity);

    GioHang savedItem = gioHangRepository.save(gioHang);

    CartResponse cartResponse = getUserCart(nguoiDung.getId());

    return buildMutationResponse(
        savedItem.getId(), phienBan, newQuantity, cartResponse, "Thêm sản phẩm vào giỏ thành công");
  }

  private CartItemMutationResponse addGuestItem(
      String guestCartId, PhienBanSanPham phienBan, Integer addedQuantity, int tonKhoKhaDung) {
    int newQuantity =
        guestStore.mutate(guestCartId, "ADD", phienBan.getId(), addedQuantity, tonKhoKhaDung);

    CartResponse cartResponse = getGuestCart(guestCartId);

    return buildMutationResponse(
        phienBan.getId(), phienBan, newQuantity, cartResponse, "Thêm sản phẩm vào giỏ thành công");
  }

  private CartItemMutationResponse updateUserItem(
      NguoiDung nguoiDung, Long cartItemId, Integer newQuantity) {

    GioHang gioHang =
        gioHangRepository
            .findByIdAndNguoiDungId(cartItemId, nguoiDung.getId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

    PhienBanSanPham phienBan = gioHang.getPhienBan();

    if (!isActiveVariant(phienBan)) {
      throw new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND);
    }

    int tonKhoKhaDung = calculateAvailableStock(phienBan);

    validateQuantity(newQuantity, tonKhoKhaDung);

    gioHang.setSoLuong(newQuantity);

    GioHang savedItem = gioHangRepository.save(gioHang);

    CartResponse cartResponse = getUserCart(nguoiDung.getId());

    return buildMutationResponse(
        savedItem.getId(), phienBan, newQuantity, cartResponse, "Cập nhật giỏ hàng thành công");
  }

  private CartItemMutationResponse updateGuestItem(
      String guestCartId, Long cartItemId, Integer newQuantity) {

    String redisKey = buildGuestCartKey(guestCartId);

    String redisField = String.valueOf(cartItemId);

    boolean itemExists =
        Boolean.TRUE.equals(redisTemplate.opsForHash().hasKey(redisKey, redisField));

    if (!itemExists) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }

    PhienBanSanPham phienBan =
        phienBanSanPhamRepository
            .findById(cartItemId)
            .filter(this::isActiveVariant)
            .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND));

    int tonKhoKhaDung = calculateAvailableStock(phienBan);

    validateQuantity(newQuantity, tonKhoKhaDung);

    guestStore.mutate(guestCartId, "SET", cartItemId, newQuantity, tonKhoKhaDung);

    CartResponse cartResponse = getGuestCart(guestCartId);

    return buildMutationResponse(
        cartItemId, phienBan, newQuantity, cartResponse, "Cập nhật giỏ hàng thành công");
  }

  private CartItemMutationResponse deleteUserItem(NguoiDung nguoiDung, Long cartItemId) {

    GioHang gioHang =
        gioHangRepository
            .findByIdAndNguoiDungId(cartItemId, nguoiDung.getId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));

    gioHangRepository.delete(gioHang);
    gioHangRepository.flush();

    CartResponse cartResponse = getUserCart(nguoiDung.getId());

    return buildCartSummaryMutationResponse(cartResponse, "Xóa sản phẩm khỏi giỏ thành công");
  }

  private CartItemMutationResponse deleteGuestItem(String guestCartId, Long cartItemId) {
    guestStore.mutate(guestCartId, "DEL", cartItemId, 0, 0);

    CartResponse cartResponse = getGuestCart(guestCartId);

    return buildCartSummaryMutationResponse(cartResponse, "Xóa sản phẩm khỏi giỏ thành công");
  }

  private void validateQuantity(int quantity, int tonKhoKhaDung) {

    if (quantity <= 0 || quantity > 99) {
      throw new AppException(ErrorCode.INVALID_CART_QUANTITY);
    }

    if (quantity > tonKhoKhaDung) {
      throw new AppException(ErrorCode.INSUFFICIENT_STOCK);
    }
  }

  private CartItemMutationResponse buildMutationResponse(
      Long cartItemId,
      PhienBanSanPham phienBan,
      Integer soLuong,
      CartResponse cartResponse,
      String message) {

    BigDecimal donGia = phienBan.getGiaBanLe();

    BigDecimal thanhTien = donGia.multiply(BigDecimal.valueOf(soLuong));

    CartItemMutationResponse.CartItemData data =
        CartItemMutationResponse.CartItemData.builder()
            .cartItemId(cartItemId)
            .phienBanId(phienBan.getId())
            .soLuong(soLuong)
            .donGia(donGia)
            .thanhTien(thanhTien)
            .build();

    CartItemMutationResponse.CartSummary cartSummary =
        CartItemMutationResponse.CartSummary.builder()
            .tongSoLuong(cartResponse.getTongSoLuong())
            .tamTinh(cartResponse.getTamTinh())
            .giamGia(cartResponse.getGiamGia())
            .tongTien(cartResponse.getTongTien())
            .build();

    return CartItemMutationResponse.builder()
        .status(200)
        .message(message)
        .data(data)
        .cartSummary(cartSummary)
        .build();
  }

  private CartItemMutationResponse buildCartSummaryMutationResponse(
      CartResponse cartResponse, String message) {

    CartItemMutationResponse.CartSummary cartSummary =
        CartItemMutationResponse.CartSummary.builder()
            .tongSoLuong(cartResponse.getTongSoLuong())
            .tamTinh(cartResponse.getTamTinh())
            .giamGia(cartResponse.getGiamGia())
            .tongTien(cartResponse.getTongTien())
            .build();

    return CartItemMutationResponse.builder()
        .status(200)
        .message(message)
        .cartSummary(cartSummary)
        .build();
  }

  private CartResponse getUserCart(Long nguoiDungId) {

    List<GioHang> gioHangItems =
        gioHangRepository.findByNguoiDungIdOrderByNgayCapNhatDesc(nguoiDungId);

    List<CartResponse.CartItemResponse> items =
        gioHangItems.stream().map(this::mapUserCartItem).toList();

    return buildCartResponse(items);
  }

  private CartResponse getGuestCart(String guestCartId) {

    if (!isValidGuestCartId(guestCartId)) {
      return buildCartResponse(List.of());
    }

    Map<Object, Object> redisItems =
        redisTemplate.opsForHash().entries(buildGuestCartKey(guestCartId));

    List<CartResponse.CartItemResponse> items = new ArrayList<>();

    for (Map.Entry<Object, Object> entry : redisItems.entrySet()) {

      try {

        Long phienBanId = Long.valueOf(entry.getKey().toString());

        Integer soLuong = Integer.valueOf(entry.getValue().toString());

        phienBanSanPhamRepository
            .findById(phienBanId)
            .ifPresent(phienBan -> items.add(mapCartItem(phienBanId, phienBan, soLuong)));

      } catch (NumberFormatException exception) {

      }
    }

    return buildCartResponse(items);
  }

  private CartResponse.CartItemResponse mapUserCartItem(GioHang gioHang) {

    return mapCartItem(gioHang.getId(), gioHang.getPhienBan(), gioHang.getSoLuong());
  }

  private CartResponse.CartItemResponse mapCartItem(
      Long cartItemId, PhienBanSanPham phienBan, Integer soLuong) {

    SanPham sanPham = phienBan.getSanPham();

    int tonKhoKhaDung = calculateAvailableStock(phienBan);

    boolean conHang = isActiveVariant(phienBan) && tonKhoKhaDung >= soLuong;

    BigDecimal donGia = phienBan.getGiaBanLe();

    BigDecimal thanhTien = donGia.multiply(BigDecimal.valueOf(soLuong));

    return CartResponse.CartItemResponse.builder()
        .cartItemId(cartItemId)
        .phienBanId(phienBan.getId())
        .tenSanPham(sanPham.getTenSanPham())
        .tenPhienBan(phienBan.getTenPhienBan())
        .anh(getMainImage(sanPham))
        .donGia(donGia)
        .soLuong(soLuong)
        .thanhTien(thanhTien)
        .tonKhoKhaDung(tonKhoKhaDung)
        .conHang(conHang)
        .build();
  }

  private int calculateAvailableStock(PhienBanSanPham phienBan) {

    if (phienBan.getDanhSachTonKho() == null) {
      return 0;
    }

    return phienBan.getDanhSachTonKho().stream()
        .mapToInt(tonKho -> tonKho.getTonCoTheBan() == null ? 0 : tonKho.getTonCoTheBan())
        .sum();
  }

  private boolean isActiveVariant(PhienBanSanPham phienBan) {

    return TrangThaiCoBanEnum.HOAT_DONG.equals(phienBan.getTrangThai())
        && TrangThaiCoBanEnum.HOAT_DONG.equals(phienBan.getSanPham().getTrangThai());
  }

  private String getMainImage(SanPham sanPham) {

    if (sanPham.getDanhSachAnhSanPham() == null) {
      return null;
    }

    return sanPham.getDanhSachAnhSanPham().stream()
        .filter(anh -> Boolean.TRUE.equals(anh.getLaAnhChinh()))
        .min(
            Comparator.comparing(
                AnhSanPham::getThuTuHienThi, Comparator.nullsLast(Integer::compareTo)))
        .map(AnhSanPham::getDuongDanAnh)
        .orElse(null);
  }

  private CartResponse buildCartResponse(List<CartResponse.CartItemResponse> items) {

    int tongSoLuong = items.stream().mapToInt(CartResponse.CartItemResponse::getSoLuong).sum();

    BigDecimal tamTinh =
        items.stream()
            .map(CartResponse.CartItemResponse::getThanhTien)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    BigDecimal giamGia = BigDecimal.ZERO;

    BigDecimal tongTien = tamTinh.subtract(giamGia);

    return CartResponse.builder()
        .items(items)
        .tongSoLuong(tongSoLuong)
        .tamTinh(tamTinh)
        .giamGia(giamGia)
        .tongTien(tongTien)
        .build();
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

  private String buildGuestCartKey(String guestCartId) {

    return GUEST_CART_KEY_PREFIX + guestCartId;
  }
}
