package com.example.dantruventu.Services.warranty;

import com.example.dantruventu.DTO.Response.ApiResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import com.example.dantruventu.Error.WarrantyReadException;
import com.example.dantruventu.Repository.order.SalesIdempotencyRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;

/** Uses the existing sales_idempotency table in the same transaction as the mutation. */
@Component
@RequiredArgsConstructor
public class WarrantyMutationSupport {
  private final SalesIdempotencyRepository idempotency;
  private final ObjectMapper mapper;

  public record Replay<T>(String key, ApiResponse<T> previous) {}

  public <T> Replay<T> begin(
      String prefix,
      String key,
      Long actorId,
      String scope,
      Object input,
      Class<T> responseType,
      ErrorCode invalid) {
    if (actorId == null) throw new AppException(ErrorCode.UNAUTHORIZED);
    if (key == null || !key.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
      throw new AppException(invalid, "Idempotency-Key bắt buộc và phải là UUID.");
    String storageKey = prefix + key.toLowerCase(Locale.ROOT);
    if (storageKey.length() > 50) throw new IllegalStateException("Idempotency namespace too long");
    String canonical =
        mapper
            .writer()
            .with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .writeValueAsString(input);
    String hash = hash(actorId + ":" + scope + ":v1:" + canonical);
    var entry = idempotency.acquire(storageKey, actorId, hash);
    if (!Objects.equals(entry.actorId(), actorId) || !Objects.equals(entry.requestHash(), hash))
      throw WarrantyReadException.of(
          ErrorCode.WARRANTY_IDEMPOTENCY_KEY_REUSED,
          "headers.Idempotency-Key",
          "IDEMPOTENCY_KEY_REUSED");
    ApiResponse<T> prior =
        entry.responseJson() == null
            ? null
            : mapper
                .readerFor(
                    mapper
                        .getTypeFactory()
                        .constructParametricType(ApiResponse.class, responseType))
                .without(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
                .with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .readValue(entry.responseJson());
    return new Replay<>(storageKey, prior);
  }

  public <T> ApiResponse<T> complete(Replay<T> replay, int status, String message, T data) {
    var response = ApiResponse.<T>builder().status(status).message(message).data(data).build();
    idempotency.complete(replay.key(), mapper.writeValueAsString(response));
    return response;
  }

  private String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException(impossible);
    }
  }
}
