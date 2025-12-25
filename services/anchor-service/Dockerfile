# Change from 1.20-alpine to 1.24-alpine
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/anchor-service ./cmd/anchor-service

FROM alpine:latest
COPY --from=build /bin/anchor-service /bin/anchor-service
# Ensure you expose the ports for metrics and the service
EXPOSE 8081 2112 
ENTRYPOINT ["/bin/anchor-service"]