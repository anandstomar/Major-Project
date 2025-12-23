import { Client } from 'minio';
import { AnchorCompleted, VerifiedResult } from './types';
import { getObjectBytes, putObject } from './minio';
import { combineRootsHex } from './merkle';
import { ethers } from 'ethers';

export class Processor {
  private minio: Client;
  private bucket: string;
  private rpc?: string;

  constructor(minio: Client, bucket: string) {
    this.minio = minio;
    this.bucket = bucket;
    this.rpc = process.env.ANCHOR_CHAIN_RPC || undefined;
  }

  async verify(req: AnchorCompleted): Promise<VerifiedResult> {
    const notes: string[] = [];
    // 1) if computed root needed -> fetch previews
    let computedHex = '';
    try {
      const previewIds = req.preview_ids || [];
      if (previewIds.length === 0) {
        notes.push('no previews to recompute');
      } else {
        const roots: string[] = [];
        for (const pid of previewIds) {
          const key = `previews/${pid}.json`;
          try {
            const buf = await getObjectBytes(this.minio, this.bucket, key);
            const obj = JSON.parse(buf.toString('utf8'));
            if (obj.merkle_root) {
              roots.push(obj.merkle_root.startsWith('0x') ? obj.merkle_root : `0x${obj.merkle_root}`);
            } else {
              notes.push(`preview ${pid} missing merkle_root`);
            }
          } catch (e) {
            notes.push(`failed fetch preview ${pid}: ${String(e)}`);
          }
        }
        if (roots.length > 0) {
          computedHex = combineRootsHex(roots);
          // add 0x prefix to compare with anchor
          computedHex = '0x' + computedHex;
        }
      }
    } catch (err) {
      notes.push(`compute error: ${String(err)}`);
    }

    const merkleMatch = !!(req.merkle_root && computedHex && req.merkle_root.toLowerCase() === computedHex.toLowerCase());

    // 2) optional on-chain tx existence check
    let txExists = false;
    if (this.rpc && req.tx_hash) {
      try {
        const provider = new ethers.JsonRpcProvider(this.rpc);
        const tx = await provider.getTransaction(req.tx_hash);
        txExists = !!tx;
      } catch (e) {
        notes.push('rpc check failed: ' + String(e));
      }
    }

    const result: VerifiedResult = {
      request_id: req.request_id,
      merkle_root: req.merkle_root || '',
      computed_root: computedHex || '',
      merkle_match: merkleMatch,
      tx_hash: req.tx_hash,
      tx_exists: txExists,
      block_number: req.block_number,
      submitted_at: req.submitted_at,
      submitter: req.submitter,
      status: req.status,
      verified_at: new Date().toISOString(),
      notes
    };

    // persist to MinIO
    try {
      const key = `${process.env.VERIFIED_PREFIX || 'verified'}/${req.request_id}.json`;
      await putObject(this.minio, this.bucket, key, Buffer.from(JSON.stringify(result, null, 2)));
    } catch (e) {
      // swallow but annotate
      notes.push('persist failed: ' + String(e));
    }

    return result;
  }
}
