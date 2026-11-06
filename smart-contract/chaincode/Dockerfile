# syntax=docker/dockerfile:1
# Builds fund_cc and runs its unit tests (mvn package), then packages it as a chaincode-as-a-service image.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B package

FROM eclipse-temurin:21-jre
COPY --from=build /src/target/fund-cc.jar /opt/fund-cc.jar
USER 1000
# ContractRouter serves on CHAINCODE_SERVER_ADDRESS (set by compose) instead of dialling the peer.
ENTRYPOINT ["java", "-Xmx256m", "-jar", "/opt/fund-cc.jar"]
