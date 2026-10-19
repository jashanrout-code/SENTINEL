import React, { useState } from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { CATEGORY_PRIORITY, ZONES, isIncidentAcknowledged } from '../../types';
import type { EmergencyCategory } from '../../types';

import { validateResetEligibility } from '../../core/monitoringEngine';
import {
  AlertTriangle,
  Flame,
  Wind,
  ShieldAlert,
  Hand,
  CheckCircle2,
  RotateCcw,
  Clock,
  History,
  Filter,
  Search,
  ShieldCheck,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { EmergencyInterventionPanel } from '../common/EmergencyInterventionPanel';

export const IncidentManagementView: React.FC = () => {
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const resolvedIncidents = useSentinelStore(state => state.resolvedIncidents);
  const eventLog = useSentinelStore(state => state.eventLog);
  const acknowledgeIncident = useSentinelStore(state => state.acknowledgeIncident);
  const resetIncident = useSentinelStore(state => state.resetIncident);
  const getClosureValidation = useSentinelStore(state => state.getClosureValidation);
  const authorizeIncidentClosure = useSentinelStore(state => state.authorizeIncidentClosure);
  const requestSafetyInspection = useSentinelStore(state => state.requestSafetyInspection);
  const hazardEnv = useSentinelStore(state => state.hazardEnv);
  const telemetry = useSentinelStore(state => state.telemetry);
  const activeHighlightTarget = useSentinelStore(state => state.activeHighlightTarget);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'events'>('active');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleReset = (incidentId: string) => {
    const result = resetIncident(incidentId);
    setFeedbackMessage({
      text: result.message,
      isError: !result.success,
    });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 5000);
  };

  const handleClosure = (incidentId: string) => {
    const result = authorizeIncidentClosure(incidentId);
    setFeedbackMessage({
      text: result.message,
      isError: !result.success,
    });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 6000);
  };

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

  // Filter events
  const filteredEvents = eventLog.filter((evt) => {
    const matchesSeverity = severityFilter === 'ALL' || evt.severity.toUpperCase() === severityFilter;
    const matchesSearch = searchQuery === '' ||
      evt.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.zoneId && evt.zoneId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const unackCount = activeIncidents.filter(i => !isIncidentAcknowledged(i)).length;
  const resetReqCount = activeIncidents.filter(i => i.state === 'CONDITION_CLEARED').length;

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 max-w-[1720px] mx-auto w-full overflow-y-auto select-none">
      {/* View Header with Key Industrial Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="font-mono text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>INCIDENT MANAGEMENT & ALARM AUDIT</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Real-time emergency tracking, alarm lifecycle acknowledgement, safety interlocks, and event auditing.
          </p>
        </div>

        {/* Quick Metrics Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Active Incidents:</span>
            <span className={`font-bold ${activeIncidents.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {activeIncidents.length}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Unacknowledged:</span>
            <span className={`font-bold ${unackCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
              {unackCount}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Reset Required:</span>
            <span className={`font-bold ${resetReqCount > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
              {resetReqCount}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Resolved Archive:</span>
            <span className="font-bold text-slate-200">
              {resolvedIncidents.length}
            </span>
          </div>
        </div>
      </div>

      {/* Operator Feedback Banner for Reset/Acknowledge Operations */}
      {feedbackMessage && (
        <div className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between transition-all ${feedbackMessage.isError
          ? 'bg-red-950/80 border-red-500/80 text-red-200'
          : 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
          }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.isError ? (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-4"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-mono font-semibold transition-colors ${activeTab === 'active'
            ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
            : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Active Incidents ({activeIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-mono font-semibold transition-colors ${activeTab === 'events'
            ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
            : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          <History className="w-4 h-4" />
          <span>Operational Event History ({eventLog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-mono font-semibold transition-colors ${activeTab === 'history'
            ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
            : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Resolved Archive ({resolvedIncidents.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Active Incidents */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeIncidents.length === 0 ? (
            <div className="industrial-card rounded-xl p-12 text-center border border-slate-800 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-950/40">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-mono text-base font-bold text-slate-200">
                No Active Incidents Retained
              </h3>
              <p className="font-mono text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                All facility zones are nominal. Automatic safety interlocks are in standby state.
                Any emerging threshold breaches will appear here in deterministic priority order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeIncidents.map((incident) => {
                const priorityConfig = CATEGORY_PRIORITY[incident.category];
                const zone = ZONES[incident.zoneId];
                const validation = validateResetEligibility(incident, hazardEnv);
                const closureValidation = getClosureValidation(incident.id);
                const isAck = isIncidentAcknowledged(incident);
                const inspStatus = hazardEnv.inspectionStatus?.[incident.zoneId] ?? 'NONE';
                const inspCountdown = hazardEnv.inspectionCountdown?.[incident.zoneId] ?? 0;

                return (
                  <div
                    key={incident.id}
                    id={`section-incident-${incident.id}`}
                    className="industrial-card rounded-xl p-4 border border-slate-700/80 hover:border-slate-600 transition-all shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Incident Identity & Details */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500 text-white shadow-sm">
                          PRIORITY {incident.priority}
                        </span>

                        <div className="flex items-center gap-1.5 text-slate-100 font-mono font-bold text-sm">
                          {getCategoryIcon(incident.category)}
                          <span>{priorityConfig.title}</span>
                        </div>

                        <span className="text-slate-500">•</span>

                        <span className="font-mono text-xs text-slate-300">
                          ID: <strong className="text-cyan-300">{incident.id}</strong>
                        </span>

                        <span className="text-slate-500">•</span>

                        <span className="font-mono text-xs text-slate-300">
                          Zone: <strong className="text-cyan-300">{zone.name}</strong> ({zone.code})
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded border border-slate-800">
                        {incident.details}
                      </p>

                      {/* Telemetry & Detection Timestamps */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detected: {new Date(incident.detectedAt).toLocaleTimeString()}</span>
                        </div>

                        <div>
                          <span>Acknowledged: </span>
                          <span className={isAck ? 'text-purple-300 font-semibold' : 'text-amber-400 font-semibold'}>
                            {isAck ? new Date(incident.acknowledgedAt!).toLocaleTimeString() : 'Awaiting Operator'}
                          </span>
                        </div>

                        <div>
                          <span>Trigger Condition: </span>
                          <span className={incident.conditionActive ? 'text-red-400 font-bold' : 'text-emerald-400 font-semibold'}>
                            {incident.conditionActive ? 'Active (Sensor Triggered)' : 'Cleared'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Reset Criteria Checklist Box */}
                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/90 text-xs font-mono min-w-[250px]">
                      <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Safety Reset Interlocks</span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">1. Trigger Condition Cleared:</span>
                          <span className={!incident.conditionActive && (incident.category !== 'MANUAL_EMERGENCY' || (!telemetry.manualEmergencyActive && !hazardEnv.manualEmergencyActive)) ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {!incident.conditionActive && (incident.category !== 'MANUAL_EMERGENCY' || (!telemetry.manualEmergencyActive && !hazardEnv.manualEmergencyActive)) ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">2. Operator Acknowledged:</span>
                          <span className={isAck ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {isAck ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">3. Safety Verification Passed:</span>
                          <span className={inspStatus === 'PASSED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {inspStatus === 'PASSED' ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">4. Emergency Closure Authorised:</span>
                          <span className={incident.closureAuthorizedAt ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {incident.closureAuthorizedAt ? 'YES' : 'NO'}
                          </span>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-bold">
                          <span className="text-slate-300">Reset Status:</span>
                          <span className={validation.canReset ? 'text-emerald-400' : 'text-amber-400'}>
                            {validation.canReset ? 'ELIGIBLE' : 'LOCKED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Operational Actions */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {!isAck ? (
                        <button
                          id={`action-ack-${incident.id}`}
                          onClick={() => acknowledgeIncident(incident.id)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-md shadow-red-700/30 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                            activeHighlightTarget === `action-ack-${incident.id}` ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ACKNOWLEDGE ALARM</span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ACKNOWLEDGED</span>
                          </div>
                          <span className="text-[10px] text-purple-400/80">
                            {new Date(incident.acknowledgedAt!).toLocaleTimeString()}
                          </span>
                        </div>
                      )}

                      {/* Safety Verification Control */}
                      {inspStatus === 'PASSED' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-semibold">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>VERIFIED SAFE (5s PASS)</span>
                        </div>
                      ) : inspStatus === 'IN_PROGRESS' ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                          <span>VERIFYING ({inspCountdown}s)...</span>
                        </div>
                      ) : (
                        <button
                          id={`action-inspect-${incident.zoneId}`}
                          onClick={() => {
                            const res = requestSafetyInspection(incident.zoneId);
                            setFeedbackMessage({ text: res.message, isError: !res.success });
                            setTimeout(() => setFeedbackMessage(null), 5000);
                          }}
                          disabled={incident.category === 'MANUAL_EMERGENCY' && (telemetry.manualEmergencyActive || hazardEnv.manualEmergencyActive)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-mono text-xs font-bold shadow-sm transition-all ${
                            incident.category === 'MANUAL_EMERGENCY' && (telemetry.manualEmergencyActive || hazardEnv.manualEmergencyActive)
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          } ${
                            activeHighlightTarget === `action-inspect-${incident.zoneId}` ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                          }`}
                          title={
                            incident.category === 'MANUAL_EMERGENCY' && (telemetry.manualEmergencyActive || hazardEnv.manualEmergencyActive)
                              ? 'Safety Verification Unavailable — Manual Emergency Trip Still Active in Control Room'
                              : 'Initiate required 5-second physical safety verification inspection'
                          }
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>INITIATE SAFETY VERIFICATION</span>
                        </button>
                      )}

                      {incident.closureAuthorizedAt ? (
                        <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold">
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                          <span>CLOSURE AUTHORISED</span>
                        </div>
                      ) : (
                        <button
                          id={`action-close-${incident.id}`}
                          onClick={() => handleClosure(incident.id)}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-mono text-xs font-bold transition-all ${
                            activeHighlightTarget === `action-close-${incident.id}` ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 ' : ''
                          }${closureValidation?.canClose
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-700/30 ring-1 ring-cyan-400 animate-pulse'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                            }`}
                          title={closureValidation?.canClose ? 'Authorise formal emergency closure and archive incident' : 'Closure requires: hazard contained, safe sensors, verification inspection, and operator acknowledgement'}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>AUTHORISE CLOSURE</span>
                        </button>
                      )}

                      <button
                        id={`action-reset-${incident.id}`}
                        onClick={() => handleReset(incident.id)}
                        disabled={!validation.canReset}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all ${
                          activeHighlightTarget === `action-reset-${incident.id}` ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 ' : ''
                        }${validation.canReset
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/30 animate-pulse cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                          }`}
                        title={validation.canReset ? 'Reset alarm latch' : `Alarm reset locked: ${validation.reasons.join('; ')}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESET ALARM</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Operational Emergency Intervention & Recovery Panel */}
          <div className="mt-4">
            <EmergencyInterventionPanel />
          </div>
        </div>
      )}

      {/* Tab Content 2: Operational Event History */}
      {activeTab === 'events' && (
        <div className="industrial-card rounded-xl p-4 border border-slate-800 space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Filter Severity:
              </span>
              {['ALL', 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${severityFilter === sev
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                    }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events, zones, actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Events Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Event Type</th>
                  <th className="py-2 px-3">Zone</th>
                  <th className="py-2 px-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No matching events found in audit log.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${evt.severity === 'critical' ? 'bg-red-950 text-red-300 border border-red-500/50' :
                          evt.severity === 'warning' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                            evt.severity === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                              'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-semibold whitespace-nowrap">
                        {evt.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3 text-cyan-300 whitespace-nowrap">
                        {evt.zoneId ? ZONES[evt.zoneId].code : 'SYSTEM'}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {evt.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Resolved Incidents History */}
      {activeTab === 'history' && (
        <div className="industrial-card rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              RESOLVED INCIDENT AUDIT ARCHIVE
            </span>
            <span className="text-xs font-mono text-slate-500">
              Total Resolved: {resolvedIncidents.length}
            </span>
          </div>

          {resolvedIncidents.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-slate-500">
              No historical incidents have been resolved in this simulation session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-3">Incident ID</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Zone</th>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Detected At</th>
                    <th className="py-2 px-3">Resolved At</th>
                    <th className="py-2 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {resolvedIncidents.map((inc) => {
                    const durationSec = inc.resolvedAt
                      ? Math.round((inc.resolvedAt - inc.detectedAt) / 1000)
                      : 0;

                    return (
                      <tr key={inc.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-200">
                          {inc.id}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {CATEGORY_PRIORITY[inc.category].title}
                        </td>
                        <td className="py-2 px-3 text-cyan-300">
                          {ZONES[inc.zoneId].name}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                            P{inc.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {new Date(inc.detectedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-semibold">
                          {durationSec}s
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
