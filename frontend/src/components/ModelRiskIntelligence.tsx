import React, { useState, useEffect } from 'react';
import { ShieldAlert, BrainCircuit, CheckCircle2, Lock, FileCheck, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';

export const ModelRiskIntelligence: React.FC = () => {
  const [testAmount, setTestAmount] = useState('250.00');
  const [testCard, setTestCard] = useState('4242');
  const [riskAssessment, setRiskAssessment] = useState<any>({
    riskScore: 18.5,
    riskLevel: 'LOW',
    modelVersion: 'MRM-FIN-FRAUD-v1.2-APPROVED',
    decision: 'APPROVE',
    featureImportance: {
      'Card & Device Fingerprint': 0.45,
      'Amount Deviation (Z-Score)': 0.40,
      'Transaction Velocity Metric': 0.15
    },
    piiMaskedAccount: 'acc_cust****_pri',
    complianceSummary: 'Model MRM-FIN-FRAUD-v1.2-APPROVED executed inference. Risk Score: 18.5 [APPROVE]. OCC SR 11-7 Audit Trail Logged.'
  });

  const [governance, setGovernance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRisk = async (amount: string, card: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/mrm/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: Math.round(parseFloat(amount) * 100),
          card_number: card,
          customer_id: 'acc_customer_primary'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRiskAssessment(data);
      }
    } catch (e) {
      console.error('MRM assessment error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/mrm/governance')
      .then(res => res.json())
      .then(setGovernance)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner: Enterprise AI & Regulatory Alignment */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">AI-Enabled Engineering & Model Risk Management (MRM)</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  OCC SR 11-7 Validated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explainable AI inference for real-time transaction risk scoring with strict PII confidentiality controls
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs px-3 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              Model: {riskAssessment?.modelVersion || 'MRM-FIN-FRAUD-v1.2'}
            </span>
          </div>
        </div>

        {/* Live Simulator Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Simulate Transaction Amount ($ USD)
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={e => {
                setTestAmount(e.target.value);
                fetchRisk(e.target.value, testCard);
              }}
              className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Card Risk Profile Scenario
            </label>
            <select
              value={testCard}
              onChange={e => {
                setTestCard(e.target.value);
                fetchRisk(testAmount, e.target.value);
              }}
              className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="4242">•••• 4242 (Low Risk Standard)</option>
              <option value="0002">•••• 0002 (Elevated Liquidity Risk)</option>
              <option value="9999">•••• 9999 (High Fraud Radar Anomaly)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => fetchRisk(testAmount, testCard)}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>Run MRM Model Inference</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inference & Governance Dashboard */}
      {riskAssessment && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Real-Time Score Gauge & XAI Feature Weights */}
          <div className="lg:col-span-7 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Model Inference & Explainability (XAI)
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                riskAssessment.riskLevel === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                riskAssessment.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {riskAssessment.riskLevel} RISK • {riskAssessment.decision}
              </span>
            </div>

            {/* Score Display */}
            <div className="flex items-center space-x-6 p-4 rounded-xl bg-[#0B0F19] border border-gray-800">
              <div className="text-center">
                <div className={`text-4xl font-black font-mono ${
                  riskAssessment.riskScore >= 85 ? 'text-rose-400' :
                  riskAssessment.riskScore >= 65 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {riskAssessment.riskScore}
                </div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Composite Score / 100</div>
              </div>

              <div className="flex-1 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Threshold SLA:</span>
                  <span className="font-mono text-slate-400">&lt; 65.0 Auto-Approve</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Target Entity (PII Redacted):</span>
                  <span className="font-mono text-indigo-400">{riskAssessment.piiMaskedAccount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Regulatory Audit Log:</span>
                  <span className="font-mono text-emerald-400">✓ Immutable Record</span>
                </div>
              </div>
            </div>

            {/* Explainable AI Feature Weights */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Feature Attribution & Importance Weights
              </h4>
              <div className="space-y-3">
                {Object.entries(riskAssessment.featureImportance || {}).map(([feat, weight]: [string, any], idx) => {
                  const pct = Math.round(weight * 100);
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{feat}</span>
                        <span className="font-mono font-bold text-indigo-400">{pct}% impact</span>
                      </div>
                      <div className="w-full bg-[#0B0F19] rounded-full h-2 overflow-hidden flex border border-gray-800">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regulatory Summary Box */}
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 font-mono">
              {riskAssessment.complianceSummary}
            </div>
          </div>

          {/* Right: Wells Fargo MRM Guidelines & Governance */}
          <div className="lg:col-span-5 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-gray-800 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-purple-400" />
              Model Risk Governance Standards
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Federal Reserve & OCC SR 11-7
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Supervisory guidance requiring rigorous conceptual soundness, ongoing monitoring, and outcome analysis for all financial AI/ML decision systems.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  PII Data Classification & Confidentiality
                </div>
                <p className="text-slate-400 leading-relaxed">
                  All customer identifiers are sanitized and pseudonymized (e.g. <code>acc_cust****_pri</code>) before reaching inference engines to uphold enterprise bank confidentiality policies.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F19] border border-gray-800">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Quarterly Model Drift Auditing
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Continuous validation checks detect concept drift in payment velocity and fraud vectors, triggering automated retraining prompts without disrupting live settlement rails.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
