import { create } from 'zustand';
import type {
  SensorTelemetry,
  IncidentRecord,
  EventLogItem,
  ZoneId,
  OperationalView,
  AutomaticResponses,
  SimulationOperatingMode,
  HazardEnvironment,
  ProtectionEquipmentState,
  ResponseTeamsState,
  EquipmentFailureConfig,
  ManualInterventionCommandType,
  ManualInterventionResult,
  ZoneOperationalState,
  ZoneOperationalStatus,
  ClosureValidationResult,
  ZoneHazardState,
  IncidentLifecycleStatus,
  ZoneEquipmentState,
  PendingOperatorAction,
  GuidedNavigationTarget,
  EmergencyCategory,
  ZoneRecoveryLifecycleState,
  ZoneRecoveryRecord
} from '../types';
import { isIncidentAcknowledged, ZONES } from '../types';
import { normalizeIncidentRecord } from '../core/incidentNormalizer';

import {
  stepMonitoringEngine,
  acknowledgeIncidentInEngine,
  resetIncidentInEngine,
  validateResetEligibility,
  calculateAutomaticResponses,
  TEMPERATURE_THRESHOLD,
  GAS_THRESHOLD
} from '../core/monitoringEngine';
import {
  validateIncidentClosure,
  authorizeIncidentClosure as authorizeIncidentClosureInEngine
} from '../core/incidentManagementEngine';
import {
  restoreZoneOperations as restoreZoneOperationsInEngine
} from '../core/recoveryController';
import { INITIAL_TELEMETRY, PREDEFINED_SCENARIOS } from '../core/scenarios';
import {
  INITIAL_HAZARD_ENVIRONMENT,
  INITIAL_PROTECTION_EQUIPMENT,
  INITIAL_RESPONSE_TEAMS,
  INITIAL_FAILURE_CONFIG,
  stepClosedLoopSimulation,
  executeManualCommand
} from '../core/hazardSimulationEngine';
import { simulationScheduler } from '../core/simulationScheduler';
import { audioAlertSystem } from '../utils/audioAlert';

export type ZoneHealthStatus = 'normal' | 'warning' | 'critical' | 'acknowledged' | 'fault';

export interface SentinelState {
  // Telemetry & Sensors
  telemetry: SensorTelemetry;
  activeIncidents: IncidentRecord[];
  resolvedIncidents: IncidentRecord[];
  eventLog: EventLogItem[];
  automaticResponses: AutomaticResponses;

  // Closed-loop simulation environment & equipment
  simulationMode: SimulationOperatingMode;
  hazardEnv: HazardEnvironment;
  protectionEquipment: ProtectionEquipmentState;
  responseTeams: ResponseTeamsState;
  failureConfig: EquipmentFailureConfig;
  isSimulationRunning: boolean;

  // Authoritative zone recovery lifecycle records
  zoneRecovery: Record<ZoneId, ZoneRecoveryRecord>;

  // Navigation & Selection
  currentView: OperationalView;
  selectedZoneId: ZoneId | null;
  selectedIncidentId: string | null;

  // Audio system
  isAudioMuted: boolean;

  // Actions
  setSimulationMode: (mode: SimulationOperatingMode) => void;
  setFailureConfig: (config: Partial<EquipmentFailureConfig>) => void;
  setSensorValue: <K extends keyof SensorTelemetry>(key: K, value: SensorTelemetry[K]) => void;
  toggleSensorFault: (sensor: keyof SensorTelemetry['sensorFaults']) => void;
  applyScenario: (scenarioId: string) => void;
  stepSimulationTick: () => void;
  startSimulationClock: () => void;
  stopSimulationClock: () => void;
  acknowledgeIncident: (incidentId: string) => void;
  resetIncident: (incidentId: string) => { success: boolean; message: string };
  resetSimulation: () => void;
  selectZone: (zoneId: ZoneId | null) => void;
  selectIncident: (incidentId: string | null) => void;
  setView: (view: OperationalView) => void;
  toggleAudio: () => void;
  executeManualIntervention: (command: ManualInterventionCommandType, zoneId?: ZoneId) => ManualInterventionResult;
  recoverZoneEquipment: (zoneId: ZoneId) => { success: boolean; message: string };
  restoreZoneOperations: (zoneId: ZoneId) => { success: boolean; message: string };
  getClosureValidation: (incidentId: string) => ClosureValidationResult | null;
  authorizeIncidentClosure: (incidentId: string) => { success: boolean; message: string };
  requestSafetyInspection: (zoneId: ZoneId) => ManualInterventionResult;
  confirmManualAssessment: (incidentId: string, isFalseAlarm: boolean) => { success: boolean; message: string };
  triggerManualEmergency: (zoneId?: ZoneId) => void;

  // Guided Navigation & Target Highlighting
  activeHighlightTarget: string | null;
  pendingNavigationTarget: GuidedNavigationTarget | null;
  setActiveHighlightTarget: (target: string | null) => void;
  navigateToGuidedAction: (target: GuidedNavigationTarget) => void;
  clearPendingNavigation: () => void;
  getPendingOperatorActions: () => PendingOperatorAction[];

  // Computed helper getters
  getZoneStatus: (zoneId: ZoneId) => ZoneHealthStatus;
  getZoneOperationalState: (zoneId: ZoneId) => ZoneOperationalState;
  getHighestPriorityIncident: () => IncidentRecord | undefined;
}

export const INITIAL_ZONE_RECOVERY: Record<ZoneId, ZoneRecoveryRecord> = {
  RESEARCH_LAB: { state: 'RESTORED', progress: 100 },
  CHEMICAL_LAB: { state: 'RESTORED', progress: 100, gasSupplyAuthorised: true },
  RESTRICTED_STORAGE: { state: 'RESTORED', progress: 100 },
  CONTROL_ROOM: { state: 'RESTORED', progress: 100 },
};

