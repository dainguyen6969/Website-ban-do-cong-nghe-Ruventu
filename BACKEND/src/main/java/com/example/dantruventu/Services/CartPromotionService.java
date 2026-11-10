package com.example.dantruventu.Services;

import static com.example.dantruventu.Services.order.sales.SalesSupport.*;

import com.example.dantruventu.DTO.Request.ApplyCartPromotionRequest;
import com.example.dantruventu.DTO.Request.order.AdminSalesRequest;
import com.example.dantruventu.DTO.Response.CartItemMutationResponse;
import com.example.dantruventu.DTO.Response.CartPromotionResponse;
import com.example.dantruventu.DTO.Response.CartResponse;
import com.example.dantruventu.DTO.Response.order.SalePreviewData;
import com.example.dantruventu.Entity.NguoiDung;
import com.example.dantruventu.Enum.LoaiDonHang;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Services.order.sales.SalesCalculationService;
import com.example.dantruventu.Services.order.sales.SalesContext;
import com.example.dantruventu.Services.order.sales.SalesQuoteService;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartPromotionService {

  private final CartService cartService;
  private final StringRedisTemplate redisTemplate;
  private final SalesCalculationService calculation;
  private final SalesContext context;
  private final SalesQuoteService saleQuotes;

  @Value("${cart.guest-expiration}")
  private long cartExpiration;

  public String selectedCode(NguoiDung user, String guestCartId) {
    String key = promotionKey(user, guestCartId);
    return key == null ? null : text(redisTemplate.opsForValue().get(key));
  }

  public void requireSelectedPromotion(NguoiDung user, String guestCartId, String requestedCode) {

    String selected = selectedCode(user, guestCartId);
    String requested = text(requestedCode);

    if (selected != null && (requested == null || !selected.equalsIgnoreCase(requested))) {
      throw conflict(
          "Giỏ hàng đang chọn mã "
              + selected
              + ". Hãy thay đổi hoặc bỏ mã trong giỏ rồi xác nhận lại.");
    }
  }

  public CartPromotionResponse applyPromotion(
      NguoiDung user, String guestCartId, ApplyCartPromotionRequest request) {

    CartResponse cart = cartService.getCurrentCart(user, guestCartId);

    if (cart.getItems() == null || cart.getItems().isEmpty()) {
      throw invalid("Giỏ hàng đang trống");
    }

    String code = text(request.getMaChuongTrinh());

    if (code == null) {
      throw invalid("Thiếu mã chương trình");
    }

    var input = buildRequest(user, cart, code);
    var plan = calculation.calculate(input, LoaiDonHang.ONLINE, false);

    String actualCode = plan.promotion().getMaChuongTrinh();
    String key = requirePromotionKey(user, guestCartId);

    redisTemplate.opsForValue().set(key, actualCode, Duration.ofMillis(cartExpiration));

    complete(user, guestCartId, cart, input, plan);

    return promotionResponse(cart, actualCode, "Áp dụng khuyến mại thành công");
  }

  public CartPromotionResponse removePromotion(NguoiDung user, String guestCartId) {

    String key = requirePromotionKey(user, guestCartId);

    if (text(redisTemplate.opsForValue().get(key)) == null) {
      throw notFound("Không có mã khuyến mại đang áp dụng");
    }

    redisTemplate.delete(key);

    CartResponse cart =
        applyStoredPromotion(user, guestCartId, cartService.getCurrentCart(user, guestCartId));

    return promotionResponse(cart, null, "Đã xóa mã khuyến mại");
  }

  public CartResponse applyStoredPromotion(
      NguoiDung user, String guestCartId, CartResponse response) {

    if (response == null) return null;

    clearConfirmation(response);

    String code = selectedCode(user, guestCartId);
    boolean empty = response.getItems() == null || response.getItems().isEmpty();

    if (empty) {
      response.setTamTinh(BigDecimal.ZERO);
      response.setGiamGia(BigDecimal.ZERO);
      response.setTongTien(BigDecimal.ZERO);
      response.setCoTheThanhToan(false);
      response.setTrangThaiKhuyenMai(code == null ? "CHUA_CHON" : "KHONG_CON_HOP_LE");

      if (code != null) {
        response.setKhuyenMai(Map.of("ma_chuong_trinh", code));
        response.setLyDoKhuyenMai(
            "Giỏ hàng đang trống. Mã đã chọn được giữ lại để kiểm tra khi thêm hàng.");
      }

      return response;
    }

    var input = buildRequest(user, response, code);

    try {
      var plan = calculation.calculate(input, LoaiDonHang.ONLINE, false);

      complete(user, guestCartId, response, input, plan);

    } catch (AppException exception) {
      if (!Set.of(ErrorCode.CONFLICT, ErrorCode.NOT_FOUND, ErrorCode.INVALID_DATA)
          .contains(exception.getErrorCode())) {
        throw exception;
      }

      // Giữ mã đã chọn và giữ các dòng mua.
      // Chưa có kết quả tài chính hợp lệ thì không khẳng định tổng phải trả.
      response.setTamTinh(grossSubtotal(response));
      response.setGiamGia(null);
      response.setTongTien(null);
      response.setCoTheThanhToan(false);
      response.setLyDoTinhGia(exception.getMessage());
      response.setTrangThaiKhuyenMai(code == null ? "CHUA_CHON" : "KHONG_CON_HOP_LE");

      if (code != null) {
        response.setKhuyenMai(Map.of("ma_chuong_trinh", code));
        response.setLyDoKhuyenMai(exception.getMessage());
      }
    }

    return response;
  }

  public CartItemMutationResponse applyStoredPromotion(
      NguoiDung user, String guestCartId, CartItemMutationResponse response) {

    if (response == null) return null;

    CartResponse priced =
        applyStoredPromotion(user, guestCartId, cartService.getCurrentCart(user, guestCartId));

    var summary = response.getCartSummary();

    if (summary == null) {
      summary = new CartItemMutationResponse.CartSummary();
      response.setCartSummary(summary);
    }

    summary.setTongSoLuong(priced.getTongSoLuong());
    summary.setTamTinh(priced.getTamTinh());
    summary.setGiamGia(priced.getGiamGia());
    summary.setTongTien(priced.getTongTien());

    BeanUtils.copyProperties(priced, summary, SalePreviewData.class);

    return response;
  }

  public void mergeGuestPromotion(NguoiDung user, String guestCartId) {

    if (user == null || !validGuest(guestCartId)) return;

    String guestKey = promotionKey(null, guestCartId);
    String code = text(redisTemplate.opsForValue().get(guestKey));

    if (code == null) return;

    // Giữ lựa chọn đang có của tài khoản.
    redisTemplate
        .opsForValue()
        .setIfAbsent(promotionKey(user, null), code, Duration.ofMillis(cartExpiration));

    redisTemplate.delete(guestKey);
  }

  private void complete(
      NguoiDung user,
      String guestCartId,
      CartResponse cart,
      AdminSalesRequest.Preview input,
      SalesCalculationService.Plan plan) {

    BigDecimal gross = grossSubtotal(cart);
    BigDecimal total = plan.data().getTongThanhToan();

    cart.setTamTinh(gross);
    cart.setGiamGia(gross.subtract(total));
    cart.setTongTien(total);

    saleQuotes.issue(
        cart, SalesQuoteService.identity(user, guestCartId), SalesQuoteService.CART, input, plan);
  }

  private BigDecimal grossSubtotal(CartResponse cart) {
    return cart.getItems().stream()
        .map(item -> money(item.getDonGia()).multiply(BigDecimal.valueOf(item.getSoLuong())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private AdminSalesRequest.Preview buildRequest(NguoiDung user, CartResponse cart, String code) {

    var tax = new AdminSalesRequest.Tax();
    tax.setApDung(true);
    tax.setCheDoGia("DA_BAO_GOM");

    var lines =
        cart.getItems().stream()
            .sorted(Comparator.comparing(CartResponse.CartItemResponse::getCartItemId))
            .map(
                item -> {
                  var line = new AdminSalesRequest.Line();
                  line.setMaDong("c" + item.getCartItemId());
                  line.setPhienBanId(item.getPhienBanId());
                  line.setSoLuong(item.getSoLuong());
                  return line;
                })
            .toList();

    var request = new AdminSalesRequest.Preview();
    request.setLoaiDonHang(LoaiDonHang.ONLINE);
    request.setKhachHangId(user == null ? null : user.getId());
    request.setKhoHangId(context.defaultWarehouseId());
    request.setBangGia("BAN_LE");
    request.setThue(tax);
    request.setMaChuongTrinh(code);
    request.setPhiGiaoHang(BigDecimal.ZERO);
    request.setSanPham(lines);

    return request;
  }

  private CartPromotionResponse promotionResponse(CartResponse cart, String code, String message) {

    var data =
        CartPromotionResponse.PromotionData.builder()
            .maChuongTrinh(code)
            .tamTinh(cart.getTamTinh())
            .giamGia(cart.getGiamGia())
            .tongTienMoi(cart.getTongTien())
            .build();

    BeanUtils.copyProperties(cart, data, SalePreviewData.class);

    return CartPromotionResponse.builder().status(200).message(message).data(data).build();
  }

  private void clearConfirmation(SalePreviewData response) {
    response.setMaXacNhanGia(null);
    response.setHetHanXacNhanGia(null);
    response.setDauVanTayGia(null);
    response.setKhuyenMai(null);
    response.setQuaTang(List.of());
    response.setLyDoKhuyenMai(null);
    response.setLyDoTinhGia(null);
    response.setCoTheThanhToan(false);
  }

  private String requirePromotionKey(NguoiDung user, String guestCartId) {

    String key = promotionKey(user, guestCartId);

    if (key == null) {
      throw invalid("Giỏ hàng khách không hợp lệ");
    }

    return key;
  }

  private String promotionKey(NguoiDung user, String guestCartId) {

    if (user != null) {
      return "cart:user:" + user.getId() + ":promotion";
    }

    return validGuest(guestCartId) ? "cart:guest:" + guestCartId + ":promotion" : null;
  }

  private boolean validGuest(String id) {
    try {
      return id != null && UUID.fromString(id).toString().equalsIgnoreCase(id);
    } catch (IllegalArgumentException exception) {
      return false;
    }
  }
}
