package com.example.dantruventu.Entity.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales_idempotency")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesIdempotency {

    @Id
    @Column(name = "request_key", length = 50, nullable = false)
    private String requestKey;

    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "request_hash", length = 64)
    private String requestHash;

    @Column(name = "response_json", columnDefinition = "TEXT")
    private String responseJson;

    @Column(name = "created_at", insertable = false, updatable = false, columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;
}
