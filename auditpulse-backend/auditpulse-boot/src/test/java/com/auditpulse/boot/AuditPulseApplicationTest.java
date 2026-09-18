package com.auditpulse.boot;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(classes = AuditPulseApplication.class)
@TestPropertySource(properties = {
        "coinbase.websocket.auto-start=false"
})
class AuditPulseApplicationTest {

    @Test
    @DisplayName("Spring Boot context should load cleanly with all beans wired")
    void contextLoads() {
    }
}
