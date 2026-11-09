import { DatabaseManager } from '../database/DatabaseManager.ts';
import { StressTestRunner } from './StressTestRunner.ts';

async function main() {
  console.log('===========================================================');
  console.log('⚡ NexusPay High-Throughput Payment & Ledger Concurrency Benchmark');
  console.log('===========================================================');

  const dbManager = DatabaseManager.createInMemory();
  const runner = new StressTestRunner(dbManager);

  console.log('\n[1/2] Warming up worker pool & prepared statement caches...');
  await runner.runBenchmark({ total_requests: 100, concurrency: 10, simulate_network_jitter: false, target_rps: 1000 });

  console.log('[2/2] Firing high-concurrency load test: 2,500 transactions across 50 concurrent workers...');
  const result = await runner.runBenchmark({
    total_requests: 2500,
    concurrency: 50,
    simulate_network_jitter: false,
    target_rps: 5000
  });

  console.log('\n---------------- BENCHMARK TELEMETRY RESULTS ----------------');
  console.log(`Total Transactions : ${result.total_requests}`);
  console.log(`Successful         : ${result.successful_requests}`);
  console.log(`Duplicates Blocked : ${result.duplicate_blocked_count} (Idempotency Key Collisions Safely Handled)`);
  console.log(`Failed             : ${result.failed_requests}`);
  console.log(`Execution Time     : ${result.total_time_ms} ms`);
  console.log(`Throughput         : 🚀 ${result.actual_rps} Transactions/Sec`);
  console.log(`p50 Latency        : ${result.p50_ms} ms`);
  console.log(`p90 Latency        : ${result.p90_ms} ms`);
  console.log(`p95 Latency        : ${result.p95_ms} ms`);
  console.log(`p99 Latency        : ${result.p99_ms} ms`);
  console.log(`p99.9 Latency      : ${result.p99_9_ms} ms`);
  console.log(`System Invariant   : ${result.balance_integrity_verified ? '✅ ZERO LEAKAGE (Total Funds Invariant Preserved)' : '❌ CORRUPTED'}`);
  console.log('------------------------------------------------------------\n');
}

main().catch(console.error);
