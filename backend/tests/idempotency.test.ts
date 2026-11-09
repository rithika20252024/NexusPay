import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/database/DatabaseManager.ts';
import { IdempotencyManager } from '../src/middleware/IdempotencyManager.ts';
import { DoubleEntryLedger } from '../src/ledger/DoubleEntryLedger.ts';

test('Idempotency Engine: Concurrency Race Condition Protection', async (t) => {
  const dbManager = DatabaseManager.createInMemory();
  const idempotencyManager = new IdempotencyManager(dbManager);
  const ledger = new DoubleEntryLedger(dbManager);

  await t.test('prevents double charging across concurrent identical requests', async () => {
    const key = 'test_key_concurrent_99';
    const body = { amount_cents: 5000, recipient: 'acc_merchant_stripe' };
    const hash = idempotencyManager.computeHash('POST', '/api/payments', body);

    const initialCustomerBalance = ledger.getAccount('acc_customer_primary')!.balance_cents;

    // Simulate 30 concurrent threads attempting to charge with the exact same key
    const tasks = Array.from({ length: 30 }, async (_, idx) => {
      const lock = idempotencyManager.acquireLock(key, hash);
      if (!lock.isDuplicate) {
        // Execute financial transfer
        ledger.transfer({
          transaction_id: `tx_${idx}`,
          source_account_id: 'acc_customer_primary',
          destination_account_id: 'acc_merchant_stripe',
          amount_cents: 5000,
          description: 'Single charge'
        });
        idempotencyManager.resolveLock(key, 200, { status: 'succeeded', tx: `tx_${idx}` });
        return { status: 'executed' };
      } else if (lock.cachedResponse) {
        return { status: 'replayed', data: lock.cachedResponse.body };
      } else {
        return { status: 'conflict' };
      }
    });

    const results = await Promise.all(tasks);

    const executedCount = results.filter(r => r.status === 'executed').length;
    assert.equal(executedCount, 1, 'Exactly ONE transaction should execute');

    const customerBalanceAfter = ledger.getAccount('acc_customer_primary')!.balance_cents;
    assert.equal(
      customerBalanceAfter,
      initialCustomerBalance - 5000,
      'Customer balance must only be deducted once for 30 concurrent attempts'
    );
  });

  await t.test('detects payload tampering with identical idempotency key', () => {
    const key = 'test_tamper_key';
    const hash1 = idempotencyManager.computeHash('POST', '/api/payments', { amount: 100 });
    const hash2 = idempotencyManager.computeHash('POST', '/api/payments', { amount: 200 }); // Different payload!

    idempotencyManager.acquireLock(key, hash1);
    idempotencyManager.resolveLock(key, 200, { ok: true });

    assert.throws(() => {
      idempotencyManager.acquireLock(key, hash2);
    }, /422: Idempotency payload mismatch/);
  });
});
