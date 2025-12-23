package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/joho/godotenv"

    "github.com/yourorg/majorproject/services/anchor-service/internal"
)

func main() {
    // load .env if present
    _ = godotenv.Load()

    logger := log.New(os.Stdout, "", log.LstdFlags|log.Lshortfile)

    cfg := internal.NewConfigFromEnv()

    // init clients
    kafkaReader, kafkaWriter, err := internal.NewKafkaClients(cfg)
    if err != nil {
        logger.Fatalf("kafka clients: %v", err)
    }
    defer kafkaReader.Close()
    defer kafkaWriter.Close()

    minioClient, err := internal.NewMinioClient(cfg)
    if err != nil {
        logger.Fatalf("minio init: %v", err)
    }

    grpcClient, err := internal.NewGRPCSubmitterClient(cfg)
    if err != nil {
        logger.Fatalf("grpc client: %v", err)
    }
    defer grpcClient.Close()

    processor := internal.NewProcessor(cfg, minioClient, grpcClient, kafkaWriter, logger)

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // start consuming anchors.request
    go func() {
        if err := internal.ConsumeRequests(ctx, kafkaReader, processor, logger); err != nil {
            logger.Fatalf("consume error: %v", err)
        }
    }()

    // graceful shutdown
    ch := make(chan os.Signal, 1)
    signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
    <-ch
    logger.Println("shutdown requested, waiting 3s...")
    time.Sleep(3 * time.Second)
    cancel()
    logger.Println("exited")
}
