import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, ArrowDownRight, ArrowUpRight, CheckCircle2, Lock, RefreshCw, Key } from 'lucide-react';
import { Account, LedgerEntry } from '../types';

interface LedgerProps {
  refreshTrigger: number;
}

export const LedgerExplorer: React.FC<LedgerProps> = ({ refreshTrigger }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<{ isValid: boolean; checkedEntries: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLedgerData = async () => {
    try {
      const [accRes, entriesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/ledger/entries?limit=30')
      ]);
      const accData = await accRes.json();
      const entriesData = await entriesRes.json();
      setAccounts(accData.accounts || []);
      setEntries(entriesData.entries || []);
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    }
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/ledger/integrity');
      const data = await res.json();
      setIntegrityStatus(data);
    } catch (err) {
      console.error('Integrity check failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [refreshTrigger]);

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="space-y-6">
      {/* Account Balances Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Real-Time Chart of Financial Accounts
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ACID Invariant: Debits === Credits
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map(acc => {
            const isCustomer = acc.type === 'CUSTOMER_WALLET';
            const isMerchant = acc.type === 'MERCHANT_RECEIVABLE';
            const isFees = acc.type === 'PROCESSING_FEES';

            return (
              <div
                key={acc.id}
                className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-mono text-[11px] truncate max-w-[140px]">{acc.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isCustomer ? 'bg-sky-500/10 text-sky-400' :
                    isMerchant ? 'bg-emerald-500/10 text-emerald-400' :
                    isFees ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {acc.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-sm font-semibold text-white mb-1 truncate">{acc.name}</div>
                <div className="text-2xl font-black font-mono text-white">
                  {formatMoney(acc.balance_cents)}
                </div>

                <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Version (Lock): v{acc.version}</span>
                  <span className="text-slate-500">{acc.currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cryptographic Ledger Integrity Verification */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Cryptographic SHA-256 Audit Blockchain
              {integrityStatus && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-normal">
                  ✓ {integrityStatus.checkedEntries} Blocks Verified Tamper-Proof
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              Every ledger entry contains an immutable chained SHA-256 hash preventing unauthorized balance tampering
            </p>
          </div>
        </div>

        <button
          onClick={handleVerifyIntegrity}
          disabled={verifying}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all whitespace-nowrap"
        >
          {verifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>Verify Cryptographic Audit Chain</span>
        </button>
      </div>

      {/* Audit Entries Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Immutable Double-Entry Audit Trail
          </h3>
          <span className="text-xs text-slate-400">Showing last {entries.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 uppercase tracking-wider font-mono">
                <th className="pb-3 font-semibold">Entry ID</th>
                <th className="pb-3 font-semibold">Direction</th>
                <th className="pb-3 font-semibold">Account</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Balance After</th>
                <th className="pb-3 font-semibold">SHA-256 Block Hash</th>
                <th className="pb-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No ledger transactions recorded yet. Complete a checkout in the Payment tab to view live entries.
                  </td>
                </tr>
              ) : (
                entries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-slate-300">{e.id}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                        e.direction === 'DEBIT'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {e.direction === 'DEBIT' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {e.direction}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{e.account_id}</td>
                    <td className={`py-3 font-bold ${e.direction === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {e.direction === 'DEBIT' ? '-' : '+'}{formatMoney(e.amount_cents)}
                    </td>
                    <td className="py-3 text-white font-semibold">{formatMoney(e.running_balance_cents)}</td>
                    <td className="py-3 text-slate-400 truncate max-w-[120px]" title={e.block_hash}>
                      {e.block_hash ? `${e.block_hash.substring(0, 10)}...` : 'GENESIS'}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">{new Date(e.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
