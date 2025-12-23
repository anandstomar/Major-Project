export interface AnchorCompleted {
  request_id: string;
  merkle_root: string;
  tx_hash: string;
  block_number: number;
  submitted_at: string; // ISO
  submitter?: string;
  status: string;
  preview_ids?: string[];
  events?: string[];
}
