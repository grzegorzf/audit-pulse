package com.auditpulse.boot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.auditpulse")
public class AuditPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuditPulseApplication.class, args);
    }
}
