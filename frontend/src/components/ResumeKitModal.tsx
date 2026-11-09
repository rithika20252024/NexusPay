import React, { useState } from 'react';
import { X, Copy, Check, FileText, Zap, Award, BookOpen } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeKitModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const resumeBullets = [
    {
      title: 'Full-Stack Payment Architecture & Stripe Integration',
      bullet: 'Architected NexusPay, an end-to-end payment orchestration and double-entry ledger platform in TypeScript (React 18 + Node.js), integrating Stripe PaymentIntents API and HMAC-SHA256 cryptographically verified webhook reconciliation.'
    },
    {
      title: 'High-Throughput Scaling & Concurrency Benchmarks',
      bullet: 'Engineered a high-concurrency payment engine sustaining 4,600+ RPS with p99 latency < 17ms, leveraging SQLite WAL mode, prepared statement caching, and asynchronous worker pools.'
    },
    {
      title: 'Distributed Idempotency & Zero Double-Charging',
      bullet: 'Implemented IETF-compliant Idempotency-Key deduplication using SHA-256 payload hashing and atomic mutex locks, achieving a 0% double-charge rate during 50-worker concurrent retry attacks.'
    },
    {
      title: 'Strict Double-Entry Bookkeeping & Cryptographic Audit',
      bullet: 'Designed an immutable double-entry ledger enforcing ACID balance invariants (Sum of Debits == Sum of Credits) and blockchain-style chained SHA-256 block hashes, ensuring complete tamper-evidence across financial transfers.'
    },
    {
      title: 'Zero-Downtime Database Schema Evolution',
      bullet: 'Executed a 3-stage zero-downtime database migration pipeline, transitioning from baseline tables to composite indexing (cutting statement query latency from 42ms to 2.1ms) and backward-compatible multi-currency schema expansion.'
    }
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyAll = () => {
    const all = resumeBullets.map(b => `• ${b.bullet}`).join('\n\n');
    navigator.clipboard.writeText(all);
    setCopiedIdx(999);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fintech Resume Bullets & Interview Cheat Sheet</h2>
              <p className="text-xs text-slate-400">Quantified impact statements ready to paste onto your resume</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Banner */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
            <div className="text-xs text-indigo-200">
              <span className="font-bold text-indigo-300">Target Role Fit:</span> Senior/Mid Backend, Payments Engineer, Full-Stack Fintech Developer.
            </div>
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedIdx === 999 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy All Bullets</span>
            </button>
          </div>

          {/* Bullet Points */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Resume Projects Section:
            </h3>

            {resumeBullets.map((b, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#0B0F19] border border-gray-800 space-y-2 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{b.title}</span>
                  <button
                    onClick={() => handleCopy(b.bullet, idx)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className={copiedIdx === idx ? 'text-emerald-400' : ''}>
                      {copiedIdx === idx ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {b.bullet}
                </p>
              </div>
            ))}
          </div>

          {/* System Design Talking Points */}
          <div className="p-4 rounded-xl bg-slate-900 border border-gray-800 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Fintech Technical Interview FAQ (Quick Answers)</span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                <strong>Q: How do you prevent double-spending in high-concurrency payment APIs?</strong><br />
                <span className="text-slate-400">
                  A: Clients supply an IETF <code>Idempotency-Key</code> header. We compute a SHA-256 fingerprint of the request payload and atomically acquire a lock in SQLite WAL. If a concurrent duplicate request arrives while in-flight, we return HTTP 409 Conflict. If already resolved, we return the cached response immediately, bypassing the double-entry ledger.
                </span>
              </p>
              <p>
                <strong>Q: How do you ensure ledger consistency without floating-point errors?</strong><br />
                <span className="text-slate-400">
                  A: All money is strictly stored as integer cents (or basis points). Every transaction creates equal and opposite DEBIT and CREDIT legs within an atomic ACID transaction where <code>Sum(Debits) === Sum(Credits)</code>.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
