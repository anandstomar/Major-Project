import client from 'prom-client';
import express from 'express';


// Define all counters
const received = new client.Counter({ name: 'indexer_received_total', help: 'Total received' });
const skipped = new client.Counter({ name: 'indexer_skipped_total', help: 'Total skipped' });
const updated = new client.Counter({ name: 'indexer_updated_total', help: 'Total updated' });
const saved = new client.Counter({ name: 'indexer_saved_total', help: 'Total saved' });
const indexedSuccess = new client.Counter({ name: 'indexer_os_success_total', help: 'Total OpenSearch success' });
const indexedFailure = new client.Counter({ name: 'indexer_os_failure_total', help: 'Total OpenSearch failure' });
const processingFailure = new client.Counter({ name: 'indexer_processing_failure_total', help: 'Total processing failure' });

// Define the Timer/Histogram
// Note: Prometheus tracks time in seconds, so we convert ms to seconds below
const processTimer = new client.Histogram({
  name: 'indexer_process_duration_seconds',
  help: 'Indexer process duration',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5] 
});

// Export a class/object that mimics your Java methods
export const IndexerMetrics = {
  incrementReceived: () => received.inc(),
  incrementSkipped: () => skipped.inc(),
  incrementUpdated: () => updated.inc(),
  incrementSaved: () => saved.inc(),
  incrementIndexedSuccess: () => indexedSuccess.inc(),
  incrementIndexedFailure: () => indexedFailure.inc(),
  incrementProcessingFailure: () => processingFailure.inc(),
  
  // Takes milliseconds, observes in seconds for standard Prometheus formatting
  recordProcessingDuration: (ms: number) => processTimer.observe(ms / 1000)
};

export function startMetricsServer(port: number = 8083) {
  const app = express();

  // Serve the metrics so Prometheus can scrape them
  app.get('/actuator/prometheus', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  });

  app.listen(port, () => {
    console.log(`📊 [Telemetry] Indexer metrics server started on http://localhost:${port}/actuator/prometheus`);
  });
}