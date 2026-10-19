import React from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { Terminal, ArrowRight } from 'lucide-react';

export const RecentActivityFeed: React.FC = () => {
  const eventLog = useSentinelStore(state => state.eventLog);
  const setView = useSentinelStore(state => state.setView);

  const recentEvents = eventLog.slice(0, 4);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-950/60 border-red-500/40';
      case 'warning':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="industrial-card rounded-lg p-3 border border-slate-800 space-y-2 select-none">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>OPERATIONAL EVENT LOG</span>
        </div>

        <button
          onClick={() => setView('incident-management')}
          className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>Full History</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1.5">
        {recentEvents.length === 0 ? (
          <div className="text-xs font-mono text-slate-500 py-1">No events recorded.</div>
        ) : (
          recentEvents.map((evt) => (
            <div
              key={evt.id}
              className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/50 border border-slate-900 text-[11px] font-mono"
            >
              <span className="text-slate-500 whitespace-nowrap">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>

              <span className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase border ${getSeverityStyle(evt.severity)}`}>
                {evt.type.replace(/_/g, ' ')}
              </span>

              <span className="text-slate-300 flex-1 truncate">
                {evt.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
