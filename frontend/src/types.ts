export interface Account {
  id: string;
  name: string;
  type: string;
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
  direction: 'DEBIT' | 'CREDIT';
  amount_cents: number;
  running_balance_cents: number;
  currency: string;
  description: string;
  created_at: string;
  block_hash: string;
  prev_block_hash: string;
}

export interface LatencyBreakdown {
  total_ms: number;
  dns_network_ms: number;
  idempotency_check_ms: number;
  db_transaction_ms: number;
  gateway_roundtrip_ms: number;
  serialization_ms: number;
}

export interface PaymentIntent {
  id: string;
  amount_cents: number;
  currency: string;
  customer_id: string;
  merchant_id: string;
  status: string;
  idempotency_key: string | null;
  stripe_payment_id: string;
  client_secret: string;
  failure_reason: string | null;
  created_at: string;
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

export interface MigrationInfo {
  version: number;
  name: string;
  description: string;
  rationale: string;
  performance_impact: string;
  is_applied: boolean;
  applied_at: string | null;
}
