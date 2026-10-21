package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;

/**
 * Common fields plus only the payload appropriate to the selected event, including explicit nulls.
 */
@JsonInclude(value = JsonInclude.Include.ALWAYS, content = JsonInclude.Include.ALWAYS)
public class AdminWarrantyEventResponse extends LinkedHashMap<String, Object> {}
