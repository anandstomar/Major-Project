import express from 'express';
import client from 'prom-client';
import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

// 1. Enable default standard metrics (CPU, memory, Event Loop lag)
// This is the TS equivalent of promhttp.Handler() defaults
client.collectDefaultMetrics();

// 2. Recreate your Counter
export const anchorsProcessed = new client.Counter({
  name: 'anchors_processed_total',
  help: 'Total anchor requests processed',
  labelNames: ['status'],
});

// 3. Recreate your Histogram
export const anchorSubmitLatency = new client.Histogram({
  name: 'anchor_submit_latency_seconds',
  help: 'Anchor submission latency (seconds)',
  // You can define custom buckets or use defaults
  buckets: [0.1, 0.5, 1, 2, 5], 
});

// 4. Start the metrics server (equivalent to StartMetricsServer in Go)
export function startMetricsServer(port: number = 2112) {
  const app = express();

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  });
  

  app.listen(port, () => {
    console.log(`Metrics server started on http://localhost:${port}/metrics`);
  });
}


export function initTracer() {
  // 1. Tell OpenTelemetry the service name using the standard environment variable
  // This completely bypasses the TypeScript 'Resource' class error.
  process.env.OTEL_SERVICE_NAME = 'anchor-service';

  // 2. Initialize the SDK without the resource block
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: 'http://localhost:4317', // Your local Jaeger/Collector
    }),
  });

  // Start the SDK
  sdk.start();
  
  console.log('[Telemetry] OpenTelemetry gRPC tracer initialized connected to http://localhost:4317');
  
  return trace.getTracer('anchor-service');
}

if (require.main === module) {
    startMetricsServer();
    initTracer();
}