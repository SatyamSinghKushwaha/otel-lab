FROM maven:3.8.8-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/target/api-java-0.0.1-SNAPSHOT.jar ./app.jar
EXPOSE 3000
ENTRYPOINT ["java","-jar","/app/app.jar"]
