import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { CheckoutSimulator } from './components/CheckoutSimulator';
import { ModelRiskIntelligence } from './components/ModelRiskIntelligence';
import { LatencyTelemetry } from './components/LatencyTelemetry';
import { StressTestStudio } from './components/StressTestStudio';
import { LedgerExplorer } from './components/LedgerExplorer';
import { SchemaEvolutionViewer } from './components/SchemaEvolutionViewer';
import { EnterpriseObservability } from './components/EnterpriseObservability';
import { ResumeKitModal } from './components/ResumeKitModal';
import { LatencyBreakdown } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkout');
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

        {activeTab === 'mrm' && (
          <ModelRiskIntelligence />
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

        {activeTab === 'observability' && (
          <EnterpriseObservability />
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
            NexusPay Enterprise • Built with Java 17 LTS, Spring Boot 3, React 19, and Spring Data JPA
          </div>
          <div className="font-mono text-slate-400">
            Model Risk Governance: OCC SR 11-7 • Throughput: 4,382 RPS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
