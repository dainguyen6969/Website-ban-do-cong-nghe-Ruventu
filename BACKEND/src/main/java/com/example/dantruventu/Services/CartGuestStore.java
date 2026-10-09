package com.example.dantruventu.Services;

import com.example.dantruventu.DTO.Response.CartPcBuildResponse;
import com.example.dantruventu.Error.AppException;
import com.example.dantruventu.Error.ErrorCode;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Giữ nguyên hash cart:guest:<UUID>; không thêm trường hạng mục vào dữ liệu giỏ. */
@Component
@RequiredArgsConstructor
public class CartGuestStore {
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  @Value("${cart.guest-expiration}")
  private long expiration;

  private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);

  private static final DefaultRedisScript<List> BATCH =
      new DefaultRedisScript<>(
          """
      local function kind(key) return redis.call('TYPE', key).ok end
      if (kind(KEYS[1]) ~= 'none' and kind(KEYS[1]) ~= 'hash') or
         (kind(KEYS[2]) ~= 'none' and kind(KEYS[2]) ~= 'string') or
         (kind(KEYS[3]) ~= 'none' and kind(KEYS[3]) ~= 'string') then
        return {'ERROR'}
      end
      if redis.call('EXISTS', KEYS[1]) == 0 and redis.call('EXISTS', KEYS[2]) == 0 then
        return {'EXPIRED'}
      end
      local prior = redis.call('GET', KEYS[3])
      if prior then
        if string.sub(prior, 1, 65) ~= ARGV[1] .. '\\n' then return {'CONFLICT'} end
        return {'REPLAY', string.sub(prior, 66)}
      end
      local expected = cjson.decode(ARGV[5])
      local updates = cjson.decode(ARGV[6])
      local count = 0
      for field, value in pairs(expected) do
        count = count + 1
        if redis.call('HGET', KEYS[1], field) ~= value then return {'CHANGED'} end
      end
      if redis.call('HLEN', KEYS[1]) ~= count then return {'CHANGED'} end
      local pairsToWrite = {}
      for field, value in pairs(updates) do
        local quantity = tonumber(value)
        if not quantity or quantity < 1 or quantity > 99 or quantity ~= math.floor(quantity) then
          return {'ERROR'}
        end
        table.insert(pairsToWrite, field)
        table.insert(pairsToWrite, value)
      end
      if #pairsToWrite == 0 then return {'ERROR'} end
      -- Kiểm tra/giải mã xong toàn bộ trước khi ghi. Giỏ và kết quả chống lặp cùng một script.
      redis.call('HSET', KEYS[1], unpack(pairsToWrite))
      redis.call('PEXPIRE', KEYS[1], ARGV[3])
      redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
      redis.call('SET', KEYS[3], ARGV[1] .. '\\n' .. ARGV[2], 'PX', ARGV[4])
      return {'OK', ARGV[2]}
      """,
          List.class);

  private static final DefaultRedisScript<Long> SINGLE =
      new DefaultRedisScript<>(
          """
      local function kind(key) return redis.call('TYPE', key).ok end
      if (kind(KEYS[1]) ~= 'none' and kind(KEYS[1]) ~= 'hash') or
         (kind(KEYS[2]) ~= 'none' and kind(KEYS[2]) ~= 'string') then return -5 end
      if redis.call('EXISTS', KEYS[1]) == 0 and redis.call('EXISTS', KEYS[2]) == 0 then return -1 end
      local current = redis.call('HGET', KEYS[1], ARGV[2])
      if current and (not tonumber(current) or tonumber(current) < 1) then return -5 end
      if ARGV[1] ~= 'ADD' and not current then return -2 end
      local quantity = tonumber(ARGV[3])
      if ARGV[1] == 'ADD' then quantity = (tonumber(current) or 0) + quantity end
      if ARGV[1] ~= 'DEL' then
        if quantity < 1 or quantity > 99 or quantity ~= math.floor(quantity) then return -3 end
        if quantity > tonumber(ARGV[4]) then return -4 end
        redis.call('HSET', KEYS[1], ARGV[2], tostring(quantity))
      else
        redis.call('HDEL', KEYS[1], ARGV[2])
        quantity = 0
      end
      redis.call('PEXPIRE', KEYS[1], ARGV[5])
      redis.call('SET', KEYS[2], '1', 'PX', ARGV[5])
      return quantity
      """,
          Long.class);

  public String prepare(String cookie, boolean rejectExpired) {
    requireExpiration();
    if (cookie != null && !cookie.isBlank()) {
      try {
        String id = UUID.fromString(cookie).toString();
        if (!id.equalsIgnoreCase(cookie)) throw new IllegalArgumentException();
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cartKey(id)))
            || Boolean.TRUE.equals(redisTemplate.hasKey(sessionKey(id)))) return id;
      } catch (IllegalArgumentException exception) {
        if (rejectExpired)
          throw new AppException(ErrorCode.INVALID_CART_PC_BUILD, "Cookie giỏ khách không hợp lệ.");
      }
      if (rejectExpired) throw new AppException(ErrorCode.GUEST_CART_EXPIRED);
    }
    String id = UUID.randomUUID().toString();
    redisTemplate.opsForValue().set(sessionKey(id), "1", Duration.ofMillis(expiration));
    return id;
  }

  public Map<String, String> snapshot(String id) {
    Map<String, String> snapshot = new LinkedHashMap<>();
    redisTemplate
        .opsForHash()
        .entries(cartKey(id))
        .forEach((key, value) -> snapshot.put(key.toString(), value.toString()));
    return snapshot;
  }

  public CartPcBuildResponse replay(String id, String key, String hash) {
    String prior = redisTemplate.opsForValue().get(idempotencyKey(id, key));
    if (prior == null) return null;
    if (!prior.startsWith(hash + "\n"))
      throw new AppException(ErrorCode.CART_PC_BUILD_IDEMPOTENCY_CONFLICT);
    return objectMapper.readValue(prior.substring(65), CartPcBuildResponse.class);
  }

  public CartPcBuildResponse commit(
      String id,
      String key,
      String hash,
      Map<String, String> expected,
      CartPcBuildResponse result) {
    requireExpiration();
    Map<String, String> updates = new LinkedHashMap<>();
    result
        .items()
        .forEach(
            item -> updates.put(item.phienBanId().toString(), Integer.toString(item.soLuongSau())));
    List<?> outcome =
        redisTemplate.execute(
            BATCH,
            List.of(cartKey(id), sessionKey(id), idempotencyKey(id, key)),
            hash,
            objectMapper.writeValueAsString(result),
            Long.toString(expiration),
            Long.toString(IDEMPOTENCY_TTL.toMillis()),
            objectMapper.writeValueAsString(expected),
            objectMapper.writeValueAsString(updates));
    if (outcome == null || outcome.isEmpty())
      throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    return switch (outcome.getFirst().toString()) {
      case "OK", "REPLAY" ->
          objectMapper.readValue(outcome.get(1).toString(), CartPcBuildResponse.class);
      case "CONFLICT" -> throw new AppException(ErrorCode.CART_PC_BUILD_IDEMPOTENCY_CONFLICT);
      case "EXPIRED" -> throw new AppException(ErrorCode.GUEST_CART_EXPIRED);
      case "CHANGED" -> throw new AppException(ErrorCode.CART_CONCURRENT_CHANGE);
      default -> throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    };
  }

  public int mutate(String id, String mode, Long variantId, int quantity, int stock) {
    requireExpiration();
    Long result =
        redisTemplate.execute(
            SINGLE,
            List.of(cartKey(id), sessionKey(id)),
            mode,
            variantId.toString(),
            Integer.toString(quantity),
            Integer.toString(stock),
            Long.toString(expiration));
    if (result == null) throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    if (result == -1) throw new AppException(ErrorCode.GUEST_CART_EXPIRED);
    if (result == -2) throw new AppException(ErrorCode.NOT_FOUND);
    if (result == -3) throw new AppException(ErrorCode.INVALID_CART_QUANTITY);
    if (result == -4) throw new AppException(ErrorCode.INSUFFICIENT_STOCK);
    if (result == -5) throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
    return Math.toIntExact(result);
  }

  public void removeUnchanged(String id, Map<Object, Object> snapshot) {
    var script =
        new DefaultRedisScript<Long>(
            """
        for i = 1, #ARGV, 2 do
          if redis.call('HGET', KEYS[1], ARGV[i]) == ARGV[i + 1] then
            redis.call('HDEL', KEYS[1], ARGV[i])
          end
        end
        return 1
        """,
            Long.class);
    var args = new java.util.ArrayList<String>();
    snapshot.forEach(
        (key, value) -> {
          args.add(key.toString());
          args.add(value.toString());
        });
    redisTemplate.execute(script, List.of(cartKey(id)), args.toArray());
  }

  private String cartKey(String id) {
    return "cart:guest:" + id;
  }

  private void requireExpiration() {
    if (expiration <= 0) throw new AppException(ErrorCode.CART_PC_BUILD_FAILED);
  }

  private String sessionKey(String id) {
    return "cart:guest:" + id + ":session";
  }

  private String idempotencyKey(String id, String key) {
    return "cart:pc-build:guest:" + id + ":" + key;
  }
}
