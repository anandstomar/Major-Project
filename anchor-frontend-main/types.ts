import { LucideIcon } from 'lucide-react';

export enum Status {
  OK = 'OK',
  DEGRADED = 'DEGRADED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED'
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  children?: NavItem[];
}

export interface Anchor {
  requestId: string;
  merkleRoot: string;
  txHash?: string;
  pda?: string;
  blockNumber?: number;
  status: Status;
  submittedAt: string;
  submitter: string;
  events: string[];
}

export interface IngestJob {
  id: string;
  manifestName: string;
  uploader: string;
  status: Status;
  rows: number;
  startedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export interface SearchResult {
  text: string;
  sources: Array<{ uri: string; title: string }>;
}