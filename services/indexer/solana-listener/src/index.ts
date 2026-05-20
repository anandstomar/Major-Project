import { Kafka } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { openSearchIndexer } from './telemetry'; // The file we made earlier
import { IndexerMetrics, startMetricsServer } from './metrics'; // The file we made earlier
import dotenv from 'dotenv';

dotenv.config();

// Environment Variables
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'anchors.completed';

// Initialize Clients
const prisma = new PrismaClient();
const kafka = new Kafka({ 
  clientId: 'indexer-service', 
  brokers: KAFKA_BROKERS 
});
const consumer = kafka.consumer({ groupId: 'indexer-group' });

async function startIndexer() {
  // 1. Start Prometheus metrics server (e.g., on port 8083)
  startMetricsServer(8083);

  // 2. Connect to Database & Kafka
  await prisma.$connect();
  console.log('✅ Connected to PostgreSQL');

  await consumer.connect();
  console.log(`✅ Connected to Kafka Brokers: ${KAFKA_BROKERS}`);

  // 3. Subscribe to the topic your Solana Listener is producing to
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: true });
  console.log(`🎧 Listening for messages on topic: ${KAFKA_TOPIC}...`);

  // 4. Process incoming Kafka messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const start = Date.now();
      IndexerMetrics.incrementReceived();

      if (!message.value) return;

      try {
        // Parse the JSON payload coming from the Solana Listener
        const payload = JSON.parse(message.value.toString());
        console.log(`[Processing] Anchor: ${payload.request_id}`);

        // A. Save to PostgreSQL (Adjust fields based on your schema.prisma)
        await prisma.anchor.upsert({
          where: { requestId: payload.request_id },
          update: {
            merkleRoot: payload.merkle_root,
            txHash: payload.tx_hash,
            blockNumber: payload.block_number,
            status: payload.status,
          },
          create: {
            requestId: payload.request_id,
            merkleRoot: payload.merkle_root,
            txHash: payload.tx_hash,
            blockNumber: payload.block_number,
            submitter: payload.submitter,
            status: payload.status,
          }
        });
        IndexerMetrics.incrementSaved();

        // B. Index to OpenSearch
        await openSearchIndexer.index({
          requestId: payload.request_id,
          merkleRoot: payload.merkle_root,
          txHash: payload.tx_hash,
          blockNumber: payload.block_number
        });
        IndexerMetrics.incrementIndexedSuccess();

        console.log(`✅ Successfully indexed: ${payload.request_id}`);

      } catch (err) {
        console.error("❌ Failed to process message:", err);
        IndexerMetrics.incrementIndexedFailure();
        IndexerMetrics.incrementProcessingFailure();
      } finally {
        // Record how long it took to process this single anchor
        IndexerMetrics.recordProcessingDuration(Date.now() - start);
      }
    },
  });
}

// Start the service
startIndexer().catch(async (err) => {
  console.error("Fatal Indexer Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});