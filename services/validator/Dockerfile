# FROM eclipse-temurin:17-jdk-focal
# ARG JAR_FILE=target/*.jar
# COPY ${JAR_FILE} app.jar
# ENTRYPOINT ["java","-jar","/app.jar"]

# --- Stage 1: Build the JAR ---
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
# Copy only the definition first (for better caching)
COPY pom.xml .
# Copy the source code
COPY src ./src
# Build the application inside Docker
RUN mvn clean package -DskipTests

# --- Stage 2: Create the Final Image ---
FROM eclipse-temurin:17-jdk-focal
WORKDIR /app
# Copy the built JAR from the 'builder' stage
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
