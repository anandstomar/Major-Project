FROM golang:1.20-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/anchor-service ./cmd/anchor-service

FROM scratch
COPY --from=build /bin/anchor-service /bin/anchor-service
EXPOSE 8080
ENTRYPOINT ["/bin/anchor-service"]
