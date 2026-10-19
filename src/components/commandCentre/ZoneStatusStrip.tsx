import React from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { ZONES } from '../../types';
import type { ZoneId } from '../../types';
import { Flame, Wind, ShieldAlert, Cpu } from 'lucide-react';


export const ZoneStatusStrip: React.FC = () => {
  const selectedZoneId = useSentinelStore(state => state.selectedZoneId);
  const selectZone = useSentinelStore(state => state.selectZone);
  const telemetry = useSentinelStore(state => state.telemetry);

  const zonesList: ZoneId[] = ['RESEARCH_LAB', 'CHEMICAL_LAB', 'RESTRICTED_STORAGE', 'CONTROL_ROOM'];

  const getPrimaryMetric = (zoneId: ZoneId) => {
    switch (zoneId) {
      case 'RESEARCH_LAB':
        return `${telemetry.temperature}°C • Smoke: ${telemetry.smokeDetected ? 'DETECTED' : 'CLEAR'}`;
      case 'CHEMICAL_LAB':
        return `Gas: ${telemetry.gasConcentration}/255 ${telemetry.gasConcentration >= 100 ? '(ALARM)' : '(NOMINAL)'}`;
      case 'RESTRICTED_STORAGE':
        return `Perimeter: ${telemetry.intrusionDetected ? 'BREACH DETECTED' : 'SECURE'}`;
      case 'CONTROL_ROOM':
        return `Emergency Station: ${telemetry.manualEmergencyActive ? 'TRIPPED' : 'ARMED'}`;
    }
  };

  const getZoneIcon = (zoneId: ZoneId) => {
    switch (zoneId) {
      case 'RESEARCH_LAB':
        return <Flame className="w-3.5 h-3.5" />;
      case 'CHEMICAL_LAB':
        return <Wind className="w-3.5 h-3.5" />;
      case 'RESTRICTED_STORAGE':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'CONTROL_ROOM':
        return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full select-none">
      {zonesList.map((zid) => {
        const zone = ZONES[zid];
        const opState = useSentinelStore.getState().getZoneOperationalState(zid);
        const isSelected = selectedZoneId === zid;

        let statusBorder = 'border-slate-800/80 hover:border-slate-700';
        let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        let statusLabel = opState.label;
        let dotColor = 'bg-emerald-400';

        if (opState.status === 'ACTIVE_HAZARD') {
          statusBorder = 'border-red-500/80 bg-red-950/20';
          statusBadge = 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse';
          statusLabel = 'CRITICAL';
          dotColor = 'bg-red-400';
        } else if (opState.status === 'RESPONSE_IN_PROGRESS') {
          statusBorder = 'border-amber-500/60 bg-amber-950/20';
          statusBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
          statusLabel = 'RESPONDING';
          dotColor = 'bg-amber-400';
        } else if (opState.status === 'HAZARD_CONTAINED' || opState.status === 'AWAITING_SAFETY_VERIFICATION') {
          statusBorder = 'border-amber-500/60 bg-amber-950/20';
          statusBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
          statusLabel = 'CONTAINED';
          dotColor = 'bg-amber-400';
        } else if (opState.status === 'VERIFIED_SAFE_AWAITING_CLOSURE') {
          statusBorder = 'border-cyan-500/60 bg-cyan-950/20';
          statusBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
          statusLabel = 'VERIFIED';
          dotColor = 'bg-cyan-400';
        } else if (opState.status === 'INCIDENT_RESOLVED_RECOVERY_PENDING') {
          statusBorder = 'border-purple-500/60 bg-purple-950/20';
          statusBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
          statusLabel = 'RECOVERY REQ';
          dotColor = 'bg-purple-400';
        } else if (opState.status === 'RESET_REQUIRED') {
          statusBorder = 'border-blue-500/60 bg-blue-950/20';
          statusBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
          statusLabel = 'RESET REQ';
          dotColor = 'bg-blue-400';
        } else if (opState.status === 'ALARM_RETAINED') {
          statusBorder = 'border-purple-500/60 bg-purple-950/20';
          statusBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
          statusLabel = 'ALARM RETAINED';
          dotColor = 'bg-purple-400';
        } else if (opState.status === 'EQUIPMENT_RECOVERY_REQUIRED') {
          statusBorder = 'border-purple-500/60 bg-purple-950/20';
          statusBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
          statusLabel = 'RECOVERY REQ';
          dotColor = 'bg-purple-400';
        } else if (opState.status === 'DIAGNOSTIC_FAULT') {
          statusBorder = 'border-yellow-500/60 bg-yellow-950/20';
          statusBadge = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
          statusLabel = 'FAULT';
          dotColor = 'bg-yellow-400';
        }

        return (
          <button
            key={zid}
            onClick={() => selectZone(zid)}
            className={`p-2.5 rounded-lg border text-left transition-all ${statusBorder} ${
              isSelected
                ? 'ring-1 ring-cyan-400 bg-slate-900/90 shadow-md shadow-cyan-950/30'
                : 'bg-slate-900/60 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-200">
                <span className="text-cyan-400">{getZoneIcon(zid)}</span>
                <span className="text-slate-400">{zone.code}</span>
                <span className="truncate max-w-[120px]">{zone.name}</span>
              </div>

              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-wide border ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="truncate">{getPrimaryMetric(zid)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
