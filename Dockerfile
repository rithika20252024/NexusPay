# Stage 1: Build Java 17 Spring Boot Artifact
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY backend-java/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend-java/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Production OpenShift / Container Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root user (OpenShift compliance)
USER 1001

COPY --from=builder /app/target/nexuspay-enterprise-1.0.0.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
