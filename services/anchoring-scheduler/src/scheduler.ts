import { v4 as uuidv4 } from "uuid";
import { Consumer, Producer } from "kafkajs";
import { minio, ensureBucket } from "./minioClient";
import { estimateGasForLeaves } from "./gasEstimator";
import { Readable } from "stream";
import * as crypto from "crypto";

type Preview = {
  preview_id: string;
  batch_id: string;
  merkle_root: string;
  leaf_count: number;
  events: string[];
  estimated_gas: number;
  created_at: string;
  metadata?: any;
};

type Request = {
  request_id: string;
  merkle_root: string;
  preview_ids: string[];
  events: string[];
  submitter?: string | null;
  estimated_gas: number;
  status: "pending" | "approved" | "submitted" | "failed";
  created_at: string;
  approved_at?: string | null;
  submitted_at?: string | null;
  metadata?: any;
};

const BUCKET = process.env.MINIO_BUCKET || "ingest";
const PREVIEW_TOPIC = process.env.ANCHORS_PREVIEW_TOPIC || "anchors.preview";
const REQUEST_TOPIC = process.env.ANCHORS_REQUEST_TOPIC || "anchors.request";

function combineRoots(roots: string[]): string {
  if (roots.length === 0) return "0".repeat(64);
  if (roots.length === 1) return roots[0].replace(/^0x/, '');

  // Relax the TS typing here to avoid the ArrayBufferLike mismatch
  let layer: any[] = roots.map(r => Buffer.from(r.replace(/^0x/, ''), 'hex'));
  
  while (layer.length > 1) {
    const next: any[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(crypto.createHash('sha256').update(Buffer.concat([left, right])).digest());
    }
    layer = next;
  }
  return layer[0].toString('hex');
}

export class AnchoringScheduler {
  producer: Producer;
  consumer: Consumer;
  // pending previews waiting to be grouped: preview_id -> Preview
  pendingPreviews = new Map<string, Preview>();
  // pending requests store in memory (also stored in MinIO)
  pendingRequests = new Map<string, Request>();

  maxLeaves = parseInt(process.env.MAX_LEAVES_PER_REQUEST || "500", 10);
  maxGas = parseInt(process.env.MAX_GAS_PER_REQUEST || "1000000", 10);

  constructor(producer: Producer, consumer: Consumer) {
    this.producer = producer;
    this.consumer = consumer;
  }

