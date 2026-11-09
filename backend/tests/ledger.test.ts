import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/database/DatabaseManager.ts';
import { DoubleEntryLedger } from '../src/ledger/DoubleEntryLedger.ts';

test('Double-Entry Ledger: Balanced Invariant & Cryptographic Audit', async (t) => {
  const dbManager = DatabaseManager.createInMemory();
  const ledger = new DoubleEntryLedger(dbManager);

  await t.test('enforces zero balance leakage across transfers', () => {
    const srcBefore = ledger.getAccount('acc_customer_primary')!;
    const dstBefore = ledger.getAccount('acc_merchant_stripe')!;
    const feeBefore = ledger.getAccount('acc_stripe_fees')!;

    const initialTotal = srcBefore.balance_cents + dstBefore.balance_cents + feeBefore.balance_cents;

    // Transfer $100.00 (10000 cents) with $3.20 fee (320 cents)
    const result = ledger.transfer({
      transaction_id: 'tx_test_001',
      source_account_id: 'acc_customer_primary',
      destination_account_id: 'acc_merchant_stripe',
      fee_account_id: 'acc_stripe_fees',
      amount_cents: 10000,
      fee_cents: 320,
      currency: 'USD',
      description: 'Test Payment'
    });

    assert.equal(result.success, true);
    assert.equal(result.entries.length, 3);

    const srcAfter = ledger.getAccount('acc_customer_primary')!;
    const dstAfter = ledger.getAccount('acc_merchant_stripe')!;
    const feeAfter = ledger.getAccount('acc_stripe_fees')!;

    assert.equal(srcAfter.balance_cents, srcBefore.balance_cents - 10000);
    assert.equal(dstAfter.balance_cents, dstBefore.balance_cents + (10000 - 320));
    assert.equal(feeAfter.balance_cents, feeBefore.balance_cents + 320);

    const finalTotal = srcAfter.balance_cents + dstAfter.balance_cents + feeAfter.balance_cents;
    assert.equal(initialTotal, finalTotal, 'System total cents must remain strictly invariant');
  });

  await t.test('rejects transfers exceeding available funds', () => {
    assert.throws(() => {
      ledger.transfer({
        transaction_id: 'tx_test_overdraft',
        source_account_id: 'acc_customer_primary',
        destination_account_id: 'acc_merchant_stripe',
        amount_cents: 99999999, // Way more than balance
        description: 'Overdraft attempt'
      });
    }, /Insufficient funds/);
  });

  await t.test('verifies cryptographic SHA-256 audit blockchain integrity', () => {
    const integrity = ledger.verifyLedgerIntegrity();
    assert.equal(integrity.isValid, true);
    assert.ok(integrity.checkedEntries > 0);
  });
});
