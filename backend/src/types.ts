export type AccountType = 
  | 'CUSTOMER_WALLET' 
  | 'MERCHANT_RECEIVABLE' 
  | 'PROCESSING_FEES' 
  | 'ESCROW' 
  | 'BANK_SETTLEMENT';

export type EntryDirection = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance_cents: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  direction: EntryDirection;
  amount_cents: number;
  running_balance_cents: number;
  currency: string;
  description: string;
  created_at: string;
  block_hash: string;
  prev_block_hash: string;
}

export type PaymentStatus = 
  | 'requires_payment_method' 
  | 'processing' 
  | 'succeeded' 
  | 'failed' 
  | 'canceled';

export interface PaymentIntent {
  id: string;
  amount_cents: number;
  currency: string;
  customer_id: string;
  merchant_id: string;
  status: PaymentStatus;
  idempotency_key: string | null;
  stripe_payment_id: string;
  client_secret: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdempotencyRecord {
  idempotency_key: string;
  request_hash: string;
  status: 'PROCESSING' | 'RESOLVED';
  response_code: number;
  response_body: string;
  lock_expires_at: number;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  payload: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'DLQ';
  signature: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface LatencyBreakdown {
  total_ms: number;
  dns_network_ms: number;
  idempotency_check_ms: number;
  db_transaction_ms: number;
  gateway_roundtrip_ms: number;
  serialization_ms: number;
}

export interface StressTestConfig {
  target_rps: number;
  total_requests: number;
  concurrency: number;
  simulate_network_jitter: boolean;
}

export interface StressTestResult {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  duplicate_blocked_count: number;
  total_time_ms: number;
  actual_rps: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  p99_9_ms: number;
  min_ms: number;
  max_ms: number;
  balance_integrity_verified: boolean;
  system_balance_cents: number;
}
