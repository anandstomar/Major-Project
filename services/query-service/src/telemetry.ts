import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
const { Resource } = require('@opentelemetry/resources');

// Cast exporter to any to avoid type mismatches between different installed
// copies of @opentelemetry packages.
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4317',
}) as any;

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'query-service',
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

export async function startTelemetry() {
  try {
    await sdk.start();
    console.log('Telemetry initialized');
  } catch (error) {
    console.error('Error initializing telemetry', error);
  }
}

process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('Telemetry terminated');
  } catch (error) {
    console.error('Error terminating telemetry', error);
  } finally {
    process.exit(0);
  }
});