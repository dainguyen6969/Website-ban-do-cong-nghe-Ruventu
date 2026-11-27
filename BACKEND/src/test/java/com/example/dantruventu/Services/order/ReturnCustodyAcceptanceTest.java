package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.*;

import com.example.dantruventu.DTO.Request.order.AdminReturnReceiveRequest;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Enum.TrangThaiSerial;
import com.example.dantruventu.Error.AppException;
import java.time.OffsetDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ReturnCustodyAcceptanceTest {

  @Test
  void aMatchingVerifiedIntakeCanProceedWithoutMutatingCustody() {
    var slip = slip(List.of(held()));
    String before = slip.getDuLieuNhanHang();
    assertDoesNotThrow(() -> ReturnCustodyAcceptance.verify(slip, request()));
    assertEquals(before, slip.getDuLieuNhanHang());
  }

  @Test
  void existingDirectReceiptWithoutAnInspectionRemainsSupported() {
    assertDoesNotThrow(() -> ReturnCustodyAcceptance.verify(new PhieuTraHang(), request()));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"unknown-device", "wrong-variant", "wrong-serial", "missing-item", "extra-item"})
  void unresolvedOrUnmatchedCustodyCannotBeSilentlyClearedByReceive(String variant) {
    var held = held();
    List<Map<String, Object>> items = new ArrayList<>();
    items.add(held);
    switch (variant) {
      case "unknown-device" -> held.put("thiet_bi_id", null);
      case "wrong-variant" -> held.put("phien_ban_id", 999);
      case "wrong-serial" -> held.put("so_serial_id", 999);
      case "missing-item" -> items.clear();
      case "extra-item" -> {
        var extra = new LinkedHashMap<>(held);
        extra.put("ma_muc_nhan", "HN-2");
        extra.put("thiet_bi_id", 802);
        extra.put("so_serial_id", 502);
        items.add(extra);
      }
    }
    var slip = slip(items);
    String before = slip.getDuLieuNhanHang();
    assertThrows(AppException.class, () -> ReturnCustodyAcceptance.verify(slip, request()));
    assertEquals(before, slip.getDuLieuNhanHang());
  }

  @Test
  void aLaterParcelCannotBeAcceptedBeforeItWasActuallyReceived() {
    var held = held();
    held.put("ngay_tiep_nhan_thuc_te", "2026-10-12T13:00:00+07:00");
    assertThrows(
        AppException.class, () -> ReturnCustodyAcceptance.verify(slip(List.of(held)), request()));
  }

  @Test
  void nonSerialIdentityAlsoRequiresTheWholeCustodyQuantity() {
    var held = held();
    held.remove("so_serial_id");
    var input = request();
    input.getHangNhan().getFirst().setSerials(List.of());
    assertDoesNotThrow(() -> ReturnCustodyAcceptance.verify(slip(List.of(held)), input));
    input.getHangNhan().getFirst().setSoLuongNguyenVen(2);
    assertThrows(
        AppException.class, () -> ReturnCustodyAcceptance.verify(slip(List.of(held)), input));
  }

  private PhieuTraHang slip(List<?> items) {
    return PhieuTraHang.builder()
        .duLieuNhanHang(
            ReturnSnapshotJson.encode(Map.of("dang_giu_hang", true, "hang_dang_giu", items)))
        .build();
  }

  private Map<String, Object> held() {
    return new LinkedHashMap<>(
        Map.of(
            "ma_muc_nhan",
            "HN-1",
            "thiet_bi_id",
            801,
            "chi_tiet_don_hang_id",
            2001,
            "phien_ban_id",
            101,
            "so_serial_id",
            501,
            "so_luong",
            1,
            "ngay_tiep_nhan_thuc_te",
            "2026-10-12T11:30:00+07:00"));
  }

  private AdminReturnReceiveRequest request() {
    var input = new AdminReturnReceiveRequest();
    input.setNgayNhanHang(OffsetDateTime.parse("2026-10-12T12:00:00+07:00"));
    var item = new AdminReturnReceiveRequest.Item();
    item.setChiTietDonHangId(2001L);
    item.setPhienBanId(101L);
    item.setKhoHangId(1L);
    item.setSoLuongNguyenVen(1);
    item.setSoLuongLoi(0);
    var serial = new AdminReturnReceiveRequest.SerialItem();
    serial.setSoSerialId(501L);
    serial.setTrangThaiSauNhan(TrangThaiSerial.TRONG_KHO);
    item.setSerials(List.of(serial));
    input.setHangNhan(List.of(item));
    return input;
  }
}
