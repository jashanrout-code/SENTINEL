import { useEffect, useState } from 'react';

import { Header } from './components/common/Header';
import { GuidedWorkflowBanner } from './components/common/GuidedWorkflowBanner';
import { CommandCentreView } from './components/views/CommandCentreView';
import { IncidentManagementView } from './components/views/IncidentManagementView';
import { OperationsView } from './components/views/OperationsView';
import { useSentinelStore } from './store/useSentinelStore';
import { simulationScheduler } from './core/simulationScheduler';
import { useGuidedNavigationResolver } from './hooks/useGuidedNavigationResolver';
import { Activity, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export function App() {
  const currentView = useSentinelStore(state => state.currentView);
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Activate asynchronous guided operator navigation resolution
  useGuidedNavigationResolver();

  useEffect(() => {
    // Ensure authoritative simulation scheduler is running
    simulationScheduler.start();
    const update = () => setCurrentTime(new Date().toLocaleTimeString());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#070a0e] text-slate-100 font-sans select-none">
      {/* Top Industrial Command-Centre Header */}
      <Header />

      {/* Guided Operator Workflow Notification Banner */}
      <GuidedWorkflowBanner />

      {/* Main Operational View Router */}
      <main className="flex-1 flex flex-col w-full overflow-hidden">
        {currentView === 'command-centre' && <CommandCentreView />}
        {currentView === 'incident-management' && <IncidentManagementView />}
        {currentView === 'operations' && <OperationsView />}
      </main>

      {/* Bottom Industrial Status Bar */}
      <footer className="w-full bg-[#080c12] border-t border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 select-none z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">CORE LOGIC: ONLINE</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>SCHEDULER: 700ms DETERMINISTIC CLOCK</span>
          </div>

          <span className="text-slate-600 hidden md:inline">|</span>

          <div className="hidden md:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>SAFETY INTERLOCKS: ARMED</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeIncidents.length > 0 && (
            <div className="flex items-center gap-1.5 text-red-400 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeIncidents.length} EMERGENCY EVENT{activeIncidents.length > 1 ? 'S' : ''} ACTIVE</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{currentTime || '--:--:--'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
