package internal

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"
    "go.opentelemetry.io/otel"
    "github.com/minio/minio-go/v7"
    "github.com/segmentio/kafka-go"
    pb "github.com/yourorg/majorproject/services/anchor-service/proto"
)

type AnchorRequest struct {
    RequestID    string   `json:"request_id"`
    MerkleRoot   string   `json:"merkle_root"`
    PreviewIDs   []string `json:"preview_ids"`
    Events       []string `json:"events"`
    EstimatedGas uint64   `json:"estimated_gas"`
    Status       string   `json:"status"`
    CreatedAt    string   `json:"created_at"`
    Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

type AnchorCompleted struct {
    RequestID   string `json:"request_id"`
    MerkleRoot  string `json:"merkle_root"`
    TxHash      string `json:"tx_hash"`
    BlockNumber uint64 `json:"block_number"`
    SubmittedAt string `json:"submitted_at"`
    Submitter   string `json:"submitter"`
    Status      string `json:"status"`
}

type Processor struct {
    cfg         *Config
    minioClient *minio.Client
    submitter   *SubmitterClient
    kafkaWriter *kafka.Writer
    log         *log.Logger
}

func NewProcessor(cfg *Config, minioClient *minio.Client, submitter *SubmitterClient, writer *kafka.Writer, logger *log.Logger) *Processor {
    return &Processor{
        cfg:         cfg,
        minioClient: minioClient,
        submitter:   submitter,
        kafkaWriter: writer,
        log:         logger,
    }
}

func (p *Processor) ProcessMessage(ctx context.Context, msg kafka.Message) error {
    // --- ADD THIS START ---
    startTime := time.Now()
    
    // Create a Span for Jaeger
    tracer := otel.Tracer("anchor-service")
    ctx, span := tracer.Start(ctx, "ProcessMessage")
    defer span.End()
    // --- ADD THIS END ---
    var req AnchorRequest
    if err := json.Unmarshal(msg.Value, &req); err != nil {
        p.log.Printf("bad anchors.request JSON: %v", err)
        return err
    }
    p.log.Printf("processing request %s", req.RequestID)

    merkle := req.MerkleRoot
    if merkle == "" {
        // fetch each preview from MinIO: previews/<preview_id>.json
        roots := []string{}
        for _, pid := range req.PreviewIDs {
            key := fmt.Sprintf("previews/%s.json", pid)
            b, err := GetObjectAsBytes(p.minioClient, p.cfg.MinioBucket, key)
            if err != nil {
                p.log.Printf("warning: failed to fetch preview %s: %v", pid, err)
                continue
            }
            var m struct {
                MerkleRoot string `json:"merkle_root"`
            }
            _ = json.Unmarshal(b, &m)
            if m.MerkleRoot != "" {
                roots = append(roots, m.MerkleRoot)
            }
        }
        if len(roots) == 0 {
            return fmt.Errorf("no preview roots available for request %s", req.RequestID)
        }
        cr, err := CombineRootsHex(roots)
        if err != nil {
            return err
        }
        merkle = "0x" + cr
        p.log.Printf("computed combined merkle root %s", merkle)
    }

    // call gRPC submitter
    grpcReq := &pb.AnchorSubmitRequest{
        RequestId:   req.RequestID,
        MerkleRoot:  merkle,
        PreviewIds:  req.PreviewIDs,
        Events:      req.Events,
        EstimatedGas: uint64(req.EstimatedGas),
        Submitter:   "", // optional: pick from metadata if present
    }
    if submitter, ok := req.Metadata["submitter"].(string); ok {
        grpcReq.Submitter = submitter
    }

    // call submitter
    resp, err := p.submitter.SubmitAnchor(ctx, grpcReq)
    if err != nil {
        p.log.Printf("submitter error: %v", err)
        // --- ADD THIS: Record Failure ---
        AnchorsProcessed.WithLabelValues("failed").Inc()
        // -------------------------
        // publish failed completed with status
        completed := AnchorCompleted{
            RequestID:  req.RequestID,
            MerkleRoot: merkle,
            TxHash:     "",
            BlockNumber: 0,
            SubmittedAt: time.Now().UTC().Format(time.RFC3339),
            Submitter:   grpcReq.Submitter,
            Status:      "failed",
        }
        _ = p.persistCompleted(req.RequestID, completed)
        p.publishCompleted(completed)
        return err
    }

    completed := AnchorCompleted{
        RequestID:   resp.RequestId,
        MerkleRoot:  "0x" + resp.MerkleRoot, // ensure hex formatting
        TxHash:      resp.TxHash,
        BlockNumber: resp.BlockNumber,
        SubmittedAt: resp.SubmittedAt,
        Submitter:   grpcReq.Submitter,
        Status:      resp.Status,
    }

    // persist and publish
    if err := p.persistCompleted(req.RequestID, completed); err != nil {
        p.log.Printf("persist completed err: %v", err)
    }
    if err := p.publishCompleted(completed); err != nil {
        p.log.Printf("publish completed err: %v", err)
    }

    AnchorsProcessed.WithLabelValues("success").Inc()
    AnchorSubmitLatency.Observe(time.Since(startTime).Seconds())

    return nil
}

func (p *Processor) persistCompleted(requestID string, completed AnchorCompleted) error {
    key := fmt.Sprintf("completed/%s.json", requestID)
    b, _ := json.MarshalIndent(completed, "", "  ")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    _, err := p.minioClient.PutObject(ctx, p.cfg.MinioBucket, key, bytes.NewReader(b), int64(len(b)), minio.PutObjectOptions{ContentType: "application/json"})
    return err
}

func (p *Processor) publishCompleted(completed AnchorCompleted) error {
    b, _ := json.Marshal(completed)
    msg := kafka.Message{
        Key:   []byte(completed.RequestID),
        Value: b,
    }
    // produce synchronously
    return p.kafkaWriter.WriteMessages(context.Background(), msg)
}
