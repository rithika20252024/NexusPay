import React from 'react';
import { ShieldCheck, Cpu, Zap, Database, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'checkout' | 'telemetry' | 'stress' | 'ledger' | 'schema';
  setActiveTab: (tab: 'checkout' | 'telemetry' | 'stress' | 'ledger' | 'schema') => void;
  onOpenResumeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenResumeModal }) => {
  return (
    <header className="border-b border-gray-800 bg-[#0B0F19]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Badges */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Nexus<span className="text-indigo-400">Pay</span></span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  WAL Engine 4.6k RPS
                </span>
              </div>
              <p className="text-xs text-slate-400">Production Payment Gateway & High-Throughput Double-Entry Ledger</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('checkout')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'checkout'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              💳 Payment Checkout
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              ⚡ Latency Profiler
            </button>
            <button
              onClick={() => setActiveTab('stress')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'stress'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🔥 5k RPS Stress Test
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              📊 Double-Entry Ledger
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🗄️ Schema Evolution
            </button>
          </nav>

          {/* Action / Resume Kit Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenResumeModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resume Bullets & Interview Kit</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