 async streamToString(stream: Readable): Promise<string> {
    return await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (c) => chunks.push(Buffer.from(c)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }

  async loadPendingRequestsFromMinio() {
    console.info("Loading persisted requests from MinIO...");
    const prefix = "requests/";
    // use listObjectsV2 to list keys under requests/
    const stream = minio.listObjectsV2(BUCKET, prefix, true);
    for await (const obj of stream) {
      try {
        // obj.name will be like 'requests/req-xxxx.json'
        if (!obj.name || !obj.name.endsWith(".json")) continue;
        const reqStream = await minio.getObject(BUCKET, obj.name);
        const jsonText = await this.streamToString(reqStream as unknown as Readable);
        const r = JSON.parse(jsonText);
        // only re-add pending requests to memory (avoid duplicates)
        if (r && r.request_id && r.status === "pending") {
          this.pendingRequests.set(r.request_id, r);
          console.info("Rehydrated pending request:", r.request_id);
        } else {
          console.info("Skipping request from MinIO (not pending):", obj.name);
        }
      } catch (err) {
        console.error("Failed to load request from MinIO", obj.name, err);
      }
    }
  }

  async start() {
    await ensureBucket(BUCKET);
    await this.loadPendingRequestsFromMinio();
    await this.consumer.subscribe({ topic: PREVIEW_TOPIC, fromBeginning: true });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const preview = JSON.parse(message.value.toString()) as Preview;
          this.handlePreview(preview);
        } catch (err) {
          console.error("Invalid preview message", err);
        }
      },
    });
  }

  handlePreview(preview: Preview) {
    console.info("Received preview", preview.preview_id, "leaves:", preview.leaf_count);
    // store preview in memory and optionally persist to minio for audit
    this.pendingPreviews.set(preview.preview_id, preview);
    // optional: persist preview copy to MinIO (already validator likely did)
    // attempt to assemble request eagerly if thresholds reached
    this.maybeAssembleRequests();
  }

  maybeAssembleRequests() {
    // naive greedy packer: keep adding previews until maxLeaves or maxGas reached
    const previews = Array.from(this.pendingPreviews.values()).sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    if (previews.length === 0) return;

    let currentLeaves = 0;
    let currentPreviewIds: string[] = [];
    let currentEvents: string[] = [];
    let currentRoots: string[] = [];
    for (const p of previews) {
      if (currentLeaves + p.leaf_count > this.maxLeaves) {
        // finalize current
        if (currentPreviewIds.length > 0) {
          this.createRequest(currentPreviewIds, currentEvents, combineRoots(currentRoots));
          // reset
          currentLeaves = 0;
          currentPreviewIds = [];
          currentEvents = [];
        }
      }
      currentPreviewIds.push(p.preview_id);
      currentEvents.push(...p.events);
      currentRoots.push(p.merkle_root);
      currentLeaves += p.leaf_count;
      

      // if gas estimate would exceed limit, finalize as well
      const gasEstimate = estimateGasForLeaves(currentLeaves);
      if (gasEstimate >= this.maxGas) {
        this.createRequest(currentPreviewIds, currentEvents, combineRoots(currentRoots));
        currentLeaves = 0;
        currentPreviewIds = [];
        currentEvents = [];
      }
    }

    if (currentPreviewIds.length > 0) {
      // create last request (can be pending approval)
      this.createRequest(currentPreviewIds, currentEvents,combineRoots(currentRoots));
    }
  }

  async createRequest(previewIds: string[], events: string[], merkleRoot: string) {
    // remove previews from pendingPreviews
    previewIds.forEach((id) => this.pendingPreviews.delete(id));

    const request: Request = {
      request_id: `req-${uuidv4()}`,
      merkle_root: merkleRoot, 
      preview_ids: previewIds,
      events,
      estimated_gas: estimateGasForLeaves(events.length),
      status: "pending",
      created_at: new Date().toISOString(),
    };

    // persist to MinIO for auditability
    const key = `requests/${request.request_id}.json`;
    const body = Buffer.from(JSON.stringify(request, null, 2));
    minio.putObject(BUCKET, key, body, body.length, (err: any) => {
      if (err) {
        console.error("Failed to persist request to MinIO:", err);
      } else {
        console.info("Persisted request to MinIO:", key);
      }
    });

    // store in memory
    this.pendingRequests.set(request.request_id, request);
    console.info("Created pending anchors.request", request.request_id, "preview_count=", previewIds.length);
  }

  listPendingRequests() {
    return Array.from(this.pendingRequests.values()).filter((r) => r.status === "pending");
  }

  async approveRequest(requestId: string, approver: string) {
    const r = this.pendingRequests.get(requestId);
    if (!r) throw new Error("not_found");
    if (r.status !== "pending") throw new Error("invalid_state");
    r.status = "approved";
    r.approved_at = new Date().toISOString();
    r.submitter = approver || "unknown";

    // produce anchors.request message to Kafka
    await this.producer.send({
      topic: REQUEST_TOPIC,
      messages: [{ key: r.request_id, value: JSON.stringify(r) }],
    });

    // persist updated request
    const key = `requests/${r.request_id}.json`;
    const body = Buffer.from(JSON.stringify(r, null, 2));
    await minio.putObject(BUCKET, key, body, body.length);
    r.status = "submitted";
    r.submitted_at = new Date().toISOString();
    console.info("Published anchors.request", r.request_id);
    return r;
  }
}
