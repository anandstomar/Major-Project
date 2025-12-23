export interface AnchorCompleted {
  request_id: string;
  merkle_root: string; // hex prefixed 0x...
  tx_hash?: string;
  block_number?: number;
  submitted_at?: string;
  submitter?: string;
  status?: string;
  preview_ids?: string[];
  events?: string[];
}

export interface VerifiedResult {
  request_id: string;
  merkle_root: string;
  computed_root: string;
  merkle_match: boolean;
  tx_hash?: string;
  tx_exists?: boolean;
  block_number?: number;
  submitted_at?: string;
  submitter?: string;
  status?: string;
  verified_at: string;
  notes?: string[];
}
