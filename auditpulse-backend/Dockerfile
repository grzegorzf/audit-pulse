# Stage 1: Build multi-module Maven project with Java 25
FROM eclipse-temurin:25-jdk AS builder
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
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

# Build packages with Java 25
RUN mvn clean package -DskipTests

# Stage 2: Runtime image (Java 25 JRE)
FROM eclipse-temurin:25-jre
WORKDIR /app

RUN useradd -m -s /bin/bash auditpulse
USER auditpulse

COPY --from=builder /workspace/auditpulse-boot/target/auditpulse-boot-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Dspring.classformat.ignore=true", "-jar", "app.jar"]
