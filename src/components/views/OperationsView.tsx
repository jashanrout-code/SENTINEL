import React, { useState } from 'react';
import { useSentinelStore } from '../../store/useSentinelStore';
import { PREDEFINED_SCENARIOS } from '../../core/scenarios';
import { ZONES } from '../../types';
import type { ZoneId } from '../../types';
import {
  Sliders,
  RotateCcw,
  Thermometer,
  CloudFog,
  Gauge,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  StepForward,
  Wrench,
  AlertCircle,
  Zap,
  Flame,
  Wind,
  AlertOctagon,
  Clock
} from 'lucide-react';

export const OperationsView: React.FC = () => {
  const telemetry = useSentinelStore(state => state.telemetry);
  const setSensorValue = useSentinelStore(state => state.setSensorValue);
  const toggleSensorFault = useSentinelStore(state => state.toggleSensorFault);
  const applyScenario = useSentinelStore(state => state.applyScenario);
  const resetSimulation = useSentinelStore(state => state.resetSimulation);
  const activeIncidents = useSentinelStore(state => state.activeIncidents);
  const selectedZoneId = useSentinelStore(state => state.selectedZoneId) || 'RESEARCH_LAB';
  const selectZone = useSentinelStore(state => state.selectZone);
  const setView = useSentinelStore(state => state.setView);

  // Closed-loop simulation state
  const simulationMode = useSentinelStore(state => state.simulationMode);
  const setSimulationMode = useSentinelStore(state => state.setSimulationMode);
  const hazardEnv = useSentinelStore(state => state.hazardEnv);
  const protectionEquipment = useSentinelStore(state => state.protectionEquipment);
  const responseTeams = useSentinelStore(state => state.responseTeams);
  const failureConfig = useSentinelStore(state => state.failureConfig);
  const setFailureConfig = useSentinelStore(state => state.setFailureConfig);
  const isSimulationRunning = useSentinelStore(state => state.isSimulationRunning);
  const startSimulationClock = useSentinelStore(state => state.startSimulationClock);
  const stopSimulationClock = useSentinelStore(state => state.stopSimulationClock);
  const stepSimulationTick = useSentinelStore(state => state.stepSimulationTick);
  const executeManualIntervention = useSentinelStore(state => state.executeManualIntervention);
  const activeHighlightTarget = useSentinelStore(state => state.activeHighlightTarget);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const zonesList: ZoneId[] = ['RESEARCH_LAB', 'CHEMICAL_LAB', 'RESTRICTED_STORAGE', 'CONTROL_ROOM'];

  const handleSimulationResetConfirm = () => {
    resetSimulation();
    setConfirmResetOpen(false);
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 max-w-[1720px] mx-auto w-full overflow-y-auto select-none">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="font-mono text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>OPERATIONAL SIMULATION & COUNTERMEASURES CONSOLE</span>
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Automated closed-loop hazard mitigation, simulated response team dispatch, and hardware safety interlocks.
          </p>
        </div>

        {/* Global Simulation Reset Button */}
        <button
          onClick={() => {
            if (activeIncidents.length > 0) {
              setConfirmResetOpen(true);
            } else {
              resetSimulation();
            }
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/60 text-red-300 font-mono text-xs font-bold transition-all shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-red-400" />
          <span>RESET SIMULATION ENVIRONMENT</span>
        </button>
      </div>

      {/* Confirmation Modal for Simulation Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="industrial-card-elevated rounded-xl max-w-md w-full p-6 border border-red-500/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-mono text-base font-bold text-slate-100">
                  Confirm Simulation Reset
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Virtual environment reinitialization
                </p>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded border border-slate-800">
              There are currently <strong>{activeIncidents.length} active incidents</strong> in this session.
              Resetting the simulation restores telemetry to baseline nominal states, resets protective equipment,
              and clears all active alarms.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulationResetConfirm}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors shadow-md"
              >
                Confirm Environment Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Operating Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950/90 rounded-xl border border-slate-800">
        <button
          onClick={() => setSimulationMode('AUTOMATED_SCENARIO')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-mono text-xs font-bold transition-all ${
            simulationMode === 'AUTOMATED_SCENARIO'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>AUTOMATED EMERGENCY SCENARIO (CLOSED-LOOP ENGINE)</span>
        </button>

        <button
          onClick={() => setSimulationMode('MANUAL_SENSOR_TEST')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-mono text-xs font-bold transition-all ${
            simulationMode === 'MANUAL_SENSOR_TEST'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>MANUAL SENSOR TEST (THRESHOLD & DETECTION VALIDATION)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: AUTOMATED EMERGENCY SCENARIO (CLOSED-LOOP) */}
      {/* ========================================================================= */}
      {simulationMode === 'AUTOMATED_SCENARIO' && (
        <div className="space-y-4">
          {/* Closed-Loop Simulation Clock & Status Banner */}
          <div className="industrial-card rounded-xl p-4 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg border ${
                isSimulationRunning
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <Clock className={`w-5 h-5 ${isSimulationRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-100">
                    Closed-Loop Simulation Engine
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isSimulationRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isSimulationRunning ? 'CLOCK RUNNING (700ms TICK)' : 'CLOCK PAUSED'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Protective countermeasures actively mitigate hazard intensity and derive live sensor readings without operator manipulation.
                </p>
              </div>
            </div>

            {/* Simulation Clock Controls */}
            <div className="flex items-center gap-2">
              {isSimulationRunning ? (
                <button
                  onClick={stopSimulationClock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/60 text-amber-300 font-mono text-xs font-bold transition-all shadow-sm"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Clock</span>
                </button>
              ) : (
                <button
                  onClick={startSimulationClock}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-bold transition-all shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Clock</span>
                </button>
              )}

              <button
                onClick={stepSimulationTick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold transition-all"
                title="Advance simulation by 1 tick"
              >
                <StepForward className="w-3.5 h-3.5 text-cyan-400" />
                <span>Single Tick</span>
              </button>
            </div>
          </div>

          {/* Current Hazard & Protective Equipment Real-Time Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fire Hazard Monitor */}
            <div className="industrial-card rounded-xl p-3.5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
                  <Flame className="w-4 h-4" />
                  <span>Research Lab Fire State</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  hazardEnv.containmentStatus.fire === 'UNCONTROLLED' ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse' :
                  hazardEnv.containmentStatus.fire === 'MITIGATING' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                  hazardEnv.containmentStatus.fire === 'CONTAINED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                  'bg-slate-900 text-slate-500'
                }`}>
                  {hazardEnv.containmentStatus.fire}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                <div>Intensity: <strong>{hazardEnv.fireIntensity}%</strong></div>
                <div>Temp: <strong>{telemetry.temperature}°C</strong></div>
                <div>Smoke: <strong>{hazardEnv.smokeConcentration}%</strong></div>
                <div>Suppression: <strong className={protectionEquipment.fireSuppression.state === 'OPERATING' ? 'text-emerald-400' : protectionEquipment.fireSuppression.state === 'FAILED' ? 'text-red-400' : 'text-slate-400'}>{protectionEquipment.fireSuppression.state}</strong></div>
              </div>
            </div>

            {/* Gas Hazard Monitor */}
            <div className="industrial-card rounded-xl p-3.5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400">
                  <Wind className="w-4 h-4" />
                  <span>Chemical Lab Gas State</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  hazardEnv.containmentStatus.gas === 'UNCONTROLLED' ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse' :
                  hazardEnv.containmentStatus.gas === 'MITIGATING' ? 'bg-amber-950 text-amber-300 border border-amber-500/50' :
                  hazardEnv.containmentStatus.gas === 'CONTAINED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                  'bg-slate-900 text-slate-500'
                }`}>
                  {hazardEnv.containmentStatus.gas}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                <div>Source: <strong className={hazardEnv.gasSourceActive ? 'text-amber-400' : 'text-slate-400'}>{hazardEnv.gasSourceActive ? `${hazardEnv.gasReleaseRate} L/min (LEAK)` : 'ISOLATED'}</strong></div>
                <div>Sensor: <strong>{telemetry.gasConcentration}/255 Scale</strong></div>
                <div>Isolation: <strong className={protectionEquipment.gasIsolationValve.state === 'OPERATING' ? 'text-emerald-400' : protectionEquipment.gasIsolationValve.state === 'FAILED' ? 'text-red-400' : 'text-slate-400'}>{protectionEquipment.gasIsolationValve.state}</strong></div>
                <div>Scrubber: <strong className={protectionEquipment.emergencyVentilation.state === 'OPERATING' ? 'text-emerald-400' : protectionEquipment.emergencyVentilation.state === 'FAILED' ? 'text-red-400' : 'text-slate-400'}>{protectionEquipment.emergencyVentilation.state}</strong></div>
              </div>
            </div>

            {/* Security Intrusion Monitor */}
            <div className="industrial-card rounded-xl p-3.5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Restricted Storage State</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  hazardEnv.containmentStatus.intrusion === 'UNCONTROLLED' ? 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse' :
                  hazardEnv.containmentStatus.intrusion === 'CONTAINED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                  'bg-slate-900 text-slate-500'
                }`}>
                  {hazardEnv.containmentStatus.intrusion}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/80">
                <div>Breach: <strong>{hazardEnv.intrusionBreachActive ? 'DETECTED' : 'CLEAR'}</strong></div>
                <div>Lockdown: <strong className={protectionEquipment.accessPointLockdown.state === 'OPERATING' ? 'text-emerald-400' : 'text-slate-400'}>{protectionEquipment.accessPointLockdown.state}</strong></div>
                <div>Security Team: <strong>{responseTeams.securityTeam.stage.replace('_', ' ')}</strong></div>
                <div>ETA: <strong>{responseTeams.securityTeam.etaSeconds}s</strong></div>
              </div>
            </div>
          </div>

          {/* Equipment Failure Injections & Safety Interlocks */}
          <div className="industrial-card rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Equipment Failure Injections & Safety Interlock Testing
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Physical consequence modeling: Failures directly inhibit mitigation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Fire suppression failure toggle */}
              <button
                onClick={() => setFailureConfig({ fireSuppressionFailed: !failureConfig.fireSuppressionFailed })}
                className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                  failureConfig.fireSuppressionFailed
                    ? 'bg-red-950/60 border-red-500/80 text-red-200 shadow-md ring-1 ring-red-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Suppression Failure</span>
                  <span className={`w-2 h-2 rounded-full ${failureConfig.fireSuppressionFailed ? 'bg-red-400 animate-ping' : 'bg-slate-700'}`} />
                </div>
                <div className="text-[10px] text-slate-400">
                  {failureConfig.fireSuppressionFailed ? 'FAULT ACTIVE: Pump fails, fire cannot be extinguished' : 'NOMINAL: Auto-deluge foam operational'}
                </div>
              </button>

              {/* Gas valve failure toggle */}
              <button
                onClick={() => setFailureConfig({ gasIsolationFailed: !failureConfig.gasIsolationFailed })}
                className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                  failureConfig.gasIsolationFailed
                    ? 'bg-red-950/60 border-red-500/80 text-red-200 shadow-md ring-1 ring-red-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Gas Isolation Valve Jam</span>
                  <span className={`w-2 h-2 rounded-full ${failureConfig.gasIsolationFailed ? 'bg-red-400 animate-ping' : 'bg-slate-700'}`} />
                </div>
                <div className="text-[10px] text-slate-400">
                  {failureConfig.gasIsolationFailed ? 'FAULT ACTIVE: Valve jammed open, gas continuously leaks' : 'NOMINAL: Solenoid seals line on alert'}
                </div>
              </button>

              {/* Ventilation failure toggle */}
              <button
                onClick={() => setFailureConfig({ ventilationFailed: !failureConfig.ventilationFailed })}
                className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                  failureConfig.ventilationFailed
                    ? 'bg-red-950/60 border-red-500/80 text-red-200 shadow-md ring-1 ring-red-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Ventilation Fan Trip</span>
                  <span className={`w-2 h-2 rounded-full ${failureConfig.ventilationFailed ? 'bg-red-400 animate-ping' : 'bg-slate-700'}`} />
                </div>
                <div className="text-[10px] text-slate-400">
                  {failureConfig.ventilationFailed ? 'FAULT ACTIVE: Exhaust offline, atmosphere stays toxic' : 'NOMINAL: Purges gas and smoke'}
                </div>
              </button>

              {/* Security delay toggle */}
              <button
                onClick={() => setFailureConfig({ securityDelay: !failureConfig.securityDelay })}
                className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                  failureConfig.securityDelay
                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Security Team Delay</span>
                  <span className={`w-2 h-2 rounded-full ${failureConfig.securityDelay ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
                </div>
                <div className="text-[10px] text-slate-400">
                  {failureConfig.securityDelay ? 'ACTIVE: Extended transit time (patrol route obstruction)' : 'NOMINAL: Rapid response dispatch'}
                </div>
              </button>
            </div>
          </div>

          {/* Automated Scenario Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Automated Closed-Loop Scenarios</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Clicking a scenario initiates the hazard; SENTINEL automatically deploys countermeasures & updates sensors
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PREDEFINED_SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  className="industrial-card rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        {sc.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                        {ZONES[sc.targetZone].code}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 leading-snug mb-3">
                      {sc.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      applyScenario(sc.id);
                      setView('command-centre');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-slate-800 hover:bg-cyan-900/60 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/60 font-mono text-xs font-semibold transition-all shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Run Automated Scenario</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: MANUAL SENSOR TEST (THRESHOLD & DETECTION VALIDATION) */}
      {/* ========================================================================= */}
      {simulationMode === 'MANUAL_SENSOR_TEST' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs font-mono leading-relaxed flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong>Manual Calibration Mode Active:</strong> Closed-loop simulation clock is paused.
              You have direct manual control over raw sensor telemetry sliders to independently verify thresholds, alarm transitions, latching, and reset logic.
            </div>
          </div>

          {/* Direct Zone Sensor Manipulation Console */}
          <div className="industrial-card rounded-xl p-5 border border-slate-800 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Direct Sensor Telemetry Manipulation
                </span>
              </div>

              {/* Zone Selector Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {zonesList.map((zid) => {
                  const zone = ZONES[zid];
                  const isSelected = selectedZoneId === zid;
                  return (
                    <button
                      key={zid}
                      onClick={() => selectZone(zid)}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      {zone.code} • {zone.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Zone Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Configuring sensors assigned to:</span>
                <strong className="text-amber-300">{ZONES[selectedZoneId].name}</strong>
                <span>({ZONES[selectedZoneId].code})</span>
              </div>

              {selectedZoneId === 'RESEARCH_LAB' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Temperature Control */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        <span>Thermal Probe T-01</span>
                      </span>
                      <span className={`text-base font-mono font-bold ${
                        telemetry.temperature >= 60 ? 'text-red-400' : 'text-slate-100'
                      }`}>
                        {telemetry.temperature}°C
                      </span>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min="0"
                      max="120"
                      value={telemetry.temperature}
                      onChange={(e) => setSensorValue('temperature', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">Range: 0°C – 120°C</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Numeric:</span>
                        <input
                          type="number"
                          min="0"
                          max="255"
                          value={telemetry.temperature}
                          onChange={(e) => setSensorValue('temperature', parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-xs font-mono text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-amber-400 font-semibold">Detection Rule:</span> Fire requires Temperature ≥ 60°C AND Smoke detection. Temperature alone produces an elevated thermal warning.
                    </div>
                  </div>

                  {/* Smoke Detector Control */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                          <CloudFog className="w-4 h-4 text-slate-400" />
                          <span>Ionization Smoke Detector S-01</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          telemetry.smokeDetected ? 'bg-red-950 text-red-300 border border-red-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                        }`}>
                          {telemetry.smokeDetected ? 'SMOKE DETECTED' : 'CLEAR'}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-400 leading-relaxed mb-4">
                        Simulates particle ionization optical obscuration. Toggling smoke without high temperature produces a localized smoke warning without triggering confirmed fire.
                      </p>
                    </div>

                    <button
                      onClick={() => setSensorValue('smokeDetected', !telemetry.smokeDetected)}
                      className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all ${
                        telemetry.smokeDetected
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {telemetry.smokeDetected ? 'CLEAR SMOKE DETECTOR' : 'TRIGGER SMOKE DETECTOR'}
                    </button>
                  </div>
                </div>
              )}

              {selectedZoneId === 'CHEMICAL_LAB' && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                      <Gauge className="w-4 h-4 text-yellow-400" />
                      <span>Catalytic Gas Sensor G-01</span>
                    </span>
                    <span className={`text-base font-mono font-bold ${
                      telemetry.gasConcentration >= 100 ? 'text-red-400' : 'text-slate-100'
                    }`}>
                      {telemetry.gasConcentration} / 255
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={telemetry.gasConcentration}
                    onChange={(e) => setSensorValue('gasConcentration', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Simulated 8-Bit Scale: 0 – 255</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Numeric:</span>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={telemetry.gasConcentration}
                        onChange={(e) => setSensorValue('gasConcentration', parseInt(e.target.value, 10) || 0)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-xs font-mono text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-yellow-400 font-semibold">Alarm Threshold:</span> Gas concentration ≥ 100 triggers confirmed Gas Leakage Emergency, initiating automated emergency ventilation and ductwork isolation dampers.
                  </div>
                </div>
              )}

              {selectedZoneId === 'RESTRICTED_STORAGE' && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 max-w-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span>Optical Perimeter Intrusion Sensor I-01</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      telemetry.intrusionDetected ? 'bg-red-950 text-red-300 border border-red-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    }`}>
                      {telemetry.intrusionDetected ? 'BREACH DETECTED' : 'SECURE'}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-400 leading-relaxed mb-4">
                    Controls the active optical intrusion barrier at the Restricted Storage doorway. Active breach triggers immediate security alarm and access lockdown protocol.
                  </p>

                  <button
                    onClick={() => setSensorValue('intrusionDetected', !telemetry.intrusionDetected)}
                    className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all ${
                      telemetry.intrusionDetected
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {telemetry.intrusionDetected ? 'RESTORE SECURITY PERIMETER' : 'SIMULATE PERIMETER BREACH'}
                  </button>

                  {/* Tactical Security Assessment Control Panel */}
                  <div id="section-security-assessment" className="pt-3 border-t border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                        <span id="heading-security-assessment" tabIndex={-1} className="outline-none">Tactical Security Unit Response</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/50">
                        {responseTeams.securityTeam.stage.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                      On-site tactical unit security audit and perimeter verification for Zone ZN-03 Restricted Storage.
                    </p>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        id="action-assess-RESTRICTED_STORAGE"
                        onClick={() => executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE')}
                        disabled={
                          !(responseTeams.securityTeam.stage === 'ON_SITE' || responseTeams.securityTeam.stage === 'INTERVENTION_UNDERWAY' || responseTeams.securityTeam.stage === 'RESPONSE_COMPLETED') ||
                          Boolean(responseTeams.securityTeam.assessmentUnderway) ||
                          Boolean(responseTeams.securityTeam.assessmentCompleted)
                        }
                        className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          activeHighlightTarget === 'action-assess-RESTRICTED_STORAGE'
                            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 animate-pulse bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                            : 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/60'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>
                          {responseTeams.securityTeam.assessmentCompleted
                            ? 'Tactical Assessment Completed (100%)'
                            : responseTeams.securityTeam.assessmentUnderway
                            ? `Assessment In Progress (${responseTeams.securityTeam.assessmentProgress ?? 0}%)`
                            : 'Initiate Tactical Area Assessment'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedZoneId === 'CONTROL_ROOM' && (
                <div id="section-manual-trip" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 max-w-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                      <Radio className="w-4 h-4 text-red-400" />
                      <span>Master Emergency Activation Station M-01</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      telemetry.manualEmergencyActive ? 'bg-red-950 text-red-300 border border-red-500/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    }`}>
                      {telemetry.manualEmergencyActive ? 'TRIPPED' : 'ARMED / NOMINAL'}
                    </span>
                  </div>

                  {/* Initiating Zone Selector */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Initiating Station Location:</span>
                    <select
                      value={telemetry.manualEmergencyZone}
                      onChange={(e) => setSensorValue('manualEmergencyZone', e.target.value as ZoneId)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono"
                    >
                      {zonesList.map(zid => (
                        <option key={zid} value={zid}>{ZONES[zid].name}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs font-mono text-slate-400 leading-relaxed mb-4">
                    Manual emergency activation overrides standard thresholds and assigns highest incident priority (Priority 1) with immediate operator assessment request.
                  </p>

                  <button
                    id="action-clear-manual-trip"
                    onClick={() => setSensorValue('manualEmergencyActive', !telemetry.manualEmergencyActive)}
                    className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all ${
                      telemetry.manualEmergencyActive
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    } ${
                      activeHighlightTarget === 'action-clear-manual-trip' ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
                    }`}
                  >
                    {telemetry.manualEmergencyActive ? 'RESET MANUAL TRIP SWITCH' : 'TRIP MANUAL EMERGENCY STATION'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Sensor Fault Injection */}
          <div className="industrial-card rounded-xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Wrench className="w-4 h-4 text-orange-400" />
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                Diagnostic Sensor Fault Injection (Test Integrity)
              </span>
            </div>

            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Inject simulated hardware/communication fault flags into individual sensor channels to test fault visualization and distinguish broken sensors from emergency conditions.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { key: 'temperature' as const, label: 'Thermal Probe T-01 Fault' },
                { key: 'smoke' as const, label: 'Smoke Detector S-01 Fault' },
                { key: 'gas' as const, label: 'Gas Sensor G-01 Fault' },
                { key: 'intrusion' as const, label: 'Intrusion Sensor I-01 Fault' },
              ].map(({ key, label }) => {
                const isFaulted = telemetry.sensorFaults[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleSensorFault(key)}
                    className={`p-3 rounded-lg border text-left text-xs font-mono transition-all ${
                      isFaulted
                        ? 'bg-orange-950/60 border-orange-500/80 text-orange-200 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{label}</span>
                      <span className={`w-2 h-2 rounded-full ${isFaulted ? 'bg-orange-400 animate-ping' : 'bg-slate-700'}`} />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Status: {isFaulted ? 'INTEGRITY FAULT' : 'NOMINAL'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
