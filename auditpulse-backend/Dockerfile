# Stage 1: Build multi-module Maven project
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /workspace

# Copy POM files first for dependency caching
COPY pom.xml ./
COPY auditpulse-domain/pom.xml ./auditpulse-domain/
COPY auditpulse-application/pom.xml ./auditpulse-application/
COPY auditpulse-infrastructure/pom.xml ./auditpulse-infrastructure/
COPY auditpulse-boot/pom.xml ./auditpulse-boot/

# Copy sources
COPY auditpulse-domain/src ./auditpulse-domain/src
COPY auditpulse-application/src ./auditpulse-application/src
COPY auditpulse-infrastructure/src ./auditpulse-infrastructure/src
COPY auditpulse-boot/src ./auditpulse-boot/src

# Build packages
RUN mvn clean package -DskipTests

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S auditpulse && adduser -S auditpulse -G auditpulse
USER auditpulse

COPY --from=builder /workspace/auditpulse-boot/target/auditpulse-boot-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
