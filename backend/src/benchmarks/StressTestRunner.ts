import crypto from 'node:crypto';
import { DatabaseManager } from '../database/DatabaseManager.ts';
import { DoubleEntryLedger } from '../ledger/DoubleEntryLedger.ts';
import { IdempotencyManager } from '../middleware/IdempotencyManager.ts';
import { StripePaymentService } from '../services/StripePaymentService.ts';
import type { StressTestConfig, StressTestResult } from '../types.ts';

export class StressTestRunner {
  private dbManager: DatabaseManager;
  private ledger: DoubleEntryLedger;
  private idempotencyManager: IdempotencyManager;
  private stripeService: StripePaymentService;

  constructor(dbManager?: DatabaseManager) {
    this.dbManager = dbManager || DatabaseManager.getInstance();
    this.ledger = new DoubleEntryLedger(this.dbManager);
    this.idempotencyManager = new IdempotencyManager(this.dbManager);
    this.stripeService = new StripePaymentService(this.dbManager, this.ledger);
  }

  public async runBenchmark(config: StressTestConfig): Promise<StressTestResult> {
    const { total_requests = 1000, concurrency = 25, simulate_network_jitter = false } = config;
    const latencies: number[] = [];
    let successful = 0;
    let failed = 0;
    let duplicateBlocked = 0;

    // Use a fixed pool of idempotency keys to test concurrent collision handling
    // 20% of keys will be duplicates to empirically verify zero double charges
    const uniqueKeyCount = Math.max(1, Math.floor(total_requests * 0.8));
    const keyPool = Array.from({ length: uniqueKeyCount }, () => 'idemp_' + crypto.randomBytes(8).toString('hex'));

    const startTime = performance.now();
    let requestIndex = 0;

    // Worker pool
    const worker = async () => {
      while (true) {
        const i = requestIndex++;
        if (i >= total_requests) break;

        const idempKey = keyPool[i % keyPool.length];
        const reqStart = performance.now();

        try {
          const reqBody = {
            amount_cents: 250, // $2.50 per transaction
            currency: 'USD',
            customer_id: 'acc_customer_primary',
            merchant_id: 'acc_merchant_stripe',
            card_number: '4242'
          };
          const hash = this.idempotencyManager.computeHash('POST', '/api/payments', reqBody);
          const lockResult = this.idempotencyManager.acquireLock(idempKey, hash);

          if (lockResult.isDuplicate) {
            if (lockResult.isProcessing) {
              duplicateBlocked++;
            } else if (lockResult.cachedResponse) {
              // Valid replay
              duplicateBlocked++;
              successful++;
            }
          } else {
            // Fresh execution
            const pi = this.stripeService.createPaymentIntent(
              reqBody.amount_cents,
              reqBody.currency,
              reqBody.customer_id,
              reqBody.merchant_id,
              idempKey
            );

            const delay = simulate_network_jitter ? Math.floor(Math.random() * 8) : 0;
            const res = await this.stripeService.confirmPayment(pi.id, reqBody.card_number, delay);

            this.idempotencyManager.resolveLock(idempKey, 200, res);
            successful++;
          }
        } catch (err) {
          failed++;
        } finally {
          latencies.push(performance.now() - reqStart);
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    const totalTimeMs = performance.now() - startTime;
    latencies.sort((a, b) => a - b);

    const getPercentile = (p: number) => {
      if (latencies.length === 0) return 0;
      const idx = Math.min(latencies.length - 1, Math.floor(latencies.length * (p / 100)));
      return parseFloat(latencies[idx].toFixed(2));
    };

    // Verify system balance integrity
    const accounts = this.ledger.getAllAccounts();
    const systemBalanceCents = accounts.reduce((acc, a) => acc + a.balance_cents, 0);
    // Initial was 1,000,000 cents ($10,000). Total funds in system must remain invariant!
    const balanceIntegrityVerified = systemBalanceCents === 1000000;

    return {
      total_requests,
      successful_requests: successful,
      failed_requests: failed,
      duplicate_blocked_count: duplicateBlocked,
      total_time_ms: parseFloat(totalTimeMs.toFixed(2)),
      actual_rps: parseFloat(((total_requests / (totalTimeMs / 1000))).toFixed(1)),
      p50_ms: getPercentile(50),
      p90_ms: getPercentile(90),
      p95_ms: getPercentile(95),
      p99_ms: getPercentile(99),
      p99_9_ms: getPercentile(99.9),
      min_ms: parseFloat((latencies[0] || 0).toFixed(2)),
      max_ms: parseFloat((latencies[latencies.length - 1] || 0).toFixed(2)),
      balance_integrity_verified: balanceIntegrityVerified,
      system_balance_cents: systemBalanceCents
    };
  }
}
