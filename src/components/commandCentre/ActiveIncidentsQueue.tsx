import React from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { CATEGORY_PRIORITY, ZONES, isIncidentAcknowledged } from '../../types';
import type { EmergencyCategory } from '../../types';
import {
  Flame,
  Wind,
  ShieldAlert,
  Hand,
  ShieldCheck,
  ChevronRight,
  Clock
} from 'lucide-react';


export const ActiveIncidentsQueue: React.FC = () => {
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const selectedIncidentId = useSentinelStore(state => state.selectedIncidentId);
  const selectIncident = useSentinelStore(state => state.selectIncident);
  const selectZone = useSentinelStore(state => state.selectZone);
  const acknowledgeIncident = useSentinelStore(state => state.acknowledgeIncident);
  const resetIncident = useSentinelStore(state => state.resetIncident);

  const getCategoryIcon = (cat: EmergencyCategory) => {
    switch (cat) {
      case 'FIRE':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'GAS_LEAKAGE':
        return <Wind className="w-4 h-4 text-yellow-400" />;
      case 'INTRUSION':
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      case 'MANUAL_EMERGENCY':
        return <Hand className="w-4 h-4 text-red-400" />;
    }
  };

  if (activeIncidents.length === 0) {
    return (
      <div className="industrial-card rounded-lg p-3.5 border border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
                ACTIVE INCIDENT QUEUE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                0 ACTIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              All sensors and safety interlocks operating within baseline parameters.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-mono text-slate-500">MONITORING ENGINE</div>
          <div className="text-xs font-mono text-emerald-400 font-semibold">ALL CLEAR</div>
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-card rounded-lg p-3.5 border border-slate-700/80 space-y-2.5 select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
            ACTIVE INCIDENTS QUEUE
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/50 animate-pulse">
            {activeIncidents.length} RETAINED
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">SORTED BY PRIORITY</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {activeIncidents.map((incident) => {
          const catConfig = CATEGORY_PRIORITY[incident.category];
          const zone = ZONES[incident.zoneId];
          const isSelected = selectedIncidentId === incident.id;
          const isAck = isIncidentAcknowledged(incident);
          const isUnack = !isAck;
          const isCleared = incident.state === 'CONDITION_CLEARED' || !incident.conditionActive;

          return (
            <div
              key={incident.id}
              onClick={() => {
                selectZone(incident.zoneId);
                selectIncident(incident.id);
              }}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'ring-1 ring-cyan-400 bg-slate-900 border-cyan-500/50 shadow-md'
                  : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500 text-white">
                    P{incident.priority}
                  </span>
                  <span className="text-slate-300 flex items-center gap-1">
                    {getCategoryIcon(incident.category)}
                    {catConfig.title}
                  </span>
                </div>

                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                  isUnack ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse' :
                  isCleared ? 'bg-blue-950 text-blue-300 border border-blue-500/40' :
                  'bg-purple-950 text-purple-300 border border-purple-500/40'
                }`}>
                  {isUnack ? 'UNACKNOWLEDGED' :
                   isCleared ? 'CLEARED (RESET REQ)' : 'ACKNOWLEDGED'}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400 mb-2 truncate">
                Zone: <strong className="text-cyan-300">{zone.name}</strong> • ID: {incident.id}
              </div>

              {/* Action Buttons inside Card */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-xs font-mono">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(incident.detectedAt).toLocaleTimeString()}
                </span>

                <div className="flex items-center gap-1.5">
                  {isUnack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledgeIncident(incident.id);
                      }}
                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold tracking-wider transition-colors"
                    >
                      ACK
                    </button>
                  )}

                  {isCleared && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const res = resetIncident(incident.id);
                        if (!res.success) alert(res.message);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 text-[10px] font-semibold transition-colors"
                    >
                      RESET
                    </button>
                  )}

                  <span className="text-slate-400 hover:text-cyan-400 text-[10px] flex items-center">
                    Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
