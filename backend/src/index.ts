import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { serveStatic } from './staticServer.ts';
import { DatabaseManager } from './database/DatabaseManager.ts';
import { DoubleEntryLedger } from './ledger/DoubleEntryLedger.ts';
import { IdempotencyManager } from './middleware/IdempotencyManager.ts';
import { StripePaymentService } from './services/StripePaymentService.ts';
import { StressTestRunner } from './benchmarks/StressTestRunner.ts';

const PORT = parseInt(process.env.PORT || '5001', 10);

const dbManager = DatabaseManager.getInstance();
const ledger = new DoubleEntryLedger(dbManager);
const idempotencyManager = new IdempotencyManager(dbManager);
const stripeService = new StripePaymentService(dbManager, ledger);
const stressTestRunner = new StressTestRunner(dbManager);

function sendJson(res: http.ServerResponse, statusCode: number, data: any, extraHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, Stripe-Signature, Authorization',
    ...extraHeaders
  });
  res.end(payload);
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Body payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, Stripe-Signature, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  try {
    // 1. Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        service: 'NexusPay Core Engine',
        uptime_seconds: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }

    // 2. Accounts list
    if (pathname === '/api/accounts' && method === 'GET') {
      const accounts = ledger.getAllAccounts();
      return sendJson(res, 200, { accounts });
    }

    // 3. Ledger audit entries
    if (pathname === '/api/ledger/entries' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const entries = ledger.getEntries(limit);
      return sendJson(res, 200, { entries });
    }

    // 4. Ledger cryptographic integrity check
    if (pathname === '/api/ledger/integrity' && method === 'GET') {
      const check = ledger.verifyLedgerIntegrity();
      return sendJson(res, 200, check);
    }

    // 5. Payment checkout execution (with Idempotency + Latency Profiling)
    if (pathname === '/api/payments' && method === 'POST') {
      const body = await parseJsonBody(req);
      const idempKey = (req.headers['idempotency-key'] as string) || body.idempotency_key;

      if (!idempKey) {
        return sendJson(res, 400, {
          error: 'Missing required "Idempotency-Key" HTTP header. Core fintech APIs mandate client deduplication keys.'
        });
      }

      const requestHash = idempotencyManager.computeHash('POST', pathname, body);
      const lock = idempotencyManager.acquireLock(idempKey, requestHash);

      // Duplicate request check
      if (lock.isDuplicate) {
        if (lock.isProcessing) {
          return sendJson(res, 409, {
            error: 'Conflict: In-flight payment request already processing for this Idempotency-Key.',
            retry_after_ms: 500
          });
        }
        if (lock.cachedResponse) {
          return sendJson(res, lock.cachedResponse.code, lock.cachedResponse.body, {
            'X-Cache-Lookup': 'HIT-IDEMPOTENT',
            'X-Idempotency-Replay': 'true'
          });
        }
      }

      try {
        const amountCents = body.amount_cents || 5000; // default $50.00
        const currency = body.currency || 'USD';
        const customerId = body.customer_id || 'acc_customer_primary';
        const merchantId = body.merchant_id || 'acc_merchant_stripe';
        const cardNumber = body.card_number || '4242';
        const gatewayDelayMs = typeof body.gateway_delay_ms === 'number' ? body.gateway_delay_ms : 45;

        // Step A: Create PaymentIntent
        const pi = stripeService.createPaymentIntent(amountCents, currency, customerId, merchantId, idempKey);

        // Step B: Confirm & execute double-entry ledger settlement
        const result = await stripeService.confirmPayment(pi.id, cardNumber, gatewayDelayMs);

        // Step C: Resolve idempotency lock
        idempotencyManager.resolveLock(idempKey, 200, result);

        return sendJson(res, 200, result, {
          'X-Cache-Lookup': 'MISS',
          'X-Processing-Latency': `${result.latency.total_ms}ms`
        });
      } catch (err: any) {
        idempotencyManager.releaseLockOnError(idempKey);
        return sendJson(res, 500, { error: err.message });
      }
    }

    // 6. Recent Payments
    if (pathname === '/api/payments' && method === 'GET') {
      const payments = stripeService.getAllPayments();
      return sendJson(res, 200, { payments });
    }

    // 7. Webhook Handler (Stripe HMAC verification & Outbox)
    if (pathname === '/api/webhooks/stripe' && method === 'POST') {
      const sig = (req.headers['stripe-signature'] as string) || '';
      const body = await parseJsonBody(req);
      const rawPayload = JSON.stringify(body);

      const isValid = stripeService.verifyWebhookSignature(rawPayload, sig);
      if (!isValid) {
        return sendJson(res, 400, { error: 'Invalid HMAC-SHA256 signature' });
      }

      const evt = stripeService.dispatchWebhookEvent(body);
      return sendJson(res, 200, { received: true, event_id: evt.id });
    }

    // 8. Webhook history
    if (pathname === '/api/webhooks' && method === 'GET') {
      const events = stripeService.getWebhookEvents();
      return sendJson(res, 200, { events });
    }

    // 9. Stress Test & Concurrency Benchmark Engine
    if (pathname === '/api/benchmarks/run' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = await stressTestRunner.runBenchmark({
        total_requests: body.total_requests || 500,
        concurrency: body.concurrency || 20,
        simulate_network_jitter: !!body.simulate_network_jitter,
        target_rps: body.target_rps || 2000
      });
      return sendJson(res, 200, result);
    }

    // 10. Database Schema Evolution Timeline
    if (pathname === '/api/migrations' && method === 'GET') {
      const timeline = dbManager.migrationRunner.getMigrationTimeline();
      return sendJson(res, 200, { migrations: timeline });
    }

    // Static assets fallback (SPA)
    const candidatePaths = [
      path.resolve(process.cwd(), 'frontend/dist'),
      path.resolve(process.cwd(), '../frontend/dist')
    ];
    const distPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
    const served = serveStatic(req, res, distPath);
    if (served) return;

    return sendJson(res, 404, { error: `Route ${method} ${pathname} not found` });
  } catch (error: any) {
    console.error('Unhandled server error:', error);
    return sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[NexusPay Core Engine] Running on http://localhost:${PORT}`);
  console.log(`[Ready] Database WAL mode active. Ledger & Idempotency engines initialized.`);
});
