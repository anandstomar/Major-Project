import dotenv from "dotenv";
dotenv.config();

import { createProducer, createConsumer } from "./kafkaClient";
import { AnchoringScheduler } from "./scheduler";
import { createHttpServer } from "./httpServer";

async function main() {
  const groupId = process.env.GROUP_ID || "anchoring-scheduler-group";
  const producer = await createProducer();
  const consumer = await createConsumer(groupId);

  const scheduler = new AnchoringScheduler(producer, consumer);
  await scheduler.start();

  const  app = createHttpServer(scheduler);
  const port = parseInt(process.env.HTTP_PORT || "4100", 10);
  app.listen(port, () => {
    console.log(`Anchoring Scheduler HTTP listening on ${port}`);
  });
}

main().catch((err) => {
  console.error("Fatal scheduler error", err);
  process.exit(1);
});
