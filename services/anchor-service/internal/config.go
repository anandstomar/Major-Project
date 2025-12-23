package internal

import (
    "fmt"
    "os"
    "strconv"
)

type Config struct {
    KafkaBrokers        string
    RequestTopic        string
    CompletedTopic      string
    KafkaGroupID        string
    MinioEndpoint       string
    MinioPort           int
    MinioUseSSL         bool
    MinioAccessKey      string
    MinioSecretKey      string
    MinioBucket         string
    AnchorSubmitterAddr string
}

func NewConfigFromEnv() *Config {
    port, _ := strconv.Atoi(getenv("MINIO_PORT", "9000"))
    useSSL := getenv("MINIO_USE_SSL", "false") == "true"

    return &Config{
        KafkaBrokers:        getenv("KAFKA_BROKERS", "localhost:9092"),
        RequestTopic:        getenv("ANCHORS_REQUEST_TOPIC", "anchors.request"),
        CompletedTopic:      getenv("ANCHORS_COMPLETED_TOPIC", "anchors.completed"),
        KafkaGroupID:        getenv("KAFKA_GROUP_ID", "anchor-service-group"),
        MinioEndpoint:       getenv("MINIO_ENDPOINT", "localhost"),
        MinioPort:           port,
        MinioUseSSL:         useSSL,
        MinioAccessKey:      getenv("MINIO_ACCESS_KEY", "minioadmin"),
        MinioSecretKey:      getenv("MINIO_SECRET_KEY", "minioadmin"),
        MinioBucket:         getenv("MINIO_BUCKET", "ingest"),
        AnchorSubmitterAddr: getenv("ANCHOR_SUBMITTER_ADDR", "localhost:50051"),
    }
}

func getenv(key, d string) string {
    v := os.Getenv(key)
    if v == "" {
        return d
    }
    return v
}

func (c *Config) KafkaBrokerList() []string {
    return []string{c.KafkaBrokers}
}

func (c *Config) MinioEndpointWithPort() string {
    return fmt.Sprintf("%s:%d", c.MinioEndpoint, c.MinioPort)
}
