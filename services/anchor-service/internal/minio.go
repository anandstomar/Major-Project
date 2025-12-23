package internal

import (
    "bytes"
    "context"
    "io"
    "time"

    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
)

func NewMinioClient(cfg *Config) (*minio.Client, error) {
    opts := &minio.Options{
        Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
        Secure: cfg.MinioUseSSL,
    }
    endpoint := cfg.MinioEndpointWithPort()
    cli, err := minio.New(endpoint, opts)
    if err != nil {
        return nil, err
    }
    // ensure bucket exists or create
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    exists, err := cli.BucketExists(ctx, cfg.MinioBucket)
    if err != nil {
        return nil, err
    }
    if !exists {
        if err := cli.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{}); err != nil {
            return nil, err
        }
    }
    return cli, nil
}

// read object into bytes
func GetObjectAsBytes(cli *minio.Client, bucket, object string) ([]byte, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    obj, err := cli.GetObject(ctx, bucket, object, minio.GetObjectOptions{})
    if err != nil {
        return nil, err
    }
    defer obj.Close()
    data, err := io.ReadAll(obj)
    if err != nil {
        return nil, err
    }
    return data, nil
}

// put bytes
func PutObjectBytes(cli *minio.Client, bucket, object string, data []byte) error {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    _, err := cli.PutObject(ctx, bucket, object, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{})

    return err
}
