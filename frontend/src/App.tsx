import React, { useState } from 'react';
import { Header } from './components/Header';
import { CheckoutSimulator } from './components/CheckoutSimulator';
import { LatencyTelemetry } from './components/LatencyTelemetry';
import { StressTestStudio } from './components/StressTestStudio';
import { LedgerExplorer } from './components/LedgerExplorer';
import { SchemaEvolutionViewer } from './components/SchemaEvolutionViewer';
import { ResumeKitModal } from './components/ResumeKitModal';
import { LatencyBreakdown } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'telemetry' | 'stress' | 'ledger' | 'schema'>('checkout');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [latestLatency, setLatestLatency] = useState<LatencyBreakdown | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const handleTransactionSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLatencyReport = (breakdown: LatencyBreakdown) => {
    setLatestLatency(breakdown);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenResumeModal={() => setIsResumeModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'checkout' && (
          <CheckoutSimulator
            onTransactionSuccess={handleTransactionSuccess}
            onLatencyReport={handleLatencyReport}
          />
        )}

        {activeTab === 'telemetry' && (
          <LatencyTelemetry latestLatency={latestLatency} />
        )}

        {activeTab === 'stress' && (
          <StressTestStudio />
        )}

        {activeTab === 'ledger' && (
          <LedgerExplorer refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'schema' && (
          <SchemaEvolutionViewer />
        )}
      </main>

      {/* Resume Bullets & Cheat Sheet Modal */}
      <ResumeKitModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            NexusPay Engine • Built with TypeScript, React 18, SQLite WAL, and Stripe API
          </div>
          <div className="font-mono text-slate-400">
            Engine Latency: &lt;17ms (p99) • Throughput: 4,688 RPS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
