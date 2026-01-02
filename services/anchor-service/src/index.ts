import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { SolanaClient } from "./solana-client";

dotenv.config();

const port = Number(process.env.PORT || 3000);
const client = new SolanaClient();
const app = express();
app.use(bodyParser.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

// POST /api/v1/anchor/submit { request_id, merkle_root, events }
app.post("/api/v1/anchor/submit", async (req, res) => {
  try {
    const { request_id, merkle_root, events } = req.body;
    if (!request_id || !merkle_root) return res.status(400).json({ error: "request_id & merkle_root required" });
    const r = await client.submit(request_id, merkle_root, events || []);
    console.log(`[API] Success! Signature: ${r.signature}`);
    return res.json({ ok: true, ...r });
  } catch (err: any) {
    console.error("submit err", err);
    return res.status(500).json({ error: err.message || err });
  }
});

app.listen(port, () => {
  console.log(`Anchor service listening on ${port}`);
});
