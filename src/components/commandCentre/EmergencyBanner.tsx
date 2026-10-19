import React from 'react';
import {
  Flame,
  Wind,
  ShieldAlert,
  Hand,
  CheckCircle2,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { CATEGORY_PRIORITY, ZONES, isIncidentAcknowledged } from '../../types';
import type { EmergencyCategory } from '../../types';


export const EmergencyBanner: React.FC = () => {
  const highestPriority = useSentinelStore(state => state.getHighestPriorityIncident());
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const acknowledgeIncident = useSentinelStore(state => state.acknowledgeIncident);
  const selectZone = useSentinelStore(state => state.selectZone);
  const setView = useSentinelStore(state => state.setView);
  const selectIncident = useSentinelStore(state => state.selectIncident);

  if (!highestPriority) return null;

  const priorityConfig = CATEGORY_PRIORITY[highestPriority.category];
  const zoneConfig = ZONES[highestPriority.zoneId];

  const getCategoryIcon = (category: EmergencyCategory) => {
    switch (category) {
      case 'FIRE':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'GAS_LEAKAGE':
        return <Wind className="w-5 h-5 text-yellow-400" />;
      case 'INTRUSION':
        return <ShieldAlert className="w-5 h-5 text-purple-400" />;
      case 'MANUAL_EMERGENCY':
        return <Hand className="w-5 h-5 text-red-400" />;
    }
  };

  const isUnacknowledged = !isIncidentAcknowledged(highestPriority);
  const isConditionCleared = !highestPriority.conditionActive || highestPriority.state === 'CONDITION_CLEARED';

  return (
    <div className={`w-full border-b transition-all duration-300 ${
      isUnacknowledged
        ? 'bg-gradient-to-r from-red-950/90 via-red-900/60 to-slate-900/90 border-red-500/80 shadow-lg shadow-red-950/50'
        : 'bg-gradient-to-r from-slate-900/90 via-purple-950/40 to-slate-900/90 border-purple-500/60'
    } px-4 py-2.5 z-20`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Priority Badge & Incident Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center p-1.5 rounded bg-black/40 border ${
              isUnacknowledged ? 'border-red-500/80 animate-pulse' : 'border-purple-500/50'
            }`}>
              {getCategoryIcon(highestPriority.category)}
            </span>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider bg-red-500 text-white shadow-sm">
                  PRIORITY {highestPriority.priority}
                </span>
                <span className="font-mono text-sm font-bold text-white tracking-wide">
                  {priorityConfig.title}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  in <strong className="text-cyan-300">{zoneConfig.name}</strong> ({zoneConfig.code})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl font-mono">
                {highestPriority.details}
              </p>
            </div>
          </div>
        </div>

        {/* Center: State & Multiple Incidents Notification */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Detected: {new Date(highestPriority.detectedAt).toLocaleTimeString()}</span>
          </div>

          {activeIncidents.length > 1 && (
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
              +{activeIncidents.length - 1} OTHER ACTIVE INCIDENT{activeIncidents.length > 2 ? 'S' : ''}
            </span>
          )}

          {isConditionCleared && (
            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
              Condition Cleared — Reset Required
            </span>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {isUnacknowledged ? (
            <button
              onClick={() => acknowledgeIncident(highestPriority.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold tracking-wider shadow-md shadow-red-700/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ACKNOWLEDGE ALARM</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-900/60 border border-purple-500/50 text-purple-200 font-mono text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
              <span>ACKNOWLEDGED</span>
            </span>
          )}

          <button
            onClick={() => {
              selectZone(highestPriority.zoneId);
              selectIncident(highestPriority.id);
              setView('incident-management');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono transition-colors"
          >
            <span>Incident Details</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
