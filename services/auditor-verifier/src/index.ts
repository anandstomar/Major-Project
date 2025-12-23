import * as dotenv from 'dotenv';
dotenv.config();

import { createConsumer, createProducer } from './kafka';
import { initMinio } from './minio';
import { Processor } from './processor';
import { AnchorCompleted, VerifiedResult } from './types';
import { EachMessagePayload } from 'kafkajs';

async function main() {
  const inputTopic = process.env.INPUT_TOPIC || 'anchors.completed';
  const outputTopic = process.env.OUTPUT_TOPIC || 'anchors.verified';
  const groupId = process.env.KAFKA_GROUP_ID || 'auditor-group';
  const bucket = process.env.MINIO_BUCKET || 'ingest';

  const minio = initMinio();
  const consumer = await createConsumer(inputTopic, groupId);
  const producer = await createProducer();

  const processor = new Processor(minio, bucket);

  console.log('auditor-verifier: listening on', inputTopic);

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      try {
        if (!payload.message.value) return;
        const msg = JSON.parse(payload.message.value.toString()) as AnchorCompleted;
        console.log('processing request', msg.request_id);

        // skip if already persisted verification exists in minio (idempotent)
        try {
          const key = `${process.env.VERIFIED_PREFIX || 'verified'}/${msg.request_id}.json`;
          // try to get object; if exists skip recompute
          await minio.statObject(bucket, key);
          console.log('verified result exists, skipping:', msg.request_id);
          return;
        } catch (e) {
          // not present -> continue
        }

        const result: VerifiedResult = await processor.verify(msg);

        // publish to kafka
        await producer.send({
          topic: outputTopic,
          messages: [
            {
              key: msg.request_id,
              value: JSON.stringify(result)
            }
          ]
        });

        console.log('published verified', msg.request_id, 'merkle_match=', result.merkle_match);
      } catch (err) {
        console.error('process message error', err);
      }
    }
  });

  // graceful shutdown
  const shutdown = async () => {
    console.log('shutting down auditor-verifier...');
    await consumer.disconnect();
    await producer.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('fatal', err);
  process.exit(1);
});
