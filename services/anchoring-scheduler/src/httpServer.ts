import express from "express";
import bodyParser from "body-parser";
import { AnchoringScheduler } from "./scheduler";

export function createHttpServer(scheduler: AnchoringScheduler) {
  const app = express();
  app.use(bodyParser.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // list pending requests
  app.get("/requests", (_req, res) => {
    res.json({ requests: scheduler.listPendingRequests() });
  });

  // approve request
  app.post("/approve/:requestId", async (req, res) => {
    const requestId = req.params.requestId;
    const approver = req.body.approver || req.headers["x-user"] || "ops";
    try {
      const result = await scheduler.approveRequest(requestId, approver);
      res.json({ ok: true, request: result });
    } catch (err: any) {
      if (err.message === "not_found") return res.status(404).json({ ok: false, error: "not_found" });
      if (err.message === "invalid_state") return res.status(400).json({ ok: false, error: "invalid_state" });
      console.error(err);
      res.status(500).json({ ok: false, error: "internal" });
    }
  });

  return app;
}
