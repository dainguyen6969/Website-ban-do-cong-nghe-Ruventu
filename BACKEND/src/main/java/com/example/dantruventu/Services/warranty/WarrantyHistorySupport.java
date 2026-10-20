package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.Entity.LichSuBaoHanh;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Reads only saved event sections; never generates a past event from the current ticket state. */
@Component
@RequiredArgsConstructor
public class WarrantyHistorySupport {
  private final ObjectMapper objectMapper;

  /*
   * Approved history JSON contract: root sections match the API names (yeu_cau_tiep_nhan,
   * thiet_bi, thiet_bi_hien_hanh, tiep_nhan, ket_luan, bao_gia, noi_dang_giu, noi_dang_giu_thiet_bi_cu,
   * phuong_an_doi, doi_soat_nha_cung_cap, giao_nhan, trang_thai, san_sang_tra).
   * Each section is an object snapshot; san_sang_tra=null explicitly clears readiness.
   * Persisted giao_nhan.sai_lech entries have id/da_xu_ly; trang_thai.sai_lech_da_xu_ly
   * references existing discrepancy ids only, never replaces the original evidence.
   * Missing section means unknown/not recorded, NOT a default factual claim.
   * A pre-ticket YEU_CAU_TIEP_NHAN event id is the intake-request id; later snapshots
   * reference it with root yeu_cau_tiep_nhan_id. No writer or new table is created by GET.
   */
  public Map<String, Object> payload(LichSuBaoHanh event) {
    if (event.getDuLieuChiTiet() == null || event.getDuLieuChiTiet().isBlank()) return Map.of();
    try {
      Map<String, Object> data =
          object(objectMapper.readValue(event.getDuLieuChiTiet(), Object.class));
      if (data == null) throw invalid();
      return data;
    } catch (AppException failure) {
      throw failure;
    } catch (RuntimeException failure) {
      throw new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
    }
  }

  public Map<String, Object> object(Object value) {
    if (value == null) return null;
    if (!(value instanceof Map<?, ?> source)) throw invalid();
    Map<String, Object> result = new LinkedHashMap<>();
    for (var entry : source.entrySet()) {
      if (!(entry.getKey() instanceof String key)) throw invalid();
      result.put(key, entry.getValue());
    }
    return result;
  }

  @SuppressWarnings("unchecked")
  public List<Object> array(Object value) {
    if (value == null) return List.of();
    if (!(value instanceof List<?> list)) throw invalid();
    return (List<Object>) list;
  }

  public String text(Object value) {
    if (value == null) return null;
    if (!(value instanceof String text)) throw invalid();
    return text;
  }

  public Long id(Object value) {
    if (value == null) return null;
    try {
      if (!(value instanceof Number) && !(value instanceof String)) throw invalid();
      long result = new BigDecimal(value.toString()).longValueExact();
      if (result <= 0) throw invalid();
      return result;
    } catch (ArithmeticException | NumberFormatException failure) {
      throw invalid();
    }
  }

  public OffsetDateTime time(Object value) {
    if (value == null) return null;
    String text = text(value);
    try {
      return OffsetDateTime.parse(text)
          .atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
          .toOffsetDateTime();
    } catch (DateTimeException missingOffset) {
      try {
        return WarrantyReadValidation.time(LocalDateTime.parse(text));
      } catch (DateTimeException invalidTime) {
        throw invalid();
      }
    }
  }

  public Map<String, Object> latestSection(
      List<LichSuBaoHanh> chronologicalEvents, String section) {
    Map<String, Object> latest = null;
    for (var event : chronologicalEvents) {
      Map<String, Object> data = payload(event);
      if (data.containsKey(section)) latest = object(data.get(section));
    }
    return latest;
  }

  private AppException invalid() {
    return new AppException(ErrorCode.INVALID_WARRANTY_HISTORY);
  }
}
