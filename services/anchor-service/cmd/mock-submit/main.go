package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net"
	"os"
	"time"

	pb "github.com/yourorg/majorproject/services/anchor-service/proto" // must match proto go_package
	"google.golang.org/grpc"
)

// server implements anchorsvc.AnchorSubmitServiceServer
type server struct {
	pb.UnimplementedAnchorSubmitServiceServer
}

func (s *server) SubmitAnchor(ctx context.Context, req *pb.AnchorSubmitRequest) (*pb.AnchorSubmitResponse, error) {
	now := time.Now().UTC()
	// generate fake tx hash and block
	tx := fmt.Sprintf("0x%x", now.UnixNano()+int64(rand.Intn(10000)))
	block := uint64(100000 + rand.Uint64()%10000)

	// return hex merkle (without 0x) to match earlier AnchorProcessor expectations
	merkle := req.MerkleRoot
	if len(merkle) >= 2 && merkle[:2] == "0x" {
		merkle = merkle[2:]
	}

	resp := &pb.AnchorSubmitResponse{
		RequestId:   req.RequestId,
		MerkleRoot:  merkle,
		TxHash:      tx,
		BlockNumber: block,
		Status:      "success",
		SubmittedAt: now.Format(time.RFC3339),
	}
	log.Printf("MockSubmit: accepted request=%s merkle=%s -> tx=%s block=%d\n", req.RequestId, merkle, tx, block)
	return resp, nil
}

func main() {
	addr := os.Getenv("ANCHOR_SUBMITTER_ADDR")
	if addr == "" {
		addr = "0.0.0.0:50051"
	}
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	grpcServer := grpc.NewServer()
	pb.RegisterAnchorSubmitServiceServer(grpcServer, &server{})
	log.Printf("Mock gRPC submitter listening on %s\n", addr)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Serve error: %v", err)
	}
}
