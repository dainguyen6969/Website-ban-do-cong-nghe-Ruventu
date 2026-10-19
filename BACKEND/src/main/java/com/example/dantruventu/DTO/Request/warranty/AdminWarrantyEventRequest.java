package com.example.dantruventu.DTO.Request.warranty;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** Each event has its own strict field allowlist, validated before acquiring idempotency. */
public class AdminWarrantyEventRequest {
  private final Map<String, Object> fields = new LinkedHashMap<>();

  @JsonAnySetter
  public void put(String field, Object value) {
    fields.put(field, value);
  }

  public Map<String, Object> fields() {
    return Collections.unmodifiableMap(fields);
  }
}
