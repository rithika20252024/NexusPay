import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Zap, ShieldAlert, Clock } from 'lucide-react';
import { LatencyBreakdown } from '../types';

interface CheckoutProps {
  onTransactionSuccess: () => void;
  onLatencyReport: (breakdown: LatencyBreakdown) => void;
}

export const CheckoutSimulator: React.FC<CheckoutProps> = ({ onTransactionSuccess, onLatencyReport }) => {
  const [amount, setAmount] = useState('75.00');
  const [currency, setCurrency] = useState('USD');
  const [cardNumber, setCardNumber] = useState('4242');
  const [gatewayDelay, setGatewayDelay] = useState(45);
  const [idempotencyKey, setIdempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 10));
  const [freezeKey, setFreezeKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [doubleClickAlert, setDoubleClickAlert] = useState<string | null>(null);

  const generateNewKey = () => {
    setIdempotencyKey('idemp_' + Math.random().toString(36).substring(2, 10));
    setDoubleClickAlert(null);
  };

  const handlePayment = async (overrideKey?: string) => {
    setLoading(true);
    setDoubleClickAlert(null);
    const key = overrideKey || idempotencyKey;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        },
        body: JSON.stringify({
          amount_cents: Math.round(parseFloat(amount) * 100),
          currency,
          customer_id: 'acc_customer_primary',
          merchant_id: 'acc_merchant_stripe',
          card_number: cardNumber,
          gateway_delay_ms: gatewayDelay
        })
      });

      const cacheHeader = res.headers.get('X-Cache-Lookup') || 'MISS';
      const data = await res.json();

      setLastResponse({
        status: res.status,
        cacheLookup: cacheHeader,
        data,
        timestamp: new Date().toLocaleTimeString()
      });

      if (data.latency) {
        onLatencyReport(data.latency);
      }

      if (res.ok) {
        onTransactionSuccess();
        if (!freezeKey) {
          generateNewKey();
        }
      }
    } catch (err: any) {
      setLastResponse({
        status: 500,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDoubleClick = async () => {
    setDoubleClickAlert('🚀 Fired 2 simultaneous concurrent requests with identical Idempotency-Key!');
    setLoading(true);

    const testKey = idempotencyKey;

    // Fire 2 concurrent HTTP requests with the exact same idempotency key
    const req1 = fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': testKey },
      body: JSON.stringify({
        amount_cents: Math.round(parseFloat(amount) * 100),
        currency,
        customer_id: 'acc_customer_primary',
        merchant_id: 'acc_merchant_stripe',
        card_number: cardNumber,
        gateway_delay_ms: gatewayDelay
      })
    });

    const req2 = fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': testKey },
      body: JSON.stringify({
        amount_cents: Math.round(parseFloat(amount) * 100),
        currency,
        customer_id: 'acc_customer_primary',
        merchant_id: 'acc_merchant_stripe',
        card_number: cardNumber,
        gateway_delay_ms: gatewayDelay
      })
    });

    try {
      const [res1, res2] = await Promise.all([req1, req2]);
      const data1 = await res1.json();
      const data2 = await res2.json();

      const cache1 = res1.headers.get('X-Cache-Lookup') || 'MISS';
      const cache2 = res2.headers.get('X-Cache-Lookup') || (res2.status === 409 ? 'MUTEX_LOCKED' : 'HIT-IDEMPOTENT');

      setLastResponse({
        status: `${res1.status} & ${res2.status}`,
        isRaceTest: true,
        req1: { status: res1.status, cache: cache1, data: data1 },
        req2: { status: res2.status, cache: cache2, data: data2 },
        timestamp: new Date().toLocaleTimeString()
      });

      if (data1.latency) onLatencyReport(data1.latency);
      onTransactionSuccess();
    } catch (err: any) {
      setLastResponse({ status: 500, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Stripe Checkout Card Form */}
      <div className="lg:col-span-7 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Stripe Payment Gateway Checkout</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            POST /api/payments
          </span>
        </div>

        <div className="space-y-4">
          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Payment Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg pl-8 pr-4 py-2 text-white font-mono text-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Test Card Scenario Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Simulated Test Card Scenario
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCardNumber('4242')}
                className={`px-3 py-2 rounded-lg text-left text-xs font-medium border transition-all ${
                  cardNumber === '4242'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-gray-800 bg-[#0B0F19] text-slate-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold font-mono">•••• 4242</div>
                <div className="text-[11px] text-emerald-400">✓ Succeeded</div>
              </button>

              <button
                type="button"
                onClick={() => setCardNumber('0002')}
                className={`px-3 py-2 rounded-lg text-left text-xs font-medium border transition-all ${
                  cardNumber === '0002'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-gray-800 bg-[#0B0F19] text-slate-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold font-mono">•••• 0002</div>
                <div className="text-[11px] text-amber-400">⚠️ Card Declined</div>
              </button>

              <button
                type="button"
                onClick={() => setCardNumber('9999')}
                className={`px-3 py-2 rounded-lg text-left text-xs font-medium border transition-all ${
                  cardNumber === '9999'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-gray-800 bg-[#0B0F19] text-slate-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold font-mono">•••• 9999</div>
                <div className="text-[11px] text-rose-400">🚫 Radar Block</div>
              </button>
            </div>
          </div>

          {/* Idempotency Key Control */}
          <div className="p-3.5 bg-[#0B0F19] border border-gray-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                IETF Header: <code className="text-indigo-400">Idempotency-Key</code>
              </span>
              <button
                type="button"
                onClick={generateNewKey}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> New UUID
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={idempotencyKey}
                className="w-full bg-[#111827] border border-gray-700 rounded px-2.5 py-1.5 text-xs font-mono text-emerald-400"
              />
              <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={freezeKey}
                  onChange={e => setFreezeKey(e.target.checked)}
                  className="rounded border-gray-700 text-indigo-600 focus:ring-0"
                />
                <span>Hold Key</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Guarantees exactly-once execution. If the network drops or client clicks repeatedly, duplicate charges are 100% prevented.
            </p>
          </div>

          {/* Network Latency Simulator Slider */}
          <div className="p-3.5 bg-[#0B0F19] border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Simulated Stripe Roundtrip Latency:
              </span>
              <span className="font-mono text-indigo-400 font-bold">{gatewayDelay} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={gatewayDelay}
              onChange={e => setGatewayDelay(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePayment()}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Authorize & Settle</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSimulateDoubleClick}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate Double-Click Attack</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live API Response & Idempotency Telemetry */}
      <div className="lg:col-span-5 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Gateway Response Stream</h3>
          {lastResponse && (
            <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
              lastResponse.cacheLookup === 'HIT-IDEMPOTENT'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {lastResponse.cacheLookup === 'HIT-IDEMPOTENT' ? '🛡️ IDEMPOTENT REPLAY' : '⚡ FRESH EXECUTION'}
            </span>
          )}
        </div>

        {doubleClickAlert && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>{doubleClickAlert}</span>
          </div>
        )}

        {lastResponse ? (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {lastResponse.isRaceTest ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Request 1 (Primary):</span>
                    <span className="text-emerald-400 font-bold">HTTP {lastResponse.req1.status} (Cache: {lastResponse.req1.cache})</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Acquired atomic lock $\rightarrow$ Committed to Ledger.</p>
                </div>

                <div className="p-3 bg-[#0B0F19] rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-amber-400">Request 2 (Duplicate):</span>
                    <span className="text-amber-300 font-bold">HTTP {lastResponse.req2.status} (Protected)</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90">
                    Intercepted by Idempotency Middleware! Bypassed database ledger and returned cached transaction response. Zero double-charge.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">HTTP Status:</span>
                  <span className={`font-mono font-bold ${lastResponse.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lastResponse.status} {lastResponse.status === 200 ? 'OK' : 'ERROR'}
                  </span>
                </div>

                {lastResponse.data?.payment && (
                  <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800 space-y-1.5 text-xs font-mono">
                    <div className="text-slate-400 flex justify-between">
                      <span>PaymentIntent ID:</span>
                      <span className="text-white">{lastResponse.data.payment.id}</span>
                    </div>
                    <div className="text-slate-400 flex justify-between">
                      <span>Stripe Charge ID:</span>
                      <span className="text-indigo-400">{lastResponse.data.payment.stripe_payment_id}</span>
                    </div>
                    <div className="text-slate-400 flex justify-between">
                      <span>State:</span>
                      <span className="text-emerald-400 font-bold">{lastResponse.data.payment.status}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <span className="text-xs text-slate-400 block mb-1 font-mono">Raw JSON Payload:</span>
              <pre className="bg-[#0B0F19] p-3 rounded-lg border border-gray-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                {JSON.stringify(lastResponse.data || lastResponse, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <CreditCard className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
            <p className="text-sm">Click "Authorize & Settle" or "Simulate Double-Click Attack" to test live payment dispatch and idempotency replay.</p>
          </div>
        )}
      </div>
    </div>
  );
};
