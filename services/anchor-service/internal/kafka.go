package internal

import (
	"time"

	"github.com/segmentio/kafka-go"
)

// NewKafkaClients returns a reader (consumer) and writer (producer)
func NewKafkaClients(cfg *Config) (*kafka.Reader, *kafka.Writer, error) {
	// reader / consumer
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.KafkaBrokerList(),
		GroupID:  cfg.KafkaGroupID,
		Topic:    cfg.RequestTopic,
		MinBytes: 1e3,
		MaxBytes: 10e6,
	})

	// writer / producer -- write to completed topic
	w := &kafka.Writer{
		Addr:         kafka.TCP(cfg.KafkaBrokers),
		Topic:        cfg.CompletedTopic,
		Balancer:     &kafka.LeastBytes{},
		Async:        false,
		RequiredAcks: kafka.RequireAll,
		MaxAttempts:  5,
        WriteTimeout: 10 * time.Second,
        BatchTimeout: 1 * time.Second,

	}

	// optional warm-up (non-blocking)
	time.Sleep(50 * time.Millisecond)

	return r, w, nil
}
