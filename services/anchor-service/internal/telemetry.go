package internal

import (
	"context"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

var (
	// Metrics sensors
	AnchorsProcessed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "anchors_processed_total",
			Help: "Total anchor requests processed",
		},
		[]string{"status"},
	)

	AnchorSubmitLatency = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "anchor_submit_latency_seconds",
			Help:    "Anchor submission latency (seconds)",
			Buckets: prometheus.DefBuckets,
		},
	)
)

func init() {
	// Automatically register metrics on startup
	prometheus.MustRegister(AnchorsProcessed, AnchorSubmitLatency)
}

// StartMetricsServer starts the /metrics endpoint for Prometheus to scrape
func StartMetricsServer(addr string) {
	http.Handle("/metrics", promhttp.Handler())
	go http.ListenAndServe(":2112", nil)
}

// InitTracer prepares the Jaeger exporter
func InitTracer(ctx context.Context) (*tracesdk.TracerProvider, error) {
	exporter, err := otlptracegrpc.New(ctx, 
		otlptracegrpc.WithEndpoint("localhost:4317"), 
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}
	tp := tracesdk.NewTracerProvider(
		tracesdk.WithSampler(tracesdk.AlwaysSample()),
		tracesdk.WithBatcher(exporter),
		tracesdk.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL, 
			semconv.ServiceNameKey.String("anchor-service"),
		)),
	)
	otel.SetTracerProvider(tp)
	return tp, nil
}