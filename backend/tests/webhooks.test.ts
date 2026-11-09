import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from '../src/database/DatabaseManager.ts';
import { StripePaymentService } from '../src/services/StripePaymentService.ts';

test('Stripe Webhook Engine: HMAC Signatures & Event Ingestion', async (t) => {
  const dbManager = DatabaseManager.createInMemory();
  const stripeService = new StripePaymentService(dbManager);

  await t.test('verifies valid HMAC-SHA256 signature', () => {
    const payload = JSON.stringify({ id: 'evt_test_123', type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = stripeService.generateWebhookSignature(payload, timestamp);

    const isValid = stripeService.verifyWebhookSignature(payload, signature);
    assert.equal(isValid, true, 'Valid signature must be verified successfully');
  });

  await t.test('rejects tampered webhook payload', () => {
    const payload = JSON.stringify({ id: 'evt_test_123', type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = stripeService.generateWebhookSignature(payload, timestamp);

    const tamperedPayload = JSON.stringify({ id: 'evt_test_123', type: 'payment_intent.succeeded', fraud: true });
    const isValid = stripeService.verifyWebhookSignature(tamperedPayload, signature);
    assert.equal(isValid, false, 'Tampered payload must be rejected');
  });

  await t.test('ingests webhook event and records in outbox', () => {
    const evt = stripeService.dispatchWebhookEvent({
      id: 'evt_audit_001',
      type: 'payment_intent.succeeded',
      data: { amount: 5000 }
    });

    assert.equal(evt.id, 'evt_audit_001');
    assert.equal(evt.status, 'PROCESSED');

    const history = stripeService.getWebhookEvents();
    assert.ok(history.some(e => e.id === 'evt_audit_001'));
  });
});
