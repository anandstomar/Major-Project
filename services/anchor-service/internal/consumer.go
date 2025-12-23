package internal

import (
    "context"
    "log"

    "github.com/segmentio/kafka-go"
)

func ConsumeRequests(ctx context.Context, reader *kafka.Reader, proc *Processor, logger *log.Logger) error {
    for {
        m, err := reader.FetchMessage(ctx)
        if err != nil {
            // if context canceled, exit cleanly
            return err
        }
        logger.Printf("kafka: got message at offset %d", m.Offset)
        if err := proc.ProcessMessage(ctx, m); err != nil {
            // do not commit offset, so that message may be retried
            logger.Printf("processing failed: %v", err)
            // Option: move to DLQ by writing to different topic
        } else {
            // commit offset
            if err := reader.CommitMessages(ctx, m); err != nil {
                logger.Printf("commit err: %v", err)
            }
        }
    }
}
