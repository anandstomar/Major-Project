import { Kafka, Producer, Consumer } from "kafkajs";

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const clientId = process.env.KAFKA_CLIENT_ID || "anchoring-scheduler";

const kafka = new Kafka({ clientId, brokers });

export async function createProducer(): Promise<Producer> {
  const p = kafka.producer();
  await p.connect();
  return p;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const c = kafka.consumer({ groupId });
  await c.connect();
  return c;
}
