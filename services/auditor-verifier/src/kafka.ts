import { Kafka, Consumer, Producer } from 'kafkajs';

let kafka: Kafka;

export function initKafka(): Kafka {
  if (kafka) return kafka;
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'auditor-verifier',
    brokers
  });
  return kafka;
}

export async function createConsumer(topic: string, groupId: string): Promise<Consumer> {
  const k = initKafka();
  const consumer = k.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  return consumer;
}

export async function createProducer(): Promise<Producer> {
  const k = initKafka();
  const producer = k.producer();
  await producer.connect();
  return producer;
}
