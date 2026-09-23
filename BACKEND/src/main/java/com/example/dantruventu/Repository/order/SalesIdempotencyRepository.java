package com.example.dantruventu.Repository.order;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SalesIdempotencyRepository {

  private final JdbcTemplate jdbcTemplate;

  public record Entry(Long actorId, String requestHash, String responseJson) {}

  public Entry acquire(String key, Long actorId, String hash) {

    jdbcTemplate.update(
        """
                INSERT INTO sales_idempotency (
                    request_key, actor_id, request_hash
                )
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE request_key = request_key
                """,
        key,
        actorId,
        hash);

    return jdbcTemplate.queryForObject(
        """
                SELECT actor_id, request_hash, response_json
                FROM sales_idempotency
                WHERE request_key = ?
                FOR UPDATE
                """,
        (rs, rowNum) ->
            new Entry(
                rs.getLong("actor_id"),
                rs.getString("request_hash"),
                rs.getString("response_json")),
        key);
  }

  public void complete(String key, String json) {

    int updated =
        jdbcTemplate.update(
            """
                        UPDATE sales_idempotency
                        SET response_json = ?
                        WHERE request_key = ?
                          AND response_json IS NULL
                        """,
            json,
            key);

    if (updated != 1) {
      throw new IllegalStateException("Không thể lưu kết quả xử lý đơn hàng");
    }
  }
}
