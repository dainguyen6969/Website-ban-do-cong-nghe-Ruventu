-- Required by SalesIdempotencyRepository; apply manually to the local database.
-- Does not change existing orders or other tables.
CREATE TABLE IF NOT EXISTS sales_idempotency (
    request_key VARCHAR(50) NOT NULL PRIMARY KEY,
    actor_id BIGINT NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_json LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
