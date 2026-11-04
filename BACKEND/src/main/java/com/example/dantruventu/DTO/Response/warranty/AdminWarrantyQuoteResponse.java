package com.example.dantruventu.DTO.Response.warranty;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;

/** Only the selected scenario's fields; null invoice, replacement and decision are explicit. */
@JsonInclude(value = JsonInclude.Include.ALWAYS, content = JsonInclude.Include.ALWAYS)
public class AdminWarrantyQuoteResponse extends LinkedHashMap<String, Object> {}
