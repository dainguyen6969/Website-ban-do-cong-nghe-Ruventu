package com.example.dantruventu.Services.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.dantruventu.Entity.ChiTietDonHang;
import com.example.dantruventu.Entity.ChiTietTraHang;
import com.example.dantruventu.Entity.PhieuTraHang;
import com.example.dantruventu.Error.AppException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class AdminReturnMergeCompatibilityTest {

  private final ObjectMapper json = new ObjectMapper();
  private final ReturnMoneySnapshotService snapshots = new ReturnMoneySnapshotService(null, json);
  private final OffsetDateTime receivedAt = OffsetDateTime.parse("2026-10-21T11:00:00+07:00");

  @Test
  void finalVndRemainderSurvivesTheSharedReceiptWriter() {
    var line = line(3, "33333", "33334");
    var slip = slip("33334", policy("100000", 2, "66666"));
    Map<String, Object> before = ReturnSnapshotJson.decode(slip.getDuLieuNhanHang());

    var received = receive(slip, line);

    assertTrue(received.containsKey("nhan_hang"));
    assertEquals(
        before.get("kiem_tra_chinh_sach_khi_lap"), received.get("kiem_tra_chinh_sach_khi_lap"));
    assertFalse(received.containsKey("phan_bo_tien"));
    assertEquals(before, ReturnSnapshotJson.decode(slip.getDuLieuNhanHang()));
  }

  @Test
  void paidAndZeroRefundCreationEvidenceBothRemainReceivable() {
    assertTrue(
        receive(slip("1045000", policy("2090000", 0, "0")), line(2, "1045000", "1045000"))
            .containsKey("nhan_hang"));
    assertTrue(receive(slip("0", policy("0", 0, "0")), line(1, "0", "0")).containsKey("nhan_hang"));
  }

  @Test
  void aChangedSavedRefundIsRejectedBeforeReceipt() {
    var error =
        assertThrows(
            AppException.class,
            () -> receive(slip("33335", policy("100000", 2, "66666")), line(3, "33333", "33335")));
    assertEquals("RETURN_FINANCIAL_HISTORY_UNVERIFIED", error.getCode());
  }

  @Test
  void aChangedRequestedQuantityIsRejected() {
    var policy = policy("2090000", 0, "0");
    policy.put("so_luong_yeu_cau", 2);
    var error =
        assertThrows(
            AppException.class,
            () -> receive(slip("1045000", policy), line(2, "1045000", "1045000")));
    assertEquals("RETURN_FINANCIAL_HISTORY_UNVERIFIED", error.getCode());
  }

  @Test
  void theExistingMainTestAllocationFormatRemainsSupported() {
    Map<String, Object> stored =
        Map.of(
            "phien_ban_phan_bo_tien",
            1,
            "phan_bo_tien",
            List.of(
                Map.of(
                    "chi_tiet_don_hang_id", 2001,
                    "so_luong", 1,
                    "gia_tri_truoc_vat", 950000,
                    "tien_vat", 95000,
                    "gia_tri_sau_vat", 1045000)));
    var received = receive(slipWithSnapshot("1045000", stored), line(2, "1045000", "1045000"));
    assertTrue(received.containsKey("phan_bo_tien"));
    assertTrue(received.containsKey("nhan_hang"));
  }

  @Test
  void stringEntityJsonStillProducesAnObjectForTheApi() {
    Map<String, Object> sold = Map.of("schema_version", 1, "so_luong_bo", 1);
    assertEquals(sold, ReturnSnapshotJson.decode(ReturnSnapshotJson.encode(sold)));
    assertThrows(AppException.class, () -> ReturnSnapshotJson.decode("[]"));
  }

  private Map<String, Object> receive(PhieuTraHang slip, ChiTietTraHang line) {
    return ReturnSnapshotJson.decode(
        snapshots.receivedSnapshot(slip, List.of(line), receivedAt, 7L, List.of()));
  }

  private PhieuTraHang slip(String total, Map<String, Object> detail) {
    return slipWithSnapshot(
        total,
        Map.of(
            "kiem_tra_chinh_sach_khi_lap",
            Map.of("du_dieu_kien", true, "chi_tiet", List.of(detail))));
  }

  private PhieuTraHang slipWithSnapshot(String total, Map<String, Object> data) {
    return PhieuTraHang.builder()
        .tongTienHoan(new BigDecimal(total))
        .duLieuNhanHang(ReturnSnapshotJson.encode(data))
        .build();
  }

  private Map<String, Object> policy(String payment, int previousQuantity, String previousAmount) {
    Map<String, Object> detail = new LinkedHashMap<>();
    detail.put("chi_tiet_don_hang_id", 2001L);
    detail.put("so_luong_yeu_cau", 1);
    detail.put("thanh_toan_dong", new BigDecimal(payment));
    detail.put("so_luong_da_yeu_cau_tra", previousQuantity);
    detail.put("tien_da_yeu_cau_tra", new BigDecimal(previousAmount));
    return detail;
  }

  private ChiTietTraHang line(int purchased, String unitRefund, String lineRefund) {
    return ChiTietTraHang.builder()
        .chiTietDonHang(ChiTietDonHang.builder().id(2001L).soLuong(purchased).build())
        .soLuong(1)
        .donGiaHoan(new BigDecimal(unitRefund))
        .thanhTienHoan(new BigDecimal(lineRefund))
        .build();
  }
}
