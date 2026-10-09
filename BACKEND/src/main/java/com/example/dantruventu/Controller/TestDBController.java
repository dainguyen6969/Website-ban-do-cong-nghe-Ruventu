package com.example.dantruventu.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.List;

@RestController
public class TestDBController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/test-idempotency")
    public List<Map<String, Object>> testDB() {
        return jdbcTemplate.queryForList("SELECT * FROM sales_idempotency");
    }
}
