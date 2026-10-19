import React, { useState } from 'react';
import {
  Flame,
  Wind,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Power,
  Users,
  Lock,
  Unlock,
  Radio,
  RotateCcw,
  ShieldCheck,
  ZapOff,
  Sliders,
  Info,
  Clock
} from 'lucide-react';
import { useSentinelStore } from '../../store/useSentinelStore';
import type { ZoneId, ManualInterventionCommandType } from '../../types';

interface EmergencyInterventionPanelProps {
  zoneId?: ZoneId;
  compact?: boolean;
}

export const EmergencyInterventionPanel: React.FC<EmergencyInterventionPanelProps> = ({
  zoneId: propZoneId,
  compact = false
}) => {
  const {
    selectedZoneId,
    selectZone,
    protectionEquipment,
    responseTeams,
    hazardEnv,
    executeManualIntervention,
    recoverZoneEquipment,
    getZoneOperationalState,
    activeHighlightTarget,
    setView,
    activeIncidents,
    requestSafetyInspection
  } = useSentinelStore();

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: number;
  } | null>(null);

  const activeZoneId: ZoneId = propZoneId || selectedZoneId || 'RESEARCH_LAB';
  const opState = getZoneOperationalState(activeZoneId);

  const handleCommand = (cmd: ManualInterventionCommandType) => {
    const res = executeManualIntervention(cmd, activeZoneId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
      timestamp: Date.now()
    });
  };

  const handleRecovery = () => {
    const res = recoverZoneEquipment(activeZoneId);
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
      timestamp: Date.now()
    });
  };

  const getStatusBadge = (state: string, controlMode?: string) => {
    let color = 'bg-zinc-800 text-zinc-300 border-zinc-700';
    if (state === 'OPERATING') color = 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse';
    else if (state === 'COMPLETED') color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    else if (state === 'FAILED') color = 'bg-red-500/20 text-red-300 border-red-500/50';
    else if (state === 'ISOLATED' || state === 'RECOVERY') color = 'bg-purple-500/20 text-purple-300 border-purple-500/50';

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${color}`}>
          {state}
        </span>
        {controlMode === 'MANUAL_OVERRIDE' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
            MANUAL
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-lg overflow-hidden shadow-xl backdrop-blur-md ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header with Zone tabs (if not fixed to a specific zone) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Emergency Operational Intervention
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${opState.dotColor}`} />
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${opState.badgeClass}`}>
            {opState.label}
          </span>
        </div>
      </div>

      {!propZoneId && (
        <div className="grid grid-cols-3 gap-1.5 mb-3 bg-slate-950/60 p-1 rounded border border-slate-800">
          <button
            onClick={() => selectZone('RESEARCH_LAB')}
            className={`py-1 px-2 rounded text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors ${activeZoneId === 'RESEARCH_LAB'
                ? 'bg-rose-950/70 text-rose-300 border border-rose-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>ZN-01 (Fire)</span>
          </button>
          <button
            onClick={() => selectZone('CHEMICAL_LAB')}
            className={`py-1 px-2 rounded text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors ${activeZoneId === 'CHEMICAL_LAB'
                ? 'bg-amber-950/70 text-amber-300 border border-amber-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>ZN-02 (Gas)</span>
          </button>
          <button
            onClick={() => selectZone('RESTRICTED_STORAGE')}
            className={`py-1 px-2 rounded text-[11px] font-mono font-medium flex items-center justify-center gap-1.5 transition-colors ${activeZoneId === 'RESTRICTED_STORAGE'
                ? 'bg-blue-950/70 text-blue-300 border border-blue-700/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>ZN-03 (Sec)</span>
          </button>
        </div>
      )}

      {/* Real-time details strip */}
      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60 mb-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
        <span className="leading-tight">{opState.details}</span>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-3 p-2 rounded border text-xs font-mono flex items-center justify-between transition-all ${feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-600/60 text-rose-300'
            }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Countermeasures per Zone */}
      <div className="space-y-3">
        {activeZoneId === 'RESEARCH_LAB' && (
          <>
            {/* Fire Suppression Item */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Foam/Mist Fire Suppression</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {protectionEquipment.fireSuppression.details}
                  </div>
                </div>
                {getStatusBadge(
                  protectionEquipment.fireSuppression.state,
                  protectionEquipment.fireSuppression.controlMode
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('RETRY_FIRE_SUPPRESSION')}
                  className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-rose-400" />
                  <span>Retry / Force Suppression</span>
                </button>
                <button
                  onClick={() => handleCommand('MANUAL_FIRE_SUPPRESSION_ACTIVATE')}
                  disabled={protectionEquipment.fireSuppression.state === 'OPERATING'}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Manual Discharge</span>
                </button>
              </div>
            </div>

            {/* Fire Brigade Item */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Internal Fire Brigade</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Stage: <span className="text-slate-300 font-semibold">{responseTeams.fireTeam.stage}</span> | ETA: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.fireTeam.stage === 'ON_SITE' || responseTeams.fireTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.fireTeam.etaSeconds}s`} | Progress: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    responseTeams.fireTeam.stage === 'STANDBY' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                  {responseTeams.fireTeam.stage}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-rose-500 h-1.5 transition-all duration-300"
                  style={{ width: `${responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('REQUEST_BACKUP_FIRE_BRIGADE')}
                  disabled={responseTeams.fireTeam.backupRequested || responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED'}
                  className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>{responseTeams.fireTeam.backupRequested ? 'Backup Brigade Deployed' : 'Request Backup Fire Squad'}</span>
                </button>
              </div>
            </div>

            {/* Electrical & Dampers Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Equipment Power Bus</div>
                  <div className="text-[10px] text-slate-400 font-mono mb-2">
                    State: {protectionEquipment.labEquipmentShutdown.state}
                  </div>
                </div>
                {protectionEquipment.labEquipmentShutdown.state === 'OPERATING' ? (
                  <button
                    onClick={() => handleCommand('RESTORE_RESEARCH_POWER')}
                    className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5"
                  >
                    <Power className="w-3 h-3 text-emerald-400" />
                    <span>Restore Power Bus</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('TRIP_RESEARCH_POWER')}
                    className="w-full px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5"
                  >
                    <ZapOff className="w-3 h-3 text-rose-400" />
                    <span>Emergency Power Trip</span>
                  </button>
                )}
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">HVAC Fire Dampers</div>
                  <div className="text-[10px] text-slate-400 font-mono mb-2">
                    State: {protectionEquipment.fireVentIsolation.state}
                  </div>
                </div>
                {protectionEquipment.fireVentIsolation.state === 'OPERATING' ? (
                  <button
                    onClick={() => handleCommand('REOPEN_FIRE_DAMPERS')}
                    className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5"
                  >
                    <Wind className="w-3 h-3 text-cyan-400" />
                    <span>Reopen Dampers</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCommand('SEAL_FIRE_DAMPERS')}
                    className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Seal Dampers</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {activeZoneId === 'CHEMICAL_LAB' && (
          <>
            {/* Chemical Laboratory Dual Recovery Status Distinction */}
            <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex flex-col gap-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                <span>Recovery & Isolation Separation</span>
                <span className="text-[9px] text-cyan-400 font-normal">Section 5 Interlock</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
                  {opState.recoveryLifecycleState === 'RESTORED' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">General Equipment:</span>
                    <span className={opState.recoveryLifecycleState === 'RESTORED' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                      {opState.recoveryLifecycleState === 'RESTORED' ? 'RESTORED (STANDBY)' : opState.recoveryLifecycleState.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
                  {protectionEquipment.gasIsolationValve.state === 'ISOLATED' ? (
                    <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Gas Supply Line:</span>
                    <span className={protectionEquipment.gasIsolationValve.state === 'ISOLATED' ? 'text-cyan-300 font-bold' : 'text-emerald-300 font-bold'}>
                      {protectionEquipment.gasIsolationValve.state === 'ISOLATED' ? 'PRESERVED IN SAFE ISOLATION' : 'REOPENED (STANDBY)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gas Supply Isolation Valve */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Pneumatic Gas Isolation Valve</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {protectionEquipment.gasIsolationValve.details}
                  </div>
                </div>
                {getStatusBadge(
                  protectionEquipment.gasIsolationValve.state,
                  protectionEquipment.gasIsolationValve.controlMode
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('RETRY_GAS_ISOLATION')}
                  className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Retry Gas Line Isolation</span>
                </button>
                <button
                  onClick={() => handleCommand('MANUAL_GAS_ISOLATE')}
                  disabled={protectionEquipment.gasIsolationValve.state === 'OPERATING'}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Manual Isolate Command</span>
                </button>
                {protectionEquipment.gasIsolationValve.state === 'ISOLATED' && (
                  <button
                    onClick={() => handleCommand('RESTORE_GAS_SUPPLY')}
                    disabled={
                      !(opState.recoveryLifecycleState === 'RESTORED' || opState.status === 'NORMAL') ||
                      hazardEnv.gasConcentration > 40 ||
                      hazardEnv.gasSourceActive
                    }
                    title={
                      !(opState.recoveryLifecycleState === 'RESTORED' || opState.status === 'NORMAL')
                        ? 'Requires general equipment recovery completed and incident closed'
                        : hazardEnv.gasConcentration > 40 || hazardEnv.gasSourceActive
                        ? 'Safety Interlock: Cannot reopen while gas concentration > 40 or release active'
                        : 'Reopen chemical gas supply manifold under authorized procedure'
                    }
                    className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    <span>Authorise Gas Supply Reopen</span>
                  </button>
                )}
              </div>
            </div>

            {/* Emergency Scrubber & Extraction Ventilation */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Emergency Extraction Scrubber</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {protectionEquipment.emergencyVentilation.details}
                  </div>
                </div>
                {getStatusBadge(
                  protectionEquipment.emergencyVentilation.state,
                  protectionEquipment.emergencyVentilation.controlMode
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('ACTIVATE_EMERGENCY_VENTILATION')}
                  className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Wind className="w-3 h-3 text-cyan-400" />
                  <span>Activate High-Rate Extraction</span>
                </button>
              </div>
            </div>

            {/* HazMat Response Team */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Hazardous Materials (HazMat) Team</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Stage: <span className="text-slate-300 font-semibold">{responseTeams.hazmatTeam.stage}</span> | ETA: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.hazmatTeam.stage === 'ON_SITE' || responseTeams.hazmatTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.hazmatTeam.etaSeconds}s`} | Progress: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    responseTeams.hazmatTeam.stage === 'STANDBY' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                      'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                  {responseTeams.hazmatTeam.stage}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-1.5 transition-all duration-300"
                  style={{ width: `${responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('REQUEST_HAZMAT_BACKUP')}
                  disabled={responseTeams.hazmatTeam.backupRequested || responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED'}
                  className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>{responseTeams.hazmatTeam.backupRequested ? 'Auxiliary HazMat Units Deployed' : 'Request HazMat Backup Units'}</span>
                </button>
              </div>
            </div>

            {/* Chemical Reactor Power Trip */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">Reactor Synthesis Equipment Bus</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  State: {protectionEquipment.chemicalEquipmentShutdown.state}
                </div>
              </div>
              {protectionEquipment.chemicalEquipmentShutdown.state === 'OPERATING' ? (
                <button
                  onClick={() => handleCommand('RESTORE_CHEMICAL_POWER')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5"
                >
                  <Power className="w-3 h-3 text-emerald-400" />
                  <span>Restore Reactor Power</span>
                </button>
              ) : (
                <button
                  onClick={() => handleCommand('TRIP_CHEMICAL_POWER')}
                  className="px-2.5 py-1 rounded bg-rose-950/50 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 text-xs font-mono font-medium flex items-center gap-1.5"
                >
                  <ZapOff className="w-3 h-3 text-rose-400" />
                  <span>Emergency Reactor Trip</span>
                </button>
              )}
            </div>
          </>
        )}

        {activeZoneId === 'RESTRICTED_STORAGE' && (
          <>
            {/* Access Control Lockdown */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Perimeter Access Control & Lockdown</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {protectionEquipment.accessPointLockdown.details}
                  </div>
                </div>
                {getStatusBadge(
                  protectionEquipment.accessPointLockdown.state,
                  protectionEquipment.accessPointLockdown.controlMode
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('RESTORE_VAULT_ACCESS')}
                  disabled={hazardEnv.intrusionBreachActive}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Unlock className="w-3 h-3 text-emerald-400" />
                  <span>Authorize Egress / Unlock Vault</span>
                </button>
                <button
                  onClick={() => handleCommand('REARM_OPTICAL_PERIMETER')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Radio className="w-3 h-3 text-blue-400" />
                  <span>Re-arm Optical Perimeter</span>
                </button>
              </div>
            </div>

            {/* Tactical Security Response Team */}
            <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Tactical Security Unit</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Stage: <span className="text-slate-300 font-semibold">{responseTeams.securityTeam.stage}</span> | ETA: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.securityTeam.etaSeconds}s`} | Progress: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    responseTeams.securityTeam.stage === 'STANDBY' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}>
                  {responseTeams.securityTeam.stage}
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-1.5 transition-all duration-300"
                  style={{ width: `${responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%` }}
                />
              </div>

              {/* Assessment Progress if underway */}
              {responseTeams.securityTeam.assessmentUnderway && (
                <div className="mb-2 p-2 bg-blue-950/30 rounded border border-blue-800/40">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-blue-300 font-semibold">Area Security Tactical Assessment</span>
                    <span className="text-blue-400">{responseTeams.securityTeam.assessmentProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-1 transition-all duration-300"
                      style={{ width: `${responseTeams.securityTeam.assessmentProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
                <button
                  onClick={() => handleCommand('REQUEST_SECURITY_DISPATCH')}
                  disabled={responseTeams.securityTeam.stage !== 'STANDBY'}
                  className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Radio className="w-3 h-3 text-blue-400" />
                  <span>Dispatch Security Team</span>
                </button>
                <button
                  onClick={() => handleCommand('REQUEST_BACKUP_SECURITY')}
                  disabled={responseTeams.securityTeam.backupRequested || responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED'}
                  className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Users className="w-3 h-3 text-amber-400" />
                  <span>{responseTeams.securityTeam.backupRequested ? 'Backup Tactical Squad En Route' : 'Request Backup Tactical Squad'}</span>
                </button>
                <button
                  id="action-assess-RESTRICTED_STORAGE"
                  onClick={() => handleCommand('START_SECURITY_ASSESSMENT')}
                  disabled={
                    !(responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' || responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED') ||
                    Boolean(responseTeams.securityTeam.assessmentUnderway) ||
                    Boolean(responseTeams.securityTeam.assessmentCompleted)
                  }
                  className={`px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeHighlightTarget === 'action-assess-RESTRICTED_STORAGE' ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-cyan-400" />
                  <span>
                    {responseTeams.securityTeam.assessmentCompleted
                      ? 'Assessment Completed (100%)'
                      : responseTeams.securityTeam.assessmentUnderway
                      ? `Assessment Underway (${responseTeams.securityTeam.assessmentProgress ?? 0}%)`
                      : 'Initiate Area Assessment'}
                  </span>
                </button>
                <button
                  id="action-inspect-RESTRICTED_STORAGE"
                  onClick={() => handleCommand('CONFIRM_AREA_SECURED')}
                  disabled={
                    !(responseTeams.securityTeam.assessmentCompleted || (responseTeams.securityTeam.assessmentProgress ?? 0) >= 100) ||
                    hazardEnv.inspectionStatus?.RESTRICTED_STORAGE === 'PASSED' ||
                    hazardEnv.inspectionStatus?.RESTRICTED_STORAGE === 'IN_PROGRESS'
                  }
                  className={`px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeHighlightTarget === 'action-inspect-RESTRICTED_STORAGE' ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>
                    {hazardEnv.inspectionStatus?.RESTRICTED_STORAGE === 'PASSED'
                      ? 'Area Verified & Secured'
                      : hazardEnv.inspectionStatus?.RESTRICTED_STORAGE === 'IN_PROGRESS'
                      ? `Verifying Area (${hazardEnv.inspectionCountdown?.RESTRICTED_STORAGE ?? 0}s)...`
                      : 'Verify & Secure Area'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controlled Equipment Restoration & Recovery Section */}
      <div id={`section-recovery-${activeZoneId}`} className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <div>
              <div id={`heading-recovery-${activeZoneId}`} tabIndex={-1} className="text-xs font-semibold text-slate-200 outline-none">
                System Restoration & Equipment Recovery
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Authorised sequence: Hazard Contained → Verification Passed → Closure Authorised → Recovery Permitted
              </div>
            </div>
          </div>

          {/* Section 3: Authoritative Recovery Lifecycle Button Behaviour */}
          {opState.recoveryLifecycleState === 'RESTORED' ? (
            <button
              id={`action-recover-${activeZoneId}`}
              disabled={true}
              title="Equipment restoration completed. Protective systems operating in nominal automated standby."
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 cursor-default opacity-90 shadow-sm ${
                activeHighlightTarget === `action-recover-${activeZoneId}` ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 animate-pulse ' : ''
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>EQUIPMENT RESTORED</span>
            </button>
          ) : opState.recoveryLifecycleState === 'RESTORING' ? (
            <button
              id={`action-recover-${activeZoneId}`}
              disabled={true}
              title="Equipment restoration sequence in progress..."
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-purple-950/60 text-purple-300 border border-purple-500/40 cursor-not-allowed opacity-80 ${
                activeHighlightTarget === `action-recover-${activeZoneId}` ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 animate-pulse ' : ''
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span>RESTORING EQUIPMENT</span>
            </button>
          ) : opState.recoveryLifecycleState === 'RECOVERY_FAILED' ? (
            <button
              id={`action-recover-${activeZoneId}`}
              onClick={handleRecovery}
              title={`Recovery failed: ${opState.recoveryUnmetReasons.join('; ')}. Click to retry when safe.`}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-red-900/40 text-red-300 border border-red-500/50 hover:bg-red-900/60 ${
                activeHighlightTarget === `action-recover-${activeZoneId}` ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 animate-pulse ' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>RETRY RESTORATION</span>
            </button>
          ) : opState.recoveryLifecycleState === 'RECOVERY_PERMITTED' ? (
            <button
              id={`action-recover-${activeZoneId}`}
              onClick={handleRecovery}
              disabled={false}
              title="Authorised recovery permitted: Restore protective systems to automated standby"
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-900/40 animate-pulse ${
                activeHighlightTarget === `action-recover-${activeZoneId}` ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 ' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTORE ZONE EQUIPMENT</span>
            </button>
          ) : (
            <button
              id={`action-recover-${activeZoneId}`}
              disabled={true}
              title={`Recovery Blocked: ${opState.recoveryUnmetReasons.join('; ')}`}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60 ${
                activeHighlightTarget === `action-recover-${activeZoneId}` ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 animate-pulse ' : ''
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTORE ZONE EQUIPMENT</span>
            </button>
          )}
        </div>

        {opState.recoveryLifecycleState === 'RESTORED' && (
          <div className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/20 p-2 rounded border border-emerald-900/40 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Equipment restoration completed. Protective systems operating in nominal standby.</span>
          </div>
        )}

        {opState.recoveryLifecycleState === 'RECOVERY_LOCKED' && opState.recoveryUnmetReasons.length > 0 && (
          <div className="text-[10px] font-mono text-amber-400/90 bg-amber-950/30 p-2.5 rounded border border-amber-900/50 flex flex-col gap-2">
            <div className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span className="font-bold text-amber-300">Recovery Interlock Unmet: </span>
                <span>{opState.recoveryUnmetReasons.join(' • ')}</span>
              </div>
            </div>

            {/* Actionable Recovery Interlock Direct Guidance */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-amber-900/40">
              {activeZoneId === 'RESTRICTED_STORAGE' && !responseTeams.securityTeam.assessmentCompleted && (responseTeams.securityTeam.assessmentProgress ?? 0) < 100 && (
                !responseTeams.securityTeam.assessmentUnderway ? (
                  <button
                    onClick={() => handleCommand('START_SECURITY_ASSESSMENT')}
                    disabled={!(responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' || responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED')}
                    className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/60 text-cyan-200 text-[10px] font-mono font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    <ShieldAlert className="w-3 h-3 text-cyan-400" />
                    <span>Initiate Area Assessment</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-cyan-300 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span>Assessment in progress ({responseTeams.securityTeam.assessmentProgress ?? 0}%)</span>
                  </span>
                )
              )}

              {hazardEnv.inspectionStatus?.[activeZoneId] !== 'PASSED' && (
                <button
                  id={`action-inspect-${activeZoneId}`}
                  onClick={() => {
                    if (activeZoneId === 'RESTRICTED_STORAGE') {
                      handleCommand('CONFIRM_AREA_SECURED');
                    } else {
                      requestSafetyInspection(activeZoneId);
                    }
                  }}
                  disabled={
                    activeZoneId === 'RESTRICTED_STORAGE' &&
                    !(responseTeams.securityTeam.assessmentCompleted || (responseTeams.securityTeam.assessmentProgress ?? 0) >= 100)
                  }
                  className={`px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-200 text-[10px] font-mono font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeHighlightTarget === `action-inspect-${activeZoneId}` ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900 animate-pulse' : ''
                  }`}
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>
                    {hazardEnv.inspectionStatus?.[activeZoneId] === 'IN_PROGRESS'
                      ? `Verifying (${hazardEnv.inspectionCountdown?.[activeZoneId] ?? 0}s)...`
                      : 'Proceed to Verification'}
                  </span>
                </button>
              )}

              {activeIncidents.some(i => i.zoneId === activeZoneId && !i.closureAuthorizedAt) && hazardEnv.inspectionStatus?.[activeZoneId] === 'PASSED' && (
                <button
                  onClick={() => setView('incident-management')}
                  className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/60 text-cyan-200 text-[10px] font-mono font-semibold flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Proceed to Emergency Closure</span>
                </button>
              )}

              {activeIncidents.some(i => i.zoneId === activeZoneId && i.closureAuthorizedAt && i.state === 'CONDITION_CLEARED') && (
                <button
                  onClick={() => setView('incident-management')}
                  className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/60 text-amber-200 text-[10px] font-mono font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Proceed to Alarm Reset</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
