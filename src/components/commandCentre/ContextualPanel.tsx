import React from 'react';
import { ZONES, CATEGORY_PRIORITY, isIncidentAcknowledged } from '../../types';
import type { EquipmentOperatingState, ContainmentStatus, TeamDispatchStage } from '../../types';
import { useSentinelStore } from '../../store/useSentinelStore';
import { validateResetEligibility } from '../../core/monitoringEngine';
import {
  Thermometer,
  CloudFog,
  Gauge,
  ShieldAlert,
  Activity,
  Sliders,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Info,
  Radio,
  X,
  Shield,
  Truck,
  Wrench,
  AlertOctagon
} from 'lucide-react';
import { EmergencyInterventionPanel } from '../common/EmergencyInterventionPanel';

export const ContextualPanel: React.FC = () => {
  const selectedZoneId = useSentinelStore(state => state.selectedZoneId) || 'RESEARCH_LAB';
  const selectedIncidentId = useSentinelStore(state => state.selectedIncidentId);
  const selectIncident = useSentinelStore(state => state.selectIncident);
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const telemetry = useSentinelStore(state => state.telemetry);
  const automaticResponses = useSentinelStore(state => state.automaticResponses);
  const protectionEquipment = useSentinelStore(state => state.protectionEquipment);
  const responseTeams = useSentinelStore(state => state.responseTeams);
  const hazardEnv = useSentinelStore(state => state.hazardEnv);
  const failureConfig = useSentinelStore(state => state.failureConfig);
  const getZoneStatus = useSentinelStore(state => state.getZoneStatus);
  const setView = useSentinelStore(state => state.setView);
  const acknowledgeIncident = useSentinelStore(state => state.acknowledgeIncident);
  const resetIncident = useSentinelStore(state => state.resetIncident);

  const zoneInfo = ZONES[selectedZoneId];
  const zoneStatus = getZoneStatus(selectedZoneId);
  const zoneIncidents = activeIncidents.filter(inc => inc.zoneId === selectedZoneId);

  // If an incident is selected, view incident details
  const selectedIncident = activeIncidents.find(inc => inc.id === selectedIncidentId);

  const renderEquipmentStateBadge = (state: EquipmentOperatingState) => {
    switch (state) {
      case 'OPERATING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            OPERATING
          </span>
        );
      case 'ACTIVATION_REQUESTED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            CMD ISSUED
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/60 flex items-center gap-1 animate-pulse">
            <AlertOctagon className="w-3 h-3 text-red-400" />
            FAILED
          </span>
        );
      case 'ISOLATED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
            ISOLATED
          </span>
        );
      case 'STANDBY':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            STANDBY
          </span>
        );
    }
  };

  const renderContainmentBadge = (status: ContainmentStatus) => {
    switch (status) {
      case 'UNCONTROLLED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-500/60 animate-pulse">
            UNCONTROLLED
          </span>
        );
      case 'MITIGATING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/60">
            MITIGATING
          </span>
        );
      case 'CONTAINED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60">
            CONTAINED
          </span>
        );
      case 'SAFE':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            NOMINAL / SAFE
          </span>
        );
    }
  };

  const renderTeamStageBadge = (stage: TeamDispatchStage) => {
    switch (stage) {
      case 'NOTIFICATION_INITIATED':
      case 'DISPATCH_CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/50">
            {stage.replace('_', ' ')}
          </span>
        );
      case 'EN_ROUTE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50 animate-pulse">
            EN ROUTE
          </span>
        );
      case 'ON_SITE':
      case 'INTERVENTION_UNDERWAY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse">
            {stage.replace('_', ' ')}
          </span>
        );
      case 'RESPONSE_COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50">
            COMPLETED
          </span>
        );
      case 'STANDBY':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            STANDBY
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-3 h-full overflow-y-auto pr-1 select-none">
      {selectedIncident ? (
        /* ================= INCIDENT INSPECTION VIEW ================= */
        <div className="industrial-card rounded-lg p-4 border border-slate-700/80 flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                PRIORITY {selectedIncident.priority}
              </span>
              <span className="font-mono text-sm font-bold text-slate-100">
                {selectedIncident.id}
              </span>
            </div>

            <button
              onClick={() => selectIncident(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-mono"
              title="Return to Zone Telemetry"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Emergency Category</div>
            <div className="font-mono text-sm font-semibold text-slate-100 mt-0.5">
              {CATEGORY_PRIORITY[selectedIncident.category].title}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-1">
              Zone: <strong className="text-cyan-300">{ZONES[selectedIncident.zoneId].name}</strong> ({ZONES[selectedIncident.zoneId].code})
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed">
            {selectedIncident.details}
          </div>

          {/* Alarm Status & Reset Eligibility */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Alarm Lifecycle State:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${selectedIncident.state === 'ACTIVE_UNACKNOWLEDGED' ? 'bg-red-950 text-red-300 border border-red-500/40 animate-pulse' :
                  selectedIncident.state === 'ACTIVE_ACKNOWLEDGED' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                    selectedIncident.state === 'CONDITION_CLEARED' ? 'bg-blue-950 text-blue-300 border border-blue-500/40' :
                      'bg-emerald-950 text-emerald-300'
                }`}>
                {selectedIncident.state.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Detected At:</span>
              <span className="text-slate-200">{new Date(selectedIncident.detectedAt).toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Acknowledged:</span>
              <span className="text-slate-200">
                {isIncidentAcknowledged(selectedIncident)
                  ? new Date(selectedIncident.acknowledgedAt!).toLocaleTimeString()
                  : 'Awaiting Operator'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Sensor Condition Active:</span>
              <span className={selectedIncident.conditionActive ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                {selectedIncident.conditionActive ? 'ACTIVE (ABOVE THRESHOLD)' : 'CLEARED (SAFE LEVEL)'}
              </span>
            </div>
          </div>

          {/* Automated Mitigation & Response Team Dispatch Panel for Incident */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Simulated Dispatch Status</span>
              </span>
              <span className="text-[10px] text-slate-500">CLOSED-LOOP</span>
            </div>

            {selectedIncident.category === 'FIRE' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{responseTeams.fireTeam.name}:</span>
                  {renderTeamStageBadge(responseTeams.fireTeam.stage)}
                </div>
                {responseTeams.fireTeam.stage !== 'STANDBY' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%</span>
                      <span>ETA: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.fireTeam.stage === 'ON_SITE' || responseTeams.fireTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.fireTeam.etaSeconds}s`}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500 h-full transition-all duration-300"
                        style={{ width: `${responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Foam Mist Suppression:</span>
                  {renderEquipmentStateBadge(protectionEquipment.fireSuppression.state)}
                </div>
              </div>
            )}

            {selectedIncident.category === 'GAS_LEAKAGE' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{responseTeams.hazmatTeam.name}:</span>
                  {renderTeamStageBadge(responseTeams.hazmatTeam.stage)}
                </div>
                {responseTeams.hazmatTeam.stage !== 'STANDBY' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%</span>
                      <span>ETA: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.hazmatTeam.stage === 'ON_SITE' || responseTeams.hazmatTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.hazmatTeam.etaSeconds}s`}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-yellow-500 h-full transition-all duration-300"
                        style={{ width: `${responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Isolation Solenoid:</span>
                  {renderEquipmentStateBadge(protectionEquipment.gasIsolationValve.state)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Exhaust Scrubber:</span>
                  {renderEquipmentStateBadge(protectionEquipment.emergencyVentilation.state)}
                </div>
              </div>
            )}

            {selectedIncident.category === 'INTRUSION' && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{responseTeams.securityTeam.name}:</span>
                  {renderTeamStageBadge(responseTeams.securityTeam.stage)}
                </div>
                {responseTeams.securityTeam.stage !== 'STANDBY' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Progress: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%</span>
                      <span>ETA: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.securityTeam.etaSeconds}s`}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full transition-all duration-300"
                        style={{ width: `${responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Vault Lockdown:</span>
                  {renderEquipmentStateBadge(protectionEquipment.accessPointLockdown.state)}
                </div>
              </div>
            )}

            {selectedIncident.category === 'MANUAL_EMERGENCY' && (
              <div className="space-y-1.5 text-xs font-mono">
                <div className="text-slate-300 font-semibold">General Emergency Protocol Active</div>
                <div className="text-[11px] text-slate-400">
                  Station tripped in {ZONES[selectedIncident.zoneId].name}. Fire and security personnel notified.
                </div>
              </div>
            )}
          </div>

          {/* Reset Eligibility Verification Box */}
          {(() => {
            const validation = validateResetEligibility(selectedIncident);
            return (
              <div className={`p-2.5 rounded border text-xs font-mono ${validation.canReset
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}>
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Reset Eligibility: {validation.canReset ? 'ELIGIBLE' : 'INELIGIBLE'}</span>
                </div>
                {!validation.canReset && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/80">
                    {validation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            {!isIncidentAcknowledged(selectedIncident) && (
              <button
                onClick={() => acknowledgeIncident(selectedIncident.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ACKNOWLEDGE ALARM</span>
              </button>
            )}

            <button
              onClick={() => {
                const res = resetIncident(selectedIncident.id);
                if (!res.success) {
                  alert(res.message);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold border border-slate-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Reset Alarm</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= ZONE CONTEXTUAL MONITORING VIEW ================= */
        <div className="industrial-card rounded-lg p-4 border border-slate-700/80 flex flex-col gap-4">
          {/* Zone Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">{zoneInfo.code}</span>
                <span className="text-slate-600">/</span>
                <h3 className="font-mono text-base font-bold text-slate-100">{zoneInfo.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                {zoneInfo.description}
              </p>
            </div>

            <div className={`px-2 py-1 rounded text-xs font-mono font-bold uppercase border ${zoneStatus === 'critical' ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse' :
                zoneStatus === 'acknowledged' ? 'bg-purple-950/80 border-purple-500/80 text-purple-300' :
                  zoneStatus === 'warning' ? 'bg-amber-950/80 border-amber-500/80 text-amber-300' :
                    zoneStatus === 'fault' ? 'bg-orange-950/80 border-orange-500/80 text-orange-300' :
                      'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
              }`}>
              {zoneStatus}
            </div>
          </div>

          {/* Active Alarms in this zone */}
          {zoneIncidents.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold tracking-wider text-red-400 uppercase">
                Active Zone Incidents ({zoneIncidents.length})
              </span>
              {zoneIncidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => selectIncident(inc.id)}
                  className="w-full p-2 rounded bg-red-950/40 hover:bg-red-900/40 border border-red-500/50 flex items-center justify-between text-left text-xs font-mono transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <div>
                      <div className="font-semibold text-slate-100">{inc.id} • {CATEGORY_PRIORITY[inc.category].title}</div>
                      <div className="text-[10px] text-red-300">State: {inc.state.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-400 underline">Inspect</span>
                </button>
              ))}
            </div>
          )}

          {/* Hazard Containment Status for this Zone */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hazard Containment:</span>
            </span>
            {selectedZoneId === 'RESEARCH_LAB' && renderContainmentBadge(hazardEnv.containmentStatus.fire)}
            {selectedZoneId === 'CHEMICAL_LAB' && renderContainmentBadge(hazardEnv.containmentStatus.gas)}
            {selectedZoneId === 'RESTRICTED_STORAGE' && renderContainmentBadge(hazardEnv.containmentStatus.intrusion)}
            {selectedZoneId === 'CONTROL_ROOM' && renderContainmentBadge(hazardEnv.containmentStatus.manual)}
          </div>

          {/* Sensor Monitoring Readings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sensor Telemetry</span>
              </span>
              <span className="text-[10px] text-slate-500">REAL-TIME</span>
            </div>

            {selectedZoneId === 'RESEARCH_LAB' && (
              <div className="space-y-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                {/* Temperature Sensor T-01 */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                      <span>Thermal Probe T-01:</span>
                    </span>
                    <span className={`font-bold ${telemetry.temperature >= 60 ? 'text-red-400' : 'text-slate-100'}`}>
                      {telemetry.temperature}°C
                    </span>
                  </div>

                  {/* Temperature Bar */}
                  <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${telemetry.temperature >= 60 ? 'bg-red-500' : telemetry.temperature >= 45 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                      style={{ width: `${Math.min(100, (telemetry.temperature / 120) * 100)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-red-400" title="Threshold: 60°C" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0°C</span>
                    <span className="text-red-400 font-semibold">Threshold: 60°C</span>
                    <span>120°C</span>
                  </div>
                </div>

                {/* Smoke Detector S-01 */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <CloudFog className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ionization Smoke S-01:</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${telemetry.smokeDetected
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                    {telemetry.smokeDetected ? 'SMOKE DETECTED' : 'CLEAR'}
                  </span>
                </div>
              </div>
            )}

            {selectedZoneId === 'CHEMICAL_LAB' && (
              <div className="space-y-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                {/* Gas Concentration G-01 */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Gauge className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Catalytic Gas Sensor G-01:</span>
                    </span>
                    <span className={`font-bold ${telemetry.gasConcentration >= 100 ? 'text-red-400' : 'text-slate-100'}`}>
                      {telemetry.gasConcentration} / 255
                    </span>
                  </div>

                  {/* Gas Concentration Bar */}
                  <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${telemetry.gasConcentration >= 100 ? 'bg-red-500' : telemetry.gasConcentration >= 75 ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                      style={{ width: `${Math.min(100, (telemetry.gasConcentration / 255) * 100)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 left-[39.2%] w-0.5 bg-yellow-400" title="Alarm Threshold: 100" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>0</span>
                    <span className="text-yellow-400 font-semibold">Alarm Threshold: 100</span>
                    <span>255</span>
                  </div>
                </div>
              </div>
            )}

            {selectedZoneId === 'RESTRICTED_STORAGE' && (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    <span>Perimeter Laser I-01:</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${telemetry.intrusionDetected
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                    {telemetry.intrusionDetected ? 'BREACH CONFIRMED' : 'SECURE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Multi-beam optical perimeter barrier active across vault access corridor.
                </p>
              </div>
            )}

            {selectedZoneId === 'CONTROL_ROOM' && (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Emergency Pedestal M-01:</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${telemetry.manualEmergencyActive
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                    {telemetry.manualEmergencyActive ? 'TRIPPED' : 'ARMED / NOMINAL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  Master emergency trip station initiates facility-wide emergency procedure.
                </p>
              </div>
            )}
          </div>

          {/* Contextual Protective Equipment & Safety Interlocks */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zone Protection Equipment</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">OPERATING STATE</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              {selectedZoneId === 'RESEARCH_LAB' && (
                <>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.fireSuppression.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.fireSuppression.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.fireSuppression.state)}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.labEquipmentShutdown.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.labEquipmentShutdown.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.labEquipmentShutdown.state)}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.fireVentIsolation.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.fireVentIsolation.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.fireVentIsolation.state)}
                  </div>

                  {failureConfig.fireSuppressionFailed && (
                    <div className="p-2 rounded bg-red-950/60 border border-red-500/70 text-[11px] text-red-200 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Suppression pump failure active. Countermeasure is inhibited.</span>
                    </div>
                  )}
                </>
              )}

              {selectedZoneId === 'CHEMICAL_LAB' && (
                <>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.gasIsolationValve.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.gasIsolationValve.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.gasIsolationValve.state)}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.emergencyVentilation.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.emergencyVentilation.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.emergencyVentilation.state)}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.chemicalEquipmentShutdown.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.chemicalEquipmentShutdown.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.chemicalEquipmentShutdown.state)}
                  </div>

                  {failureConfig.gasIsolationFailed && (
                    <div className="p-2 rounded bg-red-950/60 border border-red-500/70 text-[11px] text-red-200 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Gas isolation valve jammed open. Continuous release in progress.</span>
                    </div>
                  )}
                </>
              )}

              {selectedZoneId === 'RESTRICTED_STORAGE' && (
                <>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">{protectionEquipment.accessPointLockdown.name}</div>
                      <div className="text-[10px] text-slate-400">{protectionEquipment.accessPointLockdown.details}</div>
                    </div>
                    {renderEquipmentStateBadge(protectionEquipment.accessPointLockdown.state)}
                  </div>

                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Emergency egress interlock: Life-safety evacuation routes maintain non-obstructed outward passage at all times.</span>
                  </div>
                </>
              )}

              {selectedZoneId === 'CONTROL_ROOM' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-semibold">Facility Evacuation Sirens</div>
                      <div className="text-[10px] text-slate-400">Master audio-visual notification</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${automaticResponses.evacuationWarning
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                      {automaticResponses.evacuationWarning ? 'ACTIVE' : 'STANDBY'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    Centralized command monitoring console with supervisory override capabilities.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contextual Response Team Dispatch Status */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulated Emergency Teams</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">SIMULATED</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs font-mono">
              {selectedZoneId === 'RESEARCH_LAB' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">{responseTeams.fireTeam.name}</span>
                    {renderTeamStageBadge(responseTeams.fireTeam.stage)}
                  </div>
                  <div className="text-[11px] text-slate-400">{responseTeams.fireTeam.details}</div>
                  {responseTeams.fireTeam.stage !== 'STANDBY' && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Transit Progress: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%</span>
                        <span>ETA: {responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.fireTeam.stage === 'ON_SITE' || responseTeams.fireTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.fireTeam.etaSeconds}s`}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-red-500 h-full transition-all duration-300"
                          style={{ width: `${responseTeams.fireTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.fireTeam.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedZoneId === 'CHEMICAL_LAB' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">{responseTeams.hazmatTeam.name}</span>
                    {renderTeamStageBadge(responseTeams.hazmatTeam.stage)}
                  </div>
                  <div className="text-[11px] text-slate-400">{responseTeams.hazmatTeam.details}</div>
                  {responseTeams.hazmatTeam.stage !== 'STANDBY' && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Transit Progress: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%</span>
                        <span>ETA: {responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.hazmatTeam.stage === 'ON_SITE' || responseTeams.hazmatTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.hazmatTeam.etaSeconds}s`}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-yellow-500 h-full transition-all duration-300"
                          style={{ width: `${responseTeams.hazmatTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.hazmatTeam.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedZoneId === 'RESTRICTED_STORAGE' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">{responseTeams.securityTeam.name}</span>
                    {renderTeamStageBadge(responseTeams.securityTeam.stage)}
                  </div>
                  <div className="text-[11px] text-slate-400">{responseTeams.securityTeam.details}</div>
                  {responseTeams.securityTeam.stage !== 'STANDBY' && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Patrol Progress: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%</span>
                        <span>ETA: {responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' || responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' ? '0s' : `${responseTeams.securityTeam.etaSeconds}s`}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full transition-all duration-300"
                          style={{ width: `${responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED' ? 100 : responseTeams.securityTeam.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedZoneId === 'CONTROL_ROOM' && (
                <div className="space-y-1">
                  <div className="text-slate-300 font-semibold">Dispatched Units Overview</div>
                  <div className="text-[11px] text-slate-400">
                    Fire Unit: {responseTeams.fireTeam.stage.replace('_', ' ')} • HazMat Unit: {responseTeams.hazmatTeam.stage.replace('_', ' ')} • Security: {responseTeams.securityTeam.stage.replace('_', ' ')}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 italic">
                * Simulated response dispatch — educational simulation only. No external services contacted.
              </div>
            </div>
          </div>

          {/* Emergency Countermeasures & Recovery Panel */}
          <div id={`section-intervention-${selectedZoneId}`} className="mt-2">
            <EmergencyInterventionPanel zoneId={selectedZoneId} compact={true} />
          </div>

          {/* Quick Route to Operations */}
          <button
            onClick={() => setView('operations')}
            className="mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/80 text-cyan-300 font-mono text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Operational Controls for this Zone</span>
          </button>
        </div>
      )}
    </aside>
  );
};
