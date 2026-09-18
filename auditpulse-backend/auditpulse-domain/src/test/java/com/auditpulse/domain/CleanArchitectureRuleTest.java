package com.auditpulse.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class CleanArchitectureRuleTest {

    @Test
    @DisplayName("Domain module must have ZERO dependencies on third-party frameworks or Spring")
    void domainHasZeroFrameworkDependencies() throws IOException {
        Path domainSourcePath = Paths.get("src/main/java");
        if (!Files.exists(domainSourcePath)) {
            // Fallback for multi-module maven execution root
            domainSourcePath = Paths.get("auditpulse-domain/src/main/java");
        }

        assertThat(domainSourcePath).exists();

        try (Stream<Path> stream = Files.walk(domainSourcePath)) {
            List<Path> javaFiles = stream.filter(p -> p.toString().endsWith(".java")).toList();
            assertThat(javaFiles).isNotEmpty();

            for (Path javaFile : javaFiles) {
                List<String> lines = Files.readAllLines(javaFile);
                for (String line : lines) {
                    String trimmed = line.trim();
                    if (trimmed.startsWith("import ")) {
                        assertThat(trimmed)
                                .withFailMessage("Domain file %s violates Clean Architecture by importing %s", javaFile, trimmed)
                                .matches("^import (java\\..*|com\\.auditpulse\\.domain\\..*);$");
                    }
                }
            }
        }
    }
}
