package internal

import (
    "context"
    "time"

    "google.golang.org/grpc"
    pb "github.com/yourorg/majorproject/services/anchor-service/proto"
)

type SubmitterClient struct {
    conn   *grpc.ClientConn
    client pb.AnchorSubmitServiceClient
}

func NewGRPCSubmitterClient(cfg *Config) (*SubmitterClient, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    conn, err := grpc.DialContext(ctx, cfg.AnchorSubmitterAddr, grpc.WithInsecure(), grpc.WithBlock())
    if err != nil {
        return nil, err
    }
    client := pb.NewAnchorSubmitServiceClient(conn)
    return &SubmitterClient{conn: conn, client: client}, nil
}

func (s *SubmitterClient) Close() error {
    return s.conn.Close()
}

func (s *SubmitterClient) SubmitAnchor(ctx context.Context, req *pb.AnchorSubmitRequest) (*pb.AnchorSubmitResponse, error) {
    // adapt context maybe add deadline
    ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
    defer cancel()
    return s.client.SubmitAnchor(ctx, req)
}