export const useSentinelStore = create<SentinelState>((set, get) => {
  // Initial state evaluation
  const initialTime = Date.now();
  const initialEngineResult = stepMonitoringEngine(INITIAL_TELEMETRY, [], initialTime);

  const initialLog: EventLogItem[] = [
    {
      id: `EVT-SYS-INIT-${initialTime}`,
      timestamp: initialTime,
      type: 'SIMULATION_RESET',
      message: 'SENTINEL Emergency Detection & Response Engine online. Closed-loop simulation ready.',
      severity: 'info',
    },
    ...initialEngineResult.newEvents,
  ];

  const stopClock = () => {
    simulationScheduler.stop();
    set({ isSimulationRunning: false });
  };

  const startClock = () => {
    simulationScheduler.start();
    set({ isSimulationRunning: true });
  };

  // Wire simulation scheduler tick handler to authoritative store tick
  simulationScheduler.setTickHandler((_tickCount, _elapsedMs) => {
    get().stepSimulationTick();
  });

  // Start simulation scheduler automatically on initialization
  simulationScheduler.start();

  return {
    telemetry: INITIAL_TELEMETRY,
    activeIncidents: initialEngineResult.activeIncidents.map(normalizeIncidentRecord),
    resolvedIncidents: [],
    eventLog: initialLog,
    automaticResponses: initialEngineResult.automaticResponses,

    simulationMode: 'AUTOMATED_SCENARIO',
    hazardEnv: INITIAL_HAZARD_ENVIRONMENT,
    protectionEquipment: INITIAL_PROTECTION_EQUIPMENT,
    responseTeams: INITIAL_RESPONSE_TEAMS,
    failureConfig: INITIAL_FAILURE_CONFIG,
    isSimulationRunning: true,
    zoneRecovery: { ...INITIAL_ZONE_RECOVERY },

    currentView: 'command-centre',
    selectedZoneId: 'RESEARCH_LAB',
    selectedIncidentId: null,
    isAudioMuted: true,
    activeHighlightTarget: null,
    pendingNavigationTarget: null,

    setActiveHighlightTarget: (target) => {
      set({ activeHighlightTarget: target });
    },

    clearPendingNavigation: () => {
      set({ pendingNavigationTarget: null });
    },

    navigateToGuidedAction: (target: GuidedNavigationTarget) => {
      // If navigating to command centre without explicit incident, clear selectedIncidentId
      // so ContextualPanel displays the facility zone and intervention/recovery controls instead of incident inspection
      const nextIncidentId = target.incidentId !== undefined
        ? target.incidentId
        : (target.destinationView === 'command-centre' ? null : get().selectedIncidentId);

      set(state => ({
        currentView: target.destinationView,
        selectedZoneId: target.zoneId ?? state.selectedZoneId,
        selectedIncidentId: nextIncidentId,
        activeHighlightTarget: target.targetControlId ?? null,
        pendingNavigationTarget: target.targetControlId ? { ...target, timestamp: Date.now() } : null,
      }));

      // Immediate attempt for already-mounted controls
      if (target.targetControlId && typeof document !== 'undefined') {
        const el = document.getElementById(target.targetControlId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof el.focus === 'function' && !(el as HTMLButtonElement).disabled) {
            el.focus();
          } else {
            const heading = (target.sectionId && document.getElementById(target.sectionId)) ||
              (target.zoneId && document.getElementById(`heading-recovery-${target.zoneId}`));
            if (heading) {
              if (!heading.hasAttribute('tabIndex')) heading.setAttribute('tabIndex', '-1');
              heading.focus();
            }
          }
        }
      }

      if (target.targetControlId) {
        setTimeout(() => {
          if (get().activeHighlightTarget === target.targetControlId) {
            set({ activeHighlightTarget: null });
          }
        }, 4000);
      }
    },

    setSimulationMode: (mode) => {
      if (mode === 'MANUAL_SENSOR_TEST') {
        stopClock();
      } else if (mode === 'AUTOMATED_SCENARIO') {
        startClock();
      }
      set({ simulationMode: mode });
    },

    setFailureConfig: (config) => {
      set(state => ({
        failureConfig: {
          ...state.failureConfig,
          ...config,
        },
      }));
    },

    startSimulationClock: startClock,
    stopSimulationClock: stopClock,

    stepSimulationTick: () => {
      const now = Date.now();
      const state = get();

      // Step hazard simulation and countermeasures
      const simResult = stepClosedLoopSimulation(
        state.hazardEnv,
        state.protectionEquipment,
        state.responseTeams,
        state.failureConfig,
        state.telemetry,
        now
      );

      // Feed derived sensor telemetry into monitoring engine
      const engineResult = stepMonitoringEngine(
        simResult.derivedTelemetry,
        state.activeIncidents,
        now
      );

      const hasUnacknowledged = engineResult.activeIncidents.some(inc => !isIncidentAcknowledged(inc));
      audioAlertSystem.updateAlarmState(hasUnacknowledged);

      // Optimization: avoid redundant store rerenders if completely nominal and quiescent
      const hasInspectionInProgress =
        Object.values(state.hazardEnv.inspectionStatus || {}).some(st => st === 'IN_PROGRESS') ||
        Object.values(simResult.nextEnv.inspectionStatus || {}).some(st => st === 'IN_PROGRESS');

      const isNominalQuiescent =
        !hasInspectionInProgress &&
        !state.hazardEnv.manualEmergencyActive &&
        !simResult.nextEnv.manualEmergencyActive &&
        state.activeIncidents.length === 0 &&
        engineResult.activeIncidents.length === 0 &&
        simResult.newEvents.length === 0 &&
        engineResult.newEvents.length === 0 &&
        state.hazardEnv.fireIntensity === 0 &&
        simResult.nextEnv.fireIntensity === 0 &&
        state.hazardEnv.gasConcentration === simResult.nextEnv.gasConcentration &&
        state.hazardEnv.ambientTemperature === simResult.nextEnv.ambientTemperature &&
        !state.hazardEnv.intrusionBreachActive &&
        !simResult.nextEnv.intrusionBreachActive &&
        state.responseTeams.fireTeam.stage === 'STANDBY' &&
        simResult.nextTeams.fireTeam.stage === 'STANDBY' &&
        state.responseTeams.hazmatTeam.stage === 'STANDBY' &&
        simResult.nextTeams.hazmatTeam.stage === 'STANDBY' &&
        state.responseTeams.securityTeam.stage === 'STANDBY' &&
        simResult.nextTeams.securityTeam.stage === 'STANDBY';

      if (isNominalQuiescent) {
        return;
      }

      const combinedEvents = [...simResult.newEvents, ...engineResult.newEvents, ...state.eventLog].slice(0, 200);

      // Section 7: Reset recovery only for a new emergency cycle
      const updatedRecovery = { ...state.zoneRecovery };
      let recModified = false;

      // Active fire or high temp in Research Lab
      if (
        (simResult.nextEnv.fireIgnited || (simResult.nextEnv.fireIntensity ?? 0) > 0 || simResult.derivedTelemetry.temperature >= TEMPERATURE_THRESHOLD || simResult.derivedTelemetry.smokeDetected) &&
        updatedRecovery.RESEARCH_LAB?.state === 'RESTORED'
      ) {
        updatedRecovery.RESEARCH_LAB = { state: 'RECOVERY_LOCKED', progress: 0 };
        recModified = true;
      }
      // Active gas leak in Chemical Lab
      if (
        (simResult.nextEnv.gasSourceActive || (simResult.nextEnv.gasReleaseRate ?? 0) > 0 || simResult.derivedTelemetry.gasConcentration >= GAS_THRESHOLD) &&
        updatedRecovery.CHEMICAL_LAB?.state === 'RESTORED'
      ) {
        updatedRecovery.CHEMICAL_LAB = { state: 'RECOVERY_LOCKED', progress: 0, gasSupplyAuthorised: false };
        recModified = true;
      }
      // Active intrusion in Restricted Storage
      if (
        (simResult.nextEnv.intrusionBreachActive || simResult.derivedTelemetry.intrusionDetected) &&
        updatedRecovery.RESTRICTED_STORAGE?.state === 'RESTORED'
      ) {
        updatedRecovery.RESTRICTED_STORAGE = { state: 'RECOVERY_LOCKED', progress: 0 };
        recModified = true;
      }
      // Any zone with active incidents
      for (const inc of engineResult.activeIncidents) {
        if (updatedRecovery[inc.zoneId]?.state === 'RESTORED') {
          updatedRecovery[inc.zoneId] = {
            state: 'RECOVERY_LOCKED',
            progress: 0,
            gasSupplyAuthorised: inc.zoneId === 'CHEMICAL_LAB' ? false : undefined,
          };
          recModified = true;
        }
      }

      set({
        hazardEnv: simResult.nextEnv,
        protectionEquipment: simResult.nextEquipment,
        responseTeams: simResult.nextTeams,
        telemetry: simResult.derivedTelemetry,
        activeIncidents: engineResult.activeIncidents,
        automaticResponses: engineResult.automaticResponses,
        zoneRecovery: recModified ? updatedRecovery : state.zoneRecovery,
        eventLog: combinedEvents,
      });
    },

    setSensorValue: (key, value) => {
      const now = Date.now();
      const currentTelemetry = get().telemetry;
      const updatedTelemetry = {
        ...currentTelemetry,
        [key]: value,
      };

      // Also update hazard env if relevant
      const updatedEnv = { ...get().hazardEnv };
      if (key === 'temperature') updatedEnv.ambientTemperature = value as number;
      if (key === 'smokeDetected') updatedEnv.smokeConcentration = (value as boolean) ? 80 : 0;
      if (key === 'gasConcentration') updatedEnv.gasConcentration = value as number;
      if (key === 'intrusionDetected') updatedEnv.intrusionBreachActive = value as boolean;
      if (key === 'manualEmergencyActive') updatedEnv.manualEmergencyActive = value as boolean;

      // Step monitoring engine with updated telemetry
      const { activeIncidents, newEvents, automaticResponses } = stepMonitoringEngine(
        updatedTelemetry,
        get().activeIncidents,
        now
      );

      const hasUnacknowledged = activeIncidents.some(inc => !isIncidentAcknowledged(inc));
      audioAlertSystem.updateAlarmState(hasUnacknowledged);

      const updatedRecovery = { ...get().zoneRecovery };
      let recModified = false;
      if (
        (key === 'temperature' && (value as number) >= TEMPERATURE_THRESHOLD) ||
        (key === 'smokeDetected' && (value as boolean))
      ) {
        if (updatedRecovery.RESEARCH_LAB?.state === 'RESTORED') {
          updatedRecovery.RESEARCH_LAB = { state: 'RECOVERY_LOCKED', progress: 0 };
          recModified = true;
        }
      }
      if (key === 'gasConcentration' && (value as number) >= GAS_THRESHOLD) {
        if (updatedRecovery.CHEMICAL_LAB?.state === 'RESTORED') {
          updatedRecovery.CHEMICAL_LAB = { state: 'RECOVERY_LOCKED', progress: 0, gasSupplyAuthorised: false };
          recModified = true;
        }
      }
      if (key === 'intrusionDetected' && (value as boolean)) {
        if (updatedRecovery.RESTRICTED_STORAGE?.state === 'RESTORED') {
          updatedRecovery.RESTRICTED_STORAGE = { state: 'RECOVERY_LOCKED', progress: 0 };
          recModified = true;
        }
      }
      for (const inc of activeIncidents) {
        if (updatedRecovery[inc.zoneId]?.state === 'RESTORED') {
          updatedRecovery[inc.zoneId] = {
            state: 'RECOVERY_LOCKED',
            progress: 0,
            gasSupplyAuthorised: inc.zoneId === 'CHEMICAL_LAB' ? false : undefined,
          };
          recModified = true;
        }
      }

      set(state => ({
        telemetry: updatedTelemetry,
        hazardEnv: updatedEnv,
        activeIncidents,
        automaticResponses,
        zoneRecovery: recModified ? updatedRecovery : state.zoneRecovery,
        eventLog: [...newEvents, ...state.eventLog].slice(0, 200),
      }));
    },

    toggleSensorFault: (sensorKey) => {
      const now = Date.now();
      const currentFaults = get().telemetry.sensorFaults;
      const isFaulted = !currentFaults[sensorKey];
      const updatedFaults = {
        ...currentFaults,
        [sensorKey]: isFaulted,
      };

      const faultEvent: EventLogItem = {
        id: `EVT-FLT-${now}-${sensorKey}`,
        timestamp: now,
        type: 'WARNING_CONDITION',
        message: isFaulted
          ? `Sensor fault reported: Diagnostic integrity error flagged on ${sensorKey.toUpperCase()} sensor.`
          : `Sensor fault cleared: ${sensorKey.toUpperCase()} sensor diagnostic returned to nominal.`,
        severity: isFaulted ? 'warning' : 'info',
      };

      set(state => ({
        telemetry: {
          ...state.telemetry,
          sensorFaults: updatedFaults,
        },
        eventLog: [faultEvent, ...state.eventLog].slice(0, 200),
      }));
    },

    applyScenario: (scenarioId: string) => {
      const scenario = PREDEFINED_SCENARIOS.find(s => s.id === scenarioId);
      if (!scenario) return;

      const now = Date.now();
      const currentTelemetry = get().telemetry;
      const updatedTelemetry: SensorTelemetry = {
        ...currentTelemetry,
        ...scenario.telemetryUpdates,
      };

      const updatedHazardEnv: HazardEnvironment = {
        ...INITIAL_HAZARD_ENVIRONMENT,
        inspectionCountdown: {},
        inspectionStatus: {},
        ...(scenario.initialHazard || {}),
        containmentStatus: {
          fire: (scenario.initialHazard?.fireIgnited || (scenario.initialHazard?.fireIntensity ?? 0) > 0) ? 'UNCONTROLLED' : 'SAFE',
          gas: (scenario.initialHazard?.gasSourceActive || (scenario.initialHazard?.gasConcentration ?? 0) >= 100) ? 'UNCONTROLLED' : 'SAFE',
          intrusion: scenario.initialHazard?.intrusionBreachActive ? 'UNCONTROLLED' : 'SAFE',
          manual: scenario.initialHazard?.manualEmergencyActive ? 'UNCONTROLLED' : 'SAFE',
        },
      };

      const updatedFailureConfig: EquipmentFailureConfig = {
        ...INITIAL_FAILURE_CONFIG,
        ...(scenario.failureConfig || {}),
      };

      // Step monitoring engine with initial telemetry
      const { activeIncidents, newEvents, automaticResponses } = stepMonitoringEngine(
        updatedTelemetry,
        get().activeIncidents,
        now
      );

      const scenarioEvent: EventLogItem = {
        id: `EVT-SCN-${now}-${scenario.id}`,
        timestamp: now,
        type: 'WARNING_CONDITION',
        zoneId: scenario.targetZone,
        message: `Operational scenario initiated: ${scenario.name}. ${scenario.description}`,
        severity: scenario.id === 'SCENARIO_NORMAL' ? 'info' : 'warning',
      };

      const hasUnacknowledged = activeIncidents.some(inc => !isIncidentAcknowledged(inc));
      audioAlertSystem.updateAlarmState(hasUnacknowledged);

      const updatedResponseTeams: ResponseTeamsState = {
        fireTeam: { ...INITIAL_RESPONSE_TEAMS.fireTeam },
        hazmatTeam: { ...INITIAL_RESPONSE_TEAMS.hazmatTeam },
        securityTeam: { ...INITIAL_RESPONSE_TEAMS.securityTeam, assessmentUnderway: false, assessmentProgress: 0, assessmentCompleted: false },
      };

      const nextZoneRecovery: Record<ZoneId, ZoneRecoveryRecord> = { ...INITIAL_ZONE_RECOVERY };
      if (scenario.id === 'SCENARIO_NORMAL') {
        // All zones nominal restored
      } else if (scenario.id === 'SCENARIO_FIRE' || scenario.id === 'SCENARIO_MANUAL_FIRE' || scenario.id === 'SCENARIO_FIRE_INTERVENTION_FAIL') {
        nextZoneRecovery.RESEARCH_LAB = { state: 'RECOVERY_LOCKED', progress: 0 };
      } else if (scenario.id === 'SCENARIO_GAS' || scenario.id === 'SCENARIO_AUTO_GAS_SUCCESS' || scenario.id === 'SCENARIO_GAS_SCRUBBER_FAIL' || scenario.id === 'SCENARIO_GAS_VALVE_FAIL') {
        nextZoneRecovery.CHEMICAL_LAB = { state: 'RECOVERY_LOCKED', progress: 0, gasSupplyAuthorised: false };
      } else if (scenario.id === 'SCENARIO_INTRUSION') {
        nextZoneRecovery.RESTRICTED_STORAGE = { state: 'RECOVERY_LOCKED', progress: 0 };
      } else if (scenario.id === 'SCENARIO_MULTIPLE') {
        nextZoneRecovery.RESEARCH_LAB = { state: 'RECOVERY_LOCKED', progress: 0 };
        nextZoneRecovery.CHEMICAL_LAB = { state: 'RECOVERY_LOCKED', progress: 0, gasSupplyAuthorised: false };
      } else if (scenario.targetZone) {
        nextZoneRecovery[scenario.targetZone] = { state: 'RECOVERY_LOCKED', progress: 0 };
      }
      for (const inc of activeIncidents) {
        nextZoneRecovery[inc.zoneId] = {
          state: 'RECOVERY_LOCKED',
          progress: 0,
          gasSupplyAuthorised: inc.zoneId === 'CHEMICAL_LAB' ? false : undefined,
        };
      }

      set(state => ({
        telemetry: updatedTelemetry,
        hazardEnv: updatedHazardEnv,
        failureConfig: updatedFailureConfig,
        protectionEquipment: { ...INITIAL_PROTECTION_EQUIPMENT },
        responseTeams: updatedResponseTeams,
        activeIncidents,
        automaticResponses,
        selectedZoneId: scenario.targetZone,
        zoneRecovery: nextZoneRecovery,
        eventLog: [scenarioEvent, ...newEvents, ...state.eventLog].slice(0, 200),
      }));

      // Ensure authoritative simulation clock is running
      startClock();
    },

    acknowledgeIncident: (incidentId: string) => {
      const now = Date.now();
      const { updatedIncidents, event } = acknowledgeIncidentInEngine(
        incidentId,
        get().activeIncidents,
        now,
        'Control Room Operator'
      );

      audioAlertSystem.playAcknowledgeChime();

      const hasUnacknowledged = updatedIncidents.some(inc => !isIncidentAcknowledged(inc));
      audioAlertSystem.updateAlarmState(hasUnacknowledged);

      set(state => ({
        activeIncidents: updatedIncidents,
        eventLog: event ? [event, ...state.eventLog].slice(0, 200) : state.eventLog,
      }));
    },

    resetIncident: (incidentId: string) => {
      const now = Date.now();
      const state = get();

      const inActive = state.activeIncidents.some(inc => inc.id === incidentId);
      if (!inActive) {
        // Check if already in resolvedIncidents (e.g. Closure Authorised was performed first)
        const alreadyResolved = state.resolvedIncidents.find(inc => inc.id === incidentId);
        if (alreadyResolved) {
          audioAlertSystem.playAcknowledgeChime();
          audioAlertSystem.updateAlarmState(false);
          const event: EventLogItem = {
            id: `EVT-${now}-${incidentId}-RST-POST`,
            timestamp: now,
            type: 'RESET_COMPLETED',
            category: alreadyResolved.category,
            zoneId: alreadyResolved.zoneId,
            message: `Alarm reset confirmed for closed incident ${alreadyResolved.id} (${alreadyResolved.title}). Audio-visual alert cleared.`,
            severity: 'info',
          };
          set(s => ({
            eventLog: [event, ...s.eventLog].slice(0, 200),
            selectedIncidentId: s.selectedIncidentId === incidentId ? null : s.selectedIncidentId,
          }));
          return { success: true, message: event.message };
        }
      }

      const result = resetIncidentInEngine(
        incidentId,
        state.activeIncidents,
        now,
        state.hazardEnv
      );

      if (result.success && result.resolvedIncident) {
        audioAlertSystem.playAcknowledgeChime();
        const updatedResponses = calculateAutomaticResponses(result.updatedIncidents);

        const hasUnacknowledged = result.updatedIncidents.some(inc => !isIncidentAcknowledged(inc));
        audioAlertSystem.updateAlarmState(hasUnacknowledged);

        set(state => ({
          activeIncidents: result.updatedIncidents,
          resolvedIncidents: [result.resolvedIncident!, ...state.resolvedIncidents],
          automaticResponses: updatedResponses,
          eventLog: [result.event, ...state.eventLog].slice(0, 200),
          selectedIncidentId: state.selectedIncidentId === incidentId ? null : state.selectedIncidentId,
        }));

        return { success: true, message: result.event.message };
      } else {
        audioAlertSystem.playWarningBeep();
        set(state => ({
          eventLog: [result.event, ...state.eventLog].slice(0, 200),
        }));
        return { success: false, message: result.event.message };
      }
    },

    resetSimulation: () => {
      const now = Date.now();
      stopClock();
      simulationScheduler.reset();
      audioAlertSystem.updateAlarmState(false);

      const resetEvent: EventLogItem = {
        id: `EVT-SIM-RESET-${now}`,
        timestamp: now,
        type: 'SIMULATION_RESET',
        message: 'Simulation environment reset confirmed. Telemetry restored to baseline nominal states.',
        severity: 'info',
      };

      set(state => ({
        telemetry: { ...INITIAL_TELEMETRY },
        hazardEnv: {
          ...INITIAL_HAZARD_ENVIRONMENT,
          inspectionCountdown: {},
          inspectionStatus: {},
          containmentStatus: { fire: 'SAFE', gas: 'SAFE', intrusion: 'SAFE', manual: 'SAFE' },
        },
        protectionEquipment: { ...INITIAL_PROTECTION_EQUIPMENT },
        responseTeams: {
          ...INITIAL_RESPONSE_TEAMS,
          securityTeam: { ...INITIAL_RESPONSE_TEAMS.securityTeam, assessmentUnderway: false, assessmentProgress: 0, assessmentCompleted: false },
          fireTeam: { ...INITIAL_RESPONSE_TEAMS.fireTeam },
          hazmatTeam: { ...INITIAL_RESPONSE_TEAMS.hazmatTeam },
        },
        failureConfig: { ...INITIAL_FAILURE_CONFIG },
        isSimulationRunning: false,
        activeIncidents: [],
        resolvedIncidents: [...state.activeIncidents.map(i => ({ ...i, state: 'RESOLVED' as const, resolvedAt: now })), ...state.resolvedIncidents],
        automaticResponses: calculateAutomaticResponses([]),
        zoneRecovery: { ...INITIAL_ZONE_RECOVERY },
        eventLog: [resetEvent, ...state.eventLog].slice(0, 200),
        selectedIncidentId: null,
        activeHighlightTarget: null,
        pendingNavigationTarget: null,
      }));
    },

    selectZone: (zoneId) => {
      set({ selectedZoneId: zoneId });
    },

    selectIncident: (incidentId) => {
      set({ selectedIncidentId: incidentId });
    },

    setView: (view) => {
      set({ currentView: view });
    },

    toggleAudio: () => {
      const current = get().isAudioMuted;
      const next = !current;
      audioAlertSystem.setMuted(next);
      if (!next) {
        audioAlertSystem.playAcknowledgeChime();
        const hasUnacknowledged = get().activeIncidents.some(inc => !isIncidentAcknowledged(inc));
        audioAlertSystem.updateAlarmState(hasUnacknowledged);
      }
      set({ isAudioMuted: next });
    },

    executeManualIntervention: (command: ManualInterventionCommandType, _zoneId?: ZoneId): ManualInterventionResult => {
      const now = Date.now();
      const state = get();

      const {
        nextEnv,
        nextEquipment,
        nextTeams,
        nextFailureConfig,
        derivedTelemetry,
        newEvents,
        result
      } = executeManualCommand(
        state.hazardEnv,
        state.protectionEquipment,
        state.responseTeams,
        state.failureConfig,
        state.telemetry,
        command,
        now
      );

      if (result.success) {
        audioAlertSystem.playAcknowledgeChime();
        startClock();

        // Step monitoring engine with updated telemetry to recalculate incidents
        const engineResult = stepMonitoringEngine(
          derivedTelemetry,
          state.activeIncidents,
          now
        );

        const hasUnacknowledged = engineResult.activeIncidents.some(inc => !isIncidentAcknowledged(inc));
        audioAlertSystem.updateAlarmState(hasUnacknowledged);

        const combinedEvents = [...newEvents, ...engineResult.newEvents, ...state.eventLog].slice(0, 200);

        const updatedRecovery = { ...state.zoneRecovery };
        if (command === 'RESTORE_GAS_SUPPLY') {
          updatedRecovery.CHEMICAL_LAB = {
            ...updatedRecovery.CHEMICAL_LAB,
            gasSupplyAuthorised: true,
          };
        }

        set({
          hazardEnv: nextEnv,
          protectionEquipment: nextEquipment,
          responseTeams: nextTeams,
          failureConfig: nextFailureConfig,
          telemetry: derivedTelemetry,
          activeIncidents: engineResult.activeIncidents,
          automaticResponses: engineResult.automaticResponses,
          zoneRecovery: updatedRecovery,
          eventLog: combinedEvents,
        });
      } else {
        audioAlertSystem.playWarningBeep();
        const combinedEvents = [...newEvents, ...state.eventLog].slice(0, 200);
        set({ eventLog: combinedEvents });
      }

      return result;
    },

    recoverZoneEquipment: (zoneId: ZoneId): { success: boolean; message: string } => {
      const now = Date.now();
      const state = get();
      const currentRec = state.zoneRecovery[zoneId];

      // Section 4: Make Restoration Idempotent
      // Repeated restoration requests must not restart completed operations, reset recovery state, reopen valves, or generate duplicate events!
      if (currentRec?.state === 'RESTORED') {
        return {
          success: true,
          message: `Zone ${ZONES[zoneId]?.name || zoneId} equipment is already restored in nominal operational standby.`
        };
      }

      if (currentRec?.state === 'RESTORING') {
        return {
          success: false,
          message: `Equipment restoration for ${ZONES[zoneId]?.name || zoneId} is already in progress.`
        };
      }

      const opState = state.getZoneOperationalState(zoneId);

      // Section 6: Authoritative sequence: Hazard Contained -> Safety Verification Passed -> Emergency Closure Authorised -> Equipment Recovery Permitted
      if (!opState.canRestoreEquipment || opState.recoveryLifecycleState !== 'RECOVERY_PERMITTED') {
        audioAlertSystem.playWarningBeep();
        const reasonText = opState.recoveryUnmetReasons.join('; ') || 'Safety recovery prerequisites unmet';
        const event: EventLogItem = {
          id: `EVT-REC-BLK-${now}-${zoneId}`,
          timestamp: now,
          type: 'COMMAND_REJECTED',
          zoneId,
          message: `Equipment recovery rejected for Zone ${zoneId}: ${reasonText}.`,
          severity: 'warning'
        };
        set(s => ({ eventLog: [event, ...s.eventLog].slice(0, 200) }));
        return { success: false, message: `Recovery rejected: ${reasonText}` };
      }

      const updatedEquipment = { ...state.protectionEquipment };
      const updatedTeams = { ...state.responseTeams };

      if (zoneId === 'RESEARCH_LAB') {
        updatedEquipment.fireSuppression = {
          ...updatedEquipment.fireSuppression,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_RESTORE_STANDBY',
          details: 'Fire suppression recharged & armed in automated standby.'
        };
        updatedEquipment.labEquipmentShutdown = {
          ...updatedEquipment.labEquipmentShutdown,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_RESTORE_POWER',
          details: 'Research Lab mains power energized.'
        };
        updatedEquipment.fireVentIsolation = {
          ...updatedEquipment.fireVentIsolation,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_RESTORE_DAMPERS',
          details: 'Fire HVAC isolation dampers reset to normal airflow.'
        };
        updatedTeams.fireTeam = {
          ...updatedTeams.fireTeam,
          stage: 'STANDBY',
          progress: 0,
          etaSeconds: 0,
          backupRequested: false
        };
      } else if (zoneId === 'CHEMICAL_LAB') {
        // Section 5: Preserve Chemical Laboratory Isolation
        // The Chemical Laboratory gas isolation valve must remain isolated after general equipment recovery
        // unless the operator separately authorises gas supply reopening.
        updatedEquipment.gasIsolationValve = {
          ...updatedEquipment.gasIsolationValve,
          state: 'ISOLATED',
          controlMode: 'AUTOMATIC',
          lastCommand: 'EQUIPMENT_RECOVERY',
          details: 'Pneumatic valve preserved in safe isolation. Separate authorisation required for reagent line release.'
        };
        updatedEquipment.emergencyVentilation = {
          ...updatedEquipment.emergencyVentilation,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_STOP_VENT',
          details: 'Emergency extraction scrubber reset to standby; normal HVAC active.'
        };
        updatedEquipment.chemicalEquipmentShutdown = {
          ...updatedEquipment.chemicalEquipmentShutdown,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_RESTORE_POWER',
          details: 'Chemical processing reactor and pumps energized to nominal standby.'
        };
        updatedTeams.hazmatTeam = {
          ...updatedTeams.hazmatTeam,
          stage: 'STANDBY',
          progress: 0,
          etaSeconds: 0,
          backupRequested: false
        };
      } else if (zoneId === 'RESTRICTED_STORAGE') {
        updatedEquipment.accessPointLockdown = {
          ...updatedEquipment.accessPointLockdown,
          state: 'STANDBY',
          controlMode: 'AUTOMATIC',
          lastCommand: 'MANUAL_RESTORE_PERIMETER',
          details: 'Access control biometric locks armed in nominal security mode.'
        };
        updatedTeams.securityTeam = {
          ...updatedTeams.securityTeam,
          stage: 'STANDBY',
          progress: 0,
          etaSeconds: 0,
          backupRequested: false,
          assessmentUnderway: false,
          assessmentProgress: 0
        };
      }

      const recoveryEvent: EventLogItem = {
        id: `EVT-REC-OK-${now}-${zoneId}`,
        timestamp: now,
        type: 'EQUIPMENT_RECOVERED',
        zoneId,
        message: `Controlled equipment restoration completed for Zone ${zoneId}. Protection systems armed in AUTOMATIC standby.`,
        severity: 'info'
      };

      audioAlertSystem.playAcknowledgeChime();

      set(s => ({
        protectionEquipment: updatedEquipment,
        responseTeams: updatedTeams,
        zoneRecovery: {
          ...s.zoneRecovery,
          [zoneId]: {
            state: 'RESTORED' as const,
            progress: 100,
            lastRestoredAt: now,
            gasSupplyAuthorised: zoneId === 'CHEMICAL_LAB' ? Boolean(currentRec?.gasSupplyAuthorised) : true
          }
        },
        eventLog: [recoveryEvent, ...s.eventLog].slice(0, 200)
      }));

      return {
        success: true,
        message: zoneId === 'CHEMICAL_LAB'
          ? 'Chemical Lab equipment recovered to standby. Gas supply line safely preserved in isolation.'
          : `Zone ${zoneId} equipment restored to nominal standby.`
      };
    },

    restoreZoneOperations: (zoneId: ZoneId): { success: boolean; message: string } => {
      const now = Date.now();
      const state = get();
      const currentRec = state.zoneRecovery[zoneId];

      if (currentRec?.state === 'RESTORED') {
        return {
          success: true,
          message: `Zone ${ZONES[zoneId]?.name || zoneId} operations are already restored in nominal standby.`
        };
      }

      if (currentRec?.state === 'RESTORING') {
        return {
          success: false,
          message: `Zone ${ZONES[zoneId]?.name || zoneId} operations restoration is already in progress.`
        };
      }

      const result = restoreZoneOperationsInEngine(
        zoneId,
        state.protectionEquipment,
        state.responseTeams,
        state.hazardEnv,
        state.telemetry,
        now
      );

      if (result.success) {
        audioAlertSystem.playAcknowledgeChime();
        set(s => ({
          protectionEquipment: result.nextEquipment,
          responseTeams: result.nextTeams,
          zoneRecovery: {
            ...s.zoneRecovery,
            [zoneId]: {
              state: 'RESTORED',
              progress: 100,
              lastRestoredAt: now,
              gasSupplyAuthorised: zoneId === 'CHEMICAL_LAB' ? Boolean(currentRec?.gasSupplyAuthorised) : true
            }
          },
          eventLog: [...result.newEvents, ...s.eventLog].slice(0, 200),
        }));
        return { success: true, message: result.message };
      } else {
        audioAlertSystem.playWarningBeep();
        return { success: false, message: result.message };
      }
    },

    getClosureValidation: (incidentId: string): ClosureValidationResult | null => {
      const state = get();
      const inc = state.activeIncidents.find(i => i.id === incidentId);
      if (!inc) return null;
      return validateIncidentClosure(inc, state.hazardEnv, state.telemetry);
    },

    authorizeIncidentClosure: (incidentId: string): { success: boolean; message: string } => {
      const now = Date.now();
      const state = get();
      const result = authorizeIncidentClosureInEngine(
        incidentId,
        state.activeIncidents,
        state.hazardEnv,
        state.telemetry,
        now
      );

      if (result.success) {
        audioAlertSystem.playAcknowledgeChime();
        const hasUnack = result.activeIncidents.some(i => !isIncidentAcknowledged(i));
        audioAlertSystem.updateAlarmState(hasUnack);

        set({
          activeIncidents: result.activeIncidents,
          resolvedIncidents: [...result.resolvedIncidents, ...state.resolvedIncidents],
          eventLog: [...result.newEvents, ...state.eventLog].slice(0, 200),
          selectedIncidentId: state.selectedIncidentId === incidentId ? null : state.selectedIncidentId,
        });
        return { success: true, message: result.message };
      } else {
        audioAlertSystem.playWarningBeep();
        return { success: false, message: result.message };
      }
    },

    requestSafetyInspection: (zoneId: ZoneId): ManualInterventionResult => {
      let cmd: ManualInterventionCommandType = 'REQUEST_FIRE_INSPECTION';
      if (zoneId === 'CHEMICAL_LAB') cmd = 'REQUEST_GAS_INSPECTION';
      if (zoneId === 'RESTRICTED_STORAGE') cmd = 'REQUEST_SECURITY_INSPECTION';
      if (zoneId === 'CONTROL_ROOM') cmd = 'REQUEST_MANUAL_EMERGENCY_INSPECTION';
      return get().executeManualIntervention(cmd, zoneId);
    },

    confirmManualAssessment: (incidentId: string, isFalseAlarm: boolean): { success: boolean; message: string } => {
      const now = Date.now();
      const state = get();
      const inc = state.activeIncidents.find(i => i.id === incidentId);
      if (!inc) return { success: false, message: 'Incident not found' };

      const updatedIncidents = state.activeIncidents.map(i => {
        if (i.id === incidentId) {
          return {
            ...i,
            manualAssessmentState: isFalseAlarm ? ('CONFIRMED_FALSE_ALARM' as const) : ('CONFIRMED_REAL' as const),
            details: isFalseAlarm
              ? 'Confirmed FALSE ALARM by operator. Station verified clear.'
              : 'Confirmed REAL EMERGENCY. Response team activation required.',
          };
        }
        return i;
      });

      const updatedTelemetry = {
        ...state.telemetry,
        manualEmergencyActive: isFalseAlarm ? false : state.telemetry.manualEmergencyActive,
      };

      const updatedHazardEnv = {
        ...state.hazardEnv,
        manualEmergencyActive: isFalseAlarm ? false : state.hazardEnv.manualEmergencyActive,
      };

      const event: EventLogItem = {
        id: `EVT-ASSESS-${now}-${incidentId}`,
        timestamp: now,
        type: 'MANUAL_ASSESSMENT_CONFIRMED',
        category: 'MANUAL_EMERGENCY',
        zoneId: inc.zoneId,
        message: isFalseAlarm
          ? `Control Room Operator confirmed manual emergency as FALSE ALARM. Verification clear.`
          : `Control Room Operator confirmed REAL HAZARD for manual emergency alarm.`,
        severity: isFalseAlarm ? 'info' : 'warning',
      };

      set({
        activeIncidents: updatedIncidents,
        telemetry: updatedTelemetry,
        hazardEnv: updatedHazardEnv,
        eventLog: [event, ...state.eventLog].slice(0, 200),
      });

      return {
        success: true,
        message: isFalseAlarm ? 'Confirmed False Alarm' : 'Confirmed Real Emergency',
      };
    },

    triggerManualEmergency: (zoneId: ZoneId = 'CONTROL_ROOM'): void => {
      set(state => ({
        telemetry: {
          ...state.telemetry,
          manualEmergencyActive: true,
          manualEmergencyZone: zoneId,
        },
        hazardEnv: {
          ...state.hazardEnv,
          manualEmergencyActive: true,
          inspectionStatus: {
            ...state.hazardEnv.inspectionStatus,
            [zoneId]: 'NONE',
          },
          inspectionCountdown: {
            ...state.hazardEnv.inspectionCountdown,
            [zoneId]: 0,
          },
        },
        zoneRecovery: {
          ...state.zoneRecovery,
          [zoneId]: { state: 'RECOVERY_LOCKED', progress: 0 }
        }
      }));
    },

    getZoneStatus: (zoneId: ZoneId): ZoneHealthStatus => {
      const { activeIncidents, telemetry } = get();

      // Check sensor faults first
      if (zoneId === 'RESEARCH_LAB' && (telemetry.sensorFaults.temperature || telemetry.sensorFaults.smoke)) {
        return 'fault';
      }
      if (zoneId === 'CHEMICAL_LAB' && telemetry.sensorFaults.gas) {
        return 'fault';
      }
      if (zoneId === 'RESTRICTED_STORAGE' && telemetry.sensorFaults.intrusion) {
        return 'fault';
      }

      // Check active incidents for this zone
      const zoneIncidents = activeIncidents.filter(inc => inc.zoneId === zoneId);
      if (zoneIncidents.length > 0) {
        const hasUnack = zoneIncidents.some(i => !isIncidentAcknowledged(i));
        if (hasUnack) return 'critical';
        return 'acknowledged';
      }

      // Check warnings
      if (zoneId === 'RESEARCH_LAB') {
        const highTemp = telemetry.temperature >= TEMPERATURE_THRESHOLD && !telemetry.smokeDetected;
        const smokeOnly = telemetry.smokeDetected && telemetry.temperature < TEMPERATURE_THRESHOLD;
        if (highTemp || smokeOnly) return 'warning';
      }
      if (zoneId === 'CHEMICAL_LAB') {
        if (telemetry.gasConcentration >= 75 && telemetry.gasConcentration < GAS_THRESHOLD) {
          return 'warning';
        }
      }

      return 'normal';
    },

    getZoneOperationalState: (zoneId: ZoneId): ZoneOperationalState => {
      const { hazardEnv, protectionEquipment, responseTeams, telemetry, activeIncidents, zoneRecovery } = get();
      const rec = zoneRecovery[zoneId] || { state: 'RESTORED' as const, progress: 100 };

      // Diagnostic fault check
      if (
        (zoneId === 'RESEARCH_LAB' && (telemetry.sensorFaults.temperature || telemetry.sensorFaults.smoke)) ||
        (zoneId === 'CHEMICAL_LAB' && telemetry.sensorFaults.gas) ||
        (zoneId === 'RESTRICTED_STORAGE' && telemetry.sensorFaults.intrusion)
      ) {
        return {
          status: 'DIAGNOSTIC_FAULT',
          label: 'DIAGNOSTIC FAULT',
          badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
          dotColor: 'bg-yellow-400',
          details: 'Sensor circuit integrity fault reported. Channel diagnostics in fault condition.',
          hazardState: 'ACTIVE',
          incidentState: 'ACTIVE',
          equipmentState: 'FAULTED',
          recoveryLifecycleState: 'RECOVERY_LOCKED',
          canRestoreEquipment: false,
          recoveryUnmetReasons: ['Sensor channel diagnostic fault active. Diagnostics test required.']
        };
      }

      const zoneIncidents = activeIncidents.filter(inc => inc.zoneId === zoneId);
      const hasAck = zoneIncidents.some(i => isIncidentAcknowledged(i));
      const inspStatus = hazardEnv.inspectionStatus?.[zoneId] ?? 'NONE';
      const isInspectionPassed = inspStatus === 'PASSED';

      let hazardState: ZoneHazardState = 'NORMAL';
      let incidentState: IncidentLifecycleStatus = 'NONE';
      let equipmentState: ZoneEquipmentState = 'OPERATIONAL';
      let canRestoreEquipment = false;
      let recoveryLifecycleState: ZoneRecoveryLifecycleState = rec.state;
      const recoveryUnmetReasons: string[] = [];

      let status: ZoneOperationalStatus = 'NORMAL';
      let label = 'NORMAL OPERATIONS';
      let badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      let dotColor = 'bg-emerald-400';
      let details = 'Zone operating within nominal thresholds. Systems in automated standby.';

      if (zoneId === 'CHEMICAL_LAB') {
        const isReleaseInactive = !hazardEnv.gasSourceActive && (hazardEnv.gasReleaseRate ?? 0) === 0;
        const isSourceIsolated = protectionEquipment.gasIsolationValve.state === 'ISOLATED' || protectionEquipment.gasIsolationValve.state === 'STANDBY';
        const isConcSafe = telemetry.gasConcentration <= 40 && (hazardEnv.gasConcentration ?? 0) <= 40;
        const isHazardContained = isReleaseInactive && isSourceIsolated && isConcSafe;

        const isPurging = protectionEquipment.emergencyVentilation.state === 'OPERATING';
        const isPurgeCompleted = protectionEquipment.emergencyVentilation.state === 'COMPLETED';

        if (protectionEquipment.gasIsolationValve.state === 'FAILED') {
          equipmentState = 'FAULTED';
        } else if (isPurging) {
          equipmentState = 'AUTOMATICALLY_ACTIVATED';
        } else if (protectionEquipment.gasIsolationValve.state === 'ISOLATED') {
          equipmentState = 'ISOLATED';
        } else if (protectionEquipment.chemicalEquipmentShutdown.state === 'OPERATING') {
          equipmentState = 'SHUTDOWN';
        } else if (isPurgeCompleted) {
          equipmentState = 'RECOVERY_PENDING';
        } else {
          equipmentState = 'OPERATIONAL';
        }

        if (isHazardContained) {
          hazardState = isInspectionPassed ? 'VERIFIED_SAFE' : 'CONTAINED';
        } else if (hazardEnv.gasSourceActive || (hazardEnv.gasReleaseRate ?? 0) > 0 || protectionEquipment.gasIsolationValve.state === 'FAILED') {
          hazardState = 'ACTIVE';
        } else if (isPurging) {
          hazardState = 'MITIGATING';
        } else if (telemetry.gasConcentration > 40 || zoneIncidents.length > 0) {
          hazardState = 'ACTIVE';
        } else {
          hazardState = 'NORMAL';
        }

        if (zoneIncidents.length === 0) {
          incidentState = 'NONE';
        } else if (isInspectionPassed) {
          incidentState = 'VERIFIED_AWAITING_CLOSURE';
        } else if (isHazardContained) {
          incidentState = hasAck ? 'VERIFICATION_PENDING' : 'CONTAINMENT_CONFIRMED';
        } else if (hasAck) {
          incidentState = 'ACKNOWLEDGED';
        } else {
          incidentState = 'ACTIVE';
        }

        const isManualActiveHere = telemetry.manualEmergencyActive && (telemetry.manualEmergencyZone === 'CHEMICAL_LAB' || telemetry.manualEmergencyZone === 'CONTROL_ROOM');
        if (!isReleaseInactive) recoveryUnmetReasons.push(`Gas release active (Rate: ${hazardEnv.gasReleaseRate ?? 0})`);
        if (!isSourceIsolated) recoveryUnmetReasons.push(`Gas isolation valve unconfirmed (State: ${protectionEquipment.gasIsolationValve.state})`);
        if (!isConcSafe) recoveryUnmetReasons.push(`Gas concentration ${telemetry.gasConcentration.toFixed(0)}/255 exceeds safe limit (<= 40)`);
        if (!isInspectionPassed) recoveryUnmetReasons.push('Safety verification inspection (5s inspection) not completed');
        if (zoneIncidents.length > 0) recoveryUnmetReasons.push('Active emergency incident awaiting operator closure authorization');
        if (isManualActiveHere) recoveryUnmetReasons.push('Manual emergency alarm active in zone');

        // Prerequisites for recovery
        const prereqsMet = isHazardContained && isInspectionPassed && zoneIncidents.length === 0 && !isManualActiveHere;

        // Evaluate authoritative lifecycle state
        const hasActiveEmergency = hazardEnv.gasSourceActive ||
          (hazardEnv.gasReleaseRate ?? 0) > 0 ||
          telemetry.gasConcentration > 40 ||
          protectionEquipment.emergencyVentilation.state === 'OPERATING' ||
          protectionEquipment.emergencyVentilation.state === 'COMPLETED' ||
          protectionEquipment.chemicalEquipmentShutdown.state === 'OPERATING' ||
          protectionEquipment.gasIsolationValve.state === 'FAILED' ||
          zoneIncidents.length > 0;
        const effectiveRecState = hasActiveEmergency ? 'RECOVERY_LOCKED' : rec.state;

        if (effectiveRecState === 'RESTORED') {
          recoveryLifecycleState = 'RESTORED';
          canRestoreEquipment = false;
          recoveryUnmetReasons.length = 0;
          status = 'NORMAL';
          label = 'NORMAL OPERATIONS';
          badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
          dotColor = 'bg-emerald-400';
          details = protectionEquipment.gasIsolationValve.state === 'ISOLATED'
            ? `Normal operations. Gas feedline safely isolated in standby (Atmosphere safe: ${telemetry.gasConcentration.toFixed(0)}/255). Reopening requires separate authorisation.`
            : 'Zone operating within nominal thresholds. Systems in automated standby.';
          hazardState = 'NORMAL';
          equipmentState = 'OPERATIONAL';
          incidentState = 'NONE';
        } else if (effectiveRecState === 'RESTORING') {
          recoveryLifecycleState = 'RESTORING';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RESTORING EQUIPMENT';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400 animate-pulse';
          details = 'Equipment restoration sequence underway. Systems recharging to standby.';
        } else if (effectiveRecState === 'RECOVERY_FAILED') {
          recoveryLifecycleState = 'RECOVERY_FAILED';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RECOVERY FAILED';
          badgeClass = 'bg-red-500/20 text-red-300 border-red-500/50';
          dotColor = 'bg-red-400';
          details = rec.failureReason || 'Equipment restoration failed. Check safety conditions and retry.';
        } else if (prereqsMet) {
          recoveryLifecycleState = 'RECOVERY_PERMITTED';
          canRestoreEquipment = true;
          recoveryUnmetReasons.length = 0;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'INCIDENT RESOLVED — RECOVERY PENDING';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400';
          details = 'Incident closed. Equipment recovery permitted. Execute Restore Zone Equipment.';
        } else {
          recoveryLifecycleState = 'RECOVERY_LOCKED';
          canRestoreEquipment = false;
          if (hazardState === 'ACTIVE') {
            status = 'ACTIVE_HAZARD';
            label = 'ACTIVE HAZARD';
            badgeClass = 'bg-red-500/20 text-red-400 border-red-500/50';
            dotColor = 'bg-red-500 animate-ping';
            details = (hazardEnv.gasSourceActive || (hazardEnv.gasReleaseRate ?? 0) > 0 || protectionEquipment.gasIsolationValve.state === 'FAILED')
              ? `Toxic gas release active (Source leaking, sensor concentration ${telemetry.gasConcentration.toFixed(0)}/255 scale). Hazard isolation required.`
              : `Atmospheric purge required (Source isolated, gas concentration ${telemetry.gasConcentration.toFixed(0)}/255 exceeds 40 threshold).`;
          } else if (hazardState === 'MITIGATING' || isPurging) {
            status = 'RESPONSE_IN_PROGRESS';
            label = 'RESPONSE IN PROGRESS';
            badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = `Atmospheric purge ongoing (Extraction scrubbers running, gas concentration ${telemetry.gasConcentration.toFixed(0)}/255 scale).`;
          } else if (hazardState === 'CONTAINED' && !isInspectionPassed) {
            status = 'AWAITING_SAFETY_VERIFICATION';
            label = 'AWAITING SAFETY VERIFICATION';
            badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = `Hazard contained (Source isolated, gas concentration ${telemetry.gasConcentration.toFixed(0)}/255 <= 40). Authorised safety verification required.`;
          } else if (hazardState === 'VERIFIED_SAFE' && zoneIncidents.length > 0) {
            status = 'VERIFIED_SAFE_AWAITING_CLOSURE';
            label = 'VERIFIED SAFE — AWAITING CLOSURE';
            badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
            dotColor = 'bg-cyan-400';
            details = 'Safety verification inspection passed. Authorise emergency closure in Incident Management to proceed.';
          } else {
            status = 'NORMAL';
            label = 'NORMAL OPERATIONS';
            badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            dotColor = 'bg-emerald-400';
            details = 'Zone operating within nominal thresholds. Systems in automated standby.';
          }
        }
      } else if (zoneId === 'RESEARCH_LAB') {
        const isFireExtinguished = !hazardEnv.fireIgnited && hazardEnv.fireIntensity === 0;
        const isTempSafe = telemetry.temperature < 45;
        const isSmokeSafe = !telemetry.smokeDetected && hazardEnv.smokeConcentration === 0;
        const isHazardContained = isFireExtinguished && isTempSafe && isSmokeSafe;

        const isSuppressing = protectionEquipment.fireSuppression.state === 'OPERATING';

        if (protectionEquipment.fireSuppression.state === 'FAILED') {
          equipmentState = 'FAULTED';
        } else if (isSuppressing) {
          equipmentState = 'AUTOMATICALLY_ACTIVATED';
        } else if (protectionEquipment.labEquipmentShutdown.state === 'OPERATING') {
          equipmentState = 'SHUTDOWN';
        } else if (protectionEquipment.fireVentIsolation.state === 'OPERATING') {
          equipmentState = 'ISOLATED';
        } else if (protectionEquipment.fireSuppression.state === 'COMPLETED') {
          equipmentState = 'RECOVERY_PENDING';
        } else {
          equipmentState = 'OPERATIONAL';
        }

        if (isHazardContained) {
          hazardState = isInspectionPassed ? 'VERIFIED_SAFE' : 'CONTAINED';
        } else if (isSuppressing || responseTeams.fireTeam.stage === 'INTERVENTION_UNDERWAY') {
          hazardState = 'MITIGATING';
        } else if (hazardEnv.fireIgnited || hazardEnv.fireIntensity > 0 || telemetry.temperature >= 45 || zoneIncidents.length > 0) {
          hazardState = 'ACTIVE';
        } else {
          hazardState = 'NORMAL';
        }

        if (zoneIncidents.length === 0) {
          incidentState = 'NONE';
        } else if (isInspectionPassed) {
          incidentState = 'VERIFIED_AWAITING_CLOSURE';
        } else if (isHazardContained) {
          incidentState = hasAck ? 'VERIFICATION_PENDING' : 'CONTAINMENT_CONFIRMED';
        } else if (hasAck) {
          incidentState = 'ACKNOWLEDGED';
        } else {
          incidentState = 'ACTIVE';
        }

        const isManualActiveHere = telemetry.manualEmergencyActive && (telemetry.manualEmergencyZone === 'RESEARCH_LAB' || telemetry.manualEmergencyZone === 'CONTROL_ROOM');
        if (!isFireExtinguished) recoveryUnmetReasons.push(`Fire still ignited (Intensity: ${hazardEnv.fireIntensity}%)`);
        if (!isTempSafe) recoveryUnmetReasons.push(`Temperature ${telemetry.temperature.toFixed(1)}°C exceeds threshold (< 45°C)`);
        if (!isSmokeSafe) recoveryUnmetReasons.push('Smoke cleared condition unmet');
        if (!isInspectionPassed) recoveryUnmetReasons.push('Safety verification inspection (5s inspection) not completed');
        if (zoneIncidents.length > 0) recoveryUnmetReasons.push('Active emergency incident awaiting operator closure authorization');
        if (isManualActiveHere) recoveryUnmetReasons.push('Manual emergency alarm active in zone');

        const prereqsMet = isHazardContained && isInspectionPassed && zoneIncidents.length === 0 && !isManualActiveHere;

        const hasActiveEmergency = hazardEnv.fireIgnited ||
          (hazardEnv.fireIntensity ?? 0) > 0 ||
          telemetry.temperature >= 45 ||
          telemetry.smokeDetected ||
          protectionEquipment.fireSuppression.state === 'OPERATING' ||
          protectionEquipment.labEquipmentShutdown.state === 'OPERATING' ||
          protectionEquipment.fireVentIsolation.state === 'OPERATING' ||
          zoneIncidents.length > 0;
        const effectiveRecState = hasActiveEmergency ? 'RECOVERY_LOCKED' : rec.state;

        if (effectiveRecState === 'RESTORED') {
          recoveryLifecycleState = 'RESTORED';
          canRestoreEquipment = false;
          recoveryUnmetReasons.length = 0;
          status = 'NORMAL';
          label = 'NORMAL OPERATIONS';
          badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
          dotColor = 'bg-emerald-400';
          details = 'Zone operating within nominal thresholds. Systems in automated standby.';
          hazardState = 'NORMAL';
          equipmentState = 'OPERATIONAL';
          incidentState = 'NONE';
        } else if (effectiveRecState === 'RESTORING') {
          recoveryLifecycleState = 'RESTORING';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RESTORING EQUIPMENT';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400 animate-pulse';
          details = 'Equipment restoration sequence underway. Systems recharging to standby.';
        } else if (effectiveRecState === 'RECOVERY_FAILED') {
          recoveryLifecycleState = 'RECOVERY_FAILED';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RECOVERY FAILED';
          badgeClass = 'bg-red-500/20 text-red-300 border-red-500/50';
          dotColor = 'bg-red-400';
          details = rec.failureReason || 'Equipment restoration failed. Check safety conditions and retry.';
        } else if (prereqsMet) {
          recoveryLifecycleState = 'RECOVERY_PERMITTED';
          canRestoreEquipment = true;
          recoveryUnmetReasons.length = 0;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'INCIDENT RESOLVED — RECOVERY PENDING';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400';
          details = 'Incident closed. Equipment recovery permitted. Execute Restore Zone Equipment.';
        } else {
          recoveryLifecycleState = 'RECOVERY_LOCKED';
          canRestoreEquipment = false;
          if (hazardState === 'ACTIVE') {
            status = 'ACTIVE_HAZARD';
            label = 'ACTIVE HAZARD';
            badgeClass = 'bg-red-500/20 text-red-400 border-red-500/50';
            dotColor = 'bg-red-500 animate-ping';
            details = `Thermal runaway/fire active (${telemetry.temperature.toFixed(1)}°C, intensity ${hazardEnv.fireIntensity}%). Suppression active.`;
          } else if (hazardState === 'MITIGATING' || isSuppressing) {
            status = 'RESPONSE_IN_PROGRESS';
            label = 'RESPONSE IN PROGRESS';
            badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = 'Deluge foam mist discharging. Thermal hazard cooling underway.';
          } else if (hazardState === 'CONTAINED' && !isInspectionPassed) {
            status = 'AWAITING_SAFETY_VERIFICATION';
            label = 'AWAITING SAFETY VERIFICATION';
            badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = 'Fire extinguished & thermal hazard contained. Safety verification inspection required.';
          } else if (hazardState === 'VERIFIED_SAFE' && zoneIncidents.length > 0) {
            status = 'VERIFIED_SAFE_AWAITING_CLOSURE';
            label = 'VERIFIED SAFE — AWAITING CLOSURE';
            badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
            dotColor = 'bg-cyan-400';
            details = 'Fire safety inspection passed. Authorise emergency closure in Incident Management to proceed.';
          } else {
            status = 'NORMAL';
            label = 'NORMAL OPERATIONS';
            badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            dotColor = 'bg-emerald-400';
            details = 'Zone operating within nominal thresholds. Systems in automated standby.';
          }
        }
      } else if (zoneId === 'RESTRICTED_STORAGE') {
        const isSecured = !hazardEnv.intrusionBreachActive && !telemetry.intrusionDetected;
        const isAssessmentComplete = Boolean(responseTeams.securityTeam.assessmentCompleted || (responseTeams.securityTeam.assessmentProgress ?? 0) >= 100);

        if (protectionEquipment.accessPointLockdown.state === 'FAILED') {
          equipmentState = 'FAULTED';
        } else if (protectionEquipment.accessPointLockdown.state === 'OPERATING') {
          equipmentState = 'ISOLATED';
        } else {
          equipmentState = 'OPERATIONAL';
        }

        const hasActiveBreach = hazardEnv.intrusionBreachActive || telemetry.intrusionDetected;

        if (hasActiveBreach) {
          hazardState = 'ACTIVE';
        } else if (!isAssessmentComplete) {
          hazardState = 'MITIGATING';
        } else {
          hazardState = isInspectionPassed ? 'VERIFIED_SAFE' : 'CONTAINED';
        }

        if (zoneIncidents.length === 0) {
          incidentState = 'NONE';
        } else if (isInspectionPassed) {
          incidentState = 'VERIFIED_AWAITING_CLOSURE';
        } else if (isAssessmentComplete) {
          incidentState = hasAck ? 'VERIFICATION_PENDING' : 'CONTAINMENT_CONFIRMED';
        } else if (hasAck) {
          incidentState = 'ACKNOWLEDGED';
        } else {
          incidentState = 'ACTIVE';
        }

        const isManualActiveHere = telemetry.manualEmergencyActive && (telemetry.manualEmergencyZone === 'RESTRICTED_STORAGE' || telemetry.manualEmergencyZone === 'CONTROL_ROOM');
        if (!isSecured) recoveryUnmetReasons.push('Perimeter intrusion breach active');
        if (!isAssessmentComplete) recoveryUnmetReasons.push('Tactical security assessment not completed');
        if (!isInspectionPassed) recoveryUnmetReasons.push('Area security verification inspection not completed');
        if (zoneIncidents.length > 0) recoveryUnmetReasons.push('Active emergency incident awaiting operator closure authorization');
        if (isManualActiveHere) recoveryUnmetReasons.push('Manual emergency alarm active in zone');

        const prereqsMet = isSecured && isAssessmentComplete && isInspectionPassed && zoneIncidents.length === 0 && !isManualActiveHere;

        const hasActiveEmergency = hazardEnv.intrusionBreachActive ||
          telemetry.intrusionDetected ||
          protectionEquipment.accessPointLockdown.state === 'OPERATING' ||
          protectionEquipment.accessPointLockdown.state === 'FAILED' ||
          zoneIncidents.length > 0;
        const effectiveRecState = hasActiveEmergency ? 'RECOVERY_LOCKED' : rec.state;

        if (effectiveRecState === 'RESTORED') {
          recoveryLifecycleState = 'RESTORED';
          canRestoreEquipment = false;
          recoveryUnmetReasons.length = 0;
          status = 'NORMAL';
          label = 'NORMAL OPERATIONS';
          badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
          dotColor = 'bg-emerald-400';
          details = 'Zone operating within nominal thresholds. Systems in automated standby.';
          hazardState = 'NORMAL';
          equipmentState = 'OPERATIONAL';
          incidentState = 'NONE';
        } else if (effectiveRecState === 'RESTORING') {
          recoveryLifecycleState = 'RESTORING';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RESTORING EQUIPMENT';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400 animate-pulse';
          details = 'Access control security reset underway.';
        } else if (effectiveRecState === 'RECOVERY_FAILED') {
          recoveryLifecycleState = 'RECOVERY_FAILED';
          canRestoreEquipment = false;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'RECOVERY FAILED';
          badgeClass = 'bg-red-500/20 text-red-300 border-red-500/50';
          dotColor = 'bg-red-400';
          details = rec.failureReason || 'Security system recovery failed.';
        } else if (prereqsMet) {
          recoveryLifecycleState = 'RECOVERY_PERMITTED';
          canRestoreEquipment = true;
          recoveryUnmetReasons.length = 0;
          status = 'INCIDENT_RESOLVED_RECOVERY_PENDING';
          label = 'INCIDENT RESOLVED — RECOVERY PENDING';
          badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/50';
          dotColor = 'bg-purple-400';
          details = 'Incident closed. Equipment recovery permitted. Execute Restore Zone Equipment.';
        } else {
          recoveryLifecycleState = 'RECOVERY_LOCKED';
          canRestoreEquipment = false;
          if (hazardState === 'ACTIVE') {
            status = 'ACTIVE_HAZARD';
            label = 'ACTIVE HAZARD';
            badgeClass = 'bg-red-500/20 text-red-400 border-red-500/50';
            dotColor = 'bg-red-500 animate-ping';
            details = 'Unauthorized perimeter breach detected. Security intervention active.';
          } else if (hazardState === 'MITIGATING') {
            status = 'RESPONSE_IN_PROGRESS';
            label = 'RESPONSE IN PROGRESS';
            badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = responseTeams.securityTeam.assessmentUnderway
              ? `Tactical area assessment underway in Restricted Storage (${responseTeams.securityTeam.assessmentProgress || 0}%).`
              : 'Security team on site. Tactical area assessment required before safety verification.';
          } else if (hazardState === 'CONTAINED' && !isInspectionPassed) {
            status = 'AWAITING_SAFETY_VERIFICATION';
            label = 'AWAITING SAFETY VERIFICATION';
            badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
            dotColor = 'bg-amber-400';
            details = 'Perimeter secured. Tactical area assessment completed. Safety verification inspection required.';
          } else if (hazardState === 'VERIFIED_SAFE' && zoneIncidents.length > 0) {
            status = 'VERIFIED_SAFE_AWAITING_CLOSURE';
            label = 'VERIFIED SAFE — AWAITING CLOSURE';
            badgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
            dotColor = 'bg-cyan-400';
            details = 'Security sweep verified clear. Authorise emergency closure in Incident Management to proceed.';
          } else {
            status = 'NORMAL';
            label = 'NORMAL OPERATIONS';
            badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            dotColor = 'bg-emerald-400';
            details = 'Zone operating within nominal thresholds. Systems in automated standby.';
          }
        }
      } else if (zoneId === 'CONTROL_ROOM') {
        const isManual = telemetry.manualEmergencyActive;
        if (isManual) {
          status = 'ACTIVE_HAZARD';
          label = 'ACTIVE HAZARD';
          badgeClass = 'bg-purple-500/20 text-purple-400 border-purple-500/50';
          dotColor = 'bg-purple-500 animate-ping';
          details = 'Facility-wide manual emergency broadcast active.';
          hazardState = 'ACTIVE';
          incidentState = 'ACTIVE';
          recoveryLifecycleState = 'RECOVERY_LOCKED';
          canRestoreEquipment = false;
          recoveryUnmetReasons.push('Manual emergency alarm actively latched');
        } else {
          status = 'NORMAL';
          label = 'NORMAL OPERATIONS';
          badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
          dotColor = 'bg-emerald-400';
          details = 'Supervisory consoles nominal. Control room operational.';
          hazardState = 'NORMAL';
          incidentState = 'NONE';
          recoveryLifecycleState = 'RESTORED';
          canRestoreEquipment = false;
        }
      }

      return {
        status,
        label,
        badgeClass,
        dotColor,
        details,
        hazardState,
        incidentState,
        equipmentState,
        recoveryLifecycleState,
        canRestoreEquipment,
        recoveryUnmetReasons
      };
    },

    getHighestPriorityIncident: () => {
      const { activeIncidents } = get();
      if (activeIncidents.length === 0) return undefined;
      return activeIncidents[0];
    },

    getPendingOperatorActions: (): PendingOperatorAction[] => {
      const state = get();
      const { activeIncidents, responseTeams, hazardEnv, telemetry } = state;
      const actions: PendingOperatorAction[] = [];

      // 1. Unacknowledged incidents
      for (const inc of activeIncidents) {
        if (!isIncidentAcknowledged(inc)) {
          let priority = 4;
          if (inc.category === 'MANUAL_EMERGENCY') priority = 1;
          else if (inc.category === 'FIRE') priority = 2;
          else if (inc.category === 'GAS_LEAKAGE') priority = 3;
          else if (inc.category === 'INTRUSION') priority = 4;

          actions.push({
            id: `act-ack-${inc.id}`,
            priority,
            incidentId: inc.id,
            zoneId: inc.zoneId,
            category: inc.category,
            stage: 'ACKNOWLEDGEMENT',
            badgeType: 'critical',
            title: 'EMERGENCY ACKNOWLEDGEMENT REQUIRED',
            description: `${ZONES[inc.zoneId]?.name || inc.zoneId}: Unacknowledged ${inc.category.replace('_', ' ')} incident requires immediate operator acknowledgement.`,
            actionLabel: 'Proceed to Acknowledgement',
            destinationView: 'incident-management',
            sectionId: `section-incident-${inc.id}`,
            targetControlId: `action-ack-${inc.id}`,
          });
        }
      }

      // 2. Manual Trip Active (Trip Clearance Action)
      const manInc = activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
      if (manInc && isIncidentAcknowledged(manInc) && (telemetry.manualEmergencyActive || hazardEnv.manualEmergencyActive)) {
        actions.push({
          id: `act-trip-clear-${manInc.id}`,
          priority: 1,
          incidentId: manInc.id,
          zoneId: 'CONTROL_ROOM',
          category: 'MANUAL_EMERGENCY',
          stage: 'CLEAR_MANUAL_TRIP',
          badgeType: 'critical',
          title: 'MANUAL EMERGENCY TRIP ACTIVE',
          description: 'ZN-04 Control Room: Manual trip switch is actively tripped. Clear the physical station trip switch before safety inspection.',
          actionLabel: 'Clear Manual Emergency Trip',
          destinationView: 'operations',
          sectionId: 'section-manual-trip',
          targetControlId: 'action-clear-manual-trip',
        });
      }

      // 3. Security Assessment Ready
      const secTeam = responseTeams.securityTeam;
      const isSecOnSite = secTeam.stage === 'ON_SITE' || secTeam.stage === 'INTERVENTION_UNDERWAY' || secTeam.stage === 'RESPONSE_COMPLETED';
      if (isSecOnSite && !secTeam.assessmentCompleted && !secTeam.assessmentUnderway) {
        actions.push({
          id: 'act-sec-assess-RESTRICTED_STORAGE',
          priority: 4,
          zoneId: 'RESTRICTED_STORAGE',
          category: 'INTRUSION',
          stage: 'SECURITY_ASSESSMENT',
          badgeType: 'action_required',
          title: 'SECURITY ASSESSMENT REQUIRED',
          description: 'ZN-03 Restricted Storage: The security team is on site. Tactical area assessment can begin.',
          actionLabel: 'Proceed to Area Assessment',
          destinationView: 'operations',
          sectionId: 'section-security-assessment',
          targetControlId: 'action-assess-RESTRICTED_STORAGE',
        });
      }

      // 4. Safety Verification Ready
      // A: Security verification ready
      const secAssessmentDone = Boolean(secTeam.assessmentCompleted || (secTeam.assessmentProgress ?? 0) >= 100);
      const secInspStatus = hazardEnv.inspectionStatus?.RESTRICTED_STORAGE;
      if (secAssessmentDone && secInspStatus !== 'PASSED' && secInspStatus !== 'IN_PROGRESS') {
        const secInc = activeIncidents.find(i => i.zoneId === 'RESTRICTED_STORAGE');
        actions.push({
          id: 'act-sec-verify-RESTRICTED_STORAGE',
          priority: 4,
          incidentId: secInc?.id,
          zoneId: 'RESTRICTED_STORAGE',
          category: 'INTRUSION',
          stage: 'SAFETY_INSPECTION',
          badgeType: 'action_required',
          title: 'TACTICAL ASSESSMENT COMPLETED',
          description: 'ZN-03 Restricted Storage: The area assessment is complete. Final security verification is required.',
          actionLabel: 'Proceed to Security Verification',
          destinationView: secInc ? 'incident-management' : 'command-centre',
          sectionId: secInc ? `section-incident-${secInc.id}` : 'section-recovery-RESTRICTED_STORAGE',
          targetControlId: 'action-inspect-RESTRICTED_STORAGE',
        });
      }

      // B: Fire / Gas safety verification ready
      const fireInspStatus = hazardEnv.inspectionStatus?.RESEARCH_LAB;
      const isFireContained = !hazardEnv.fireIgnited && (hazardEnv.fireIntensity ?? 0) === 0 && telemetry.temperature < 45 && !telemetry.smokeDetected;
      if (isFireContained && fireInspStatus !== 'PASSED' && fireInspStatus !== 'IN_PROGRESS') {
        const hasFireInc = activeIncidents.find(i => i.zoneId === 'RESEARCH_LAB');
        if (hasFireInc) {
          actions.push({
            id: 'act-fire-verify-RESEARCH_LAB',
            priority: 2,
            incidentId: hasFireInc.id,
            zoneId: 'RESEARCH_LAB',
            category: 'FIRE',
            stage: 'SAFETY_INSPECTION',
            badgeType: 'action_required',
            title: 'FIRE CONTAINED — VERIFICATION REQUIRED',
            description: 'ZN-01 Research Laboratory: Fire extinguished and temperatures safe. 5-second certified safety inspection required.',
            actionLabel: 'Proceed to Safety Verification',
            destinationView: 'incident-management',
            sectionId: `section-incident-${hasFireInc.id}`,
            targetControlId: 'action-inspect-RESEARCH_LAB',
          });
        }
      }

      const gasInspStatus = hazardEnv.inspectionStatus?.CHEMICAL_LAB;
      const isGasContained = !hazardEnv.gasSourceActive && (hazardEnv.gasReleaseRate ?? 0) === 0 && telemetry.gasConcentration <= 40;
      if (isGasContained && gasInspStatus !== 'PASSED' && gasInspStatus !== 'IN_PROGRESS') {
        const hasGasInc = activeIncidents.find(i => i.zoneId === 'CHEMICAL_LAB');
        if (hasGasInc) {
          actions.push({
            id: 'act-gas-verify-CHEMICAL_LAB',
            priority: 3,
            incidentId: hasGasInc.id,
            zoneId: 'CHEMICAL_LAB',
            category: 'GAS_LEAKAGE',
            stage: 'SAFETY_INSPECTION',
            badgeType: 'action_required',
            title: 'GAS CONTAINED — VERIFICATION REQUIRED',
            description: 'ZN-02 Chemical Laboratory: Toxic gas isolated and concentration safe. Atmospheric verification inspection required.',
            actionLabel: 'Proceed to Safety Verification',
            destinationView: 'incident-management',
            sectionId: `section-incident-${hasGasInc.id}`,
            targetControlId: 'action-inspect-CHEMICAL_LAB',
          });
        }
      }

      // C: Control Room manual emergency verification ready
      const manInspStatus = hazardEnv.inspectionStatus?.CONTROL_ROOM;
      const isManTripClear = !telemetry.manualEmergencyActive && !hazardEnv.manualEmergencyActive;
      if (manInc && isIncidentAcknowledged(manInc) && isManTripClear && manInspStatus !== 'PASSED' && manInspStatus !== 'IN_PROGRESS') {
        actions.push({
          id: 'act-manual-verify-CONTROL_ROOM',
          priority: 1,
          incidentId: manInc.id,
          zoneId: 'CONTROL_ROOM',
          category: 'MANUAL_EMERGENCY',
          stage: 'SAFETY_INSPECTION',
          badgeType: 'action_required',
          title: 'TRIP CLEARED — VERIFICATION REQUIRED',
          description: 'ZN-04 Control Room: Manual emergency trip cleared. 5-second certified safety inspection required.',
          actionLabel: 'Proceed to Safety Verification',
          destinationView: 'incident-management',
          sectionId: `section-incident-${manInc.id}`,
          targetControlId: 'action-inspect-CONTROL_ROOM',
        });
      }

      // 5. Incident Closure Authorisation
      for (const inc of activeIncidents) {
        if (isIncidentAcknowledged(inc) && !inc.closureAuthorizedAt && inc.state !== 'RESOLVED') {
          const inspStatus = hazardEnv.inspectionStatus?.[inc.zoneId];
          const isVerifiedSafe = inspStatus === 'PASSED';

          if (isVerifiedSafe) {
            let priority = 4;
            if (inc.category === 'MANUAL_EMERGENCY') priority = 1;
            else if (inc.category === 'FIRE') priority = 2;
            else if (inc.category === 'GAS_LEAKAGE') priority = 3;
            else if (inc.category === 'INTRUSION') priority = 4;

            actions.push({
              id: `act-close-${inc.id}`,
              priority,
              incidentId: inc.id,
              zoneId: inc.zoneId,
              category: inc.category,
              stage: 'CLOSURE',
              badgeType: 'action_required',
              title: inc.category === 'INTRUSION' ? 'SECURITY VERIFICATION PASSED' : 'SAFETY VERIFICATION PASSED',
              description: `${ZONES[inc.zoneId]?.name || inc.zoneId}: The area has been verified safe. Operator closure authorisation is required.`,
              actionLabel: 'Proceed to Emergency Closure',
              destinationView: 'incident-management',
              sectionId: `section-incident-${inc.id}`,
              targetControlId: `action-close-${inc.id}`,
            });
          }
        }
      }

      // 6. Alarm Reset (only when fully eligible: condition cleared, ack, verified, and closure authorised)
      for (const inc of activeIncidents) {
        const resetVal = validateResetEligibility(inc, hazardEnv);
        if (resetVal.canReset && inc.state !== 'RESOLVED') {
          let priority = 4;
          if (inc.category === 'MANUAL_EMERGENCY') priority = 1;
          else if (inc.category === 'FIRE') priority = 2;
          else if (inc.category === 'GAS_LEAKAGE') priority = 3;
          else if (inc.category === 'INTRUSION') priority = 4;

          actions.push({
            id: `act-reset-${inc.id}`,
            priority,
            incidentId: inc.id,
            zoneId: inc.zoneId,
            category: inc.category,
            stage: 'ALARM_RESET',
            badgeType: 'action_required',
            title: 'EMERGENCY CLOSURE AUTHORISED',
            description: `${ZONES[inc.zoneId]?.name || inc.zoneId}: Safety verification passed and closure authorised. Reset retained alarm latch to normalise.`,
            actionLabel: 'Proceed to Alarm Reset',
            destinationView: 'incident-management',
            sectionId: `section-incident-${inc.id}`,
            targetControlId: `action-reset-${inc.id}`,
          });
        }
      }

      // 6. Equipment Recovery
      const zoneIds: ZoneId[] = ['RESEARCH_LAB', 'CHEMICAL_LAB', 'RESTRICTED_STORAGE', 'CONTROL_ROOM'];
      for (const zid of zoneIds) {
        const opState = state.getZoneOperationalState(zid);
        if (opState.canRestoreEquipment && opState.recoveryLifecycleState === 'RECOVERY_PERMITTED') {
          let priority = 4;
          let cat: EmergencyCategory = 'INTRUSION';
          if (zid === 'CONTROL_ROOM') { priority = 1; cat = 'MANUAL_EMERGENCY'; }
          else if (zid === 'RESEARCH_LAB') { priority = 2; cat = 'FIRE'; }
          else if (zid === 'CHEMICAL_LAB') { priority = 3; cat = 'GAS_LEAKAGE'; }

          actions.push({
            id: `act-recover-${zid}`,
            priority,
            zoneId: zid,
            category: cat,
            stage: 'EQUIPMENT_RECOVERY',
            badgeType: 'info',
            title: 'EMERGENCY CLOSURE AUTHORISED',
            description: `${ZONES[zid]?.name || zid}: Equipment recovery is available after the required safety conditions are satisfied.`,
            actionLabel: 'Proceed to Equipment Recovery',
            destinationView: 'command-centre',
            sectionId: `section-recovery-${zid}`,
            targetControlId: `action-recover-${zid}`,
          });
        }
      }

      // Sort strictly by priority: 1 (Manual), 2 (Fire), 3 (Gas), 4 (Security)
      const sorted = actions.sort((a, b) => a.priority - b.priority);
      const seen = new Set<string>();
      return sorted.filter(act => {
        const key = `${act.incidentId || act.zoneId}-${act.stage}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  };
});
