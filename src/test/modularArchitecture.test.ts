import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FACILITY_ZONES, NOMINAL_BASELINE_TELEMETRY } from '../core/facilityModel';
import { evaluateDetection } from '../core/detectionEngine';
import { stepProtectionController } from '../core/protectionController';
import { advanceTeamDispatch } from '../core/responseDispatchEngine';
import { validateIncidentClosure, authorizeIncidentClosure } from '../core/incidentManagementEngine';
import { restoreZoneOperations } from '../core/recoveryController';
import { simulationScheduler } from '../core/simulationScheduler';
import { useSentinelStore } from '../store/useSentinelStore';
import { INITIAL_HAZARD_ENVIRONMENT, INITIAL_PROTECTION_EQUIPMENT, INITIAL_RESPONSE_TEAMS, INITIAL_FAILURE_CONFIG } from '../core/hazardSimulationEngine';
import type { IncidentRecord, HazardEnvironment, EquipmentFailureConfig, ResponseTeam } from '../types';

describe('SENTINEL 10-Module Decoupled Architecture Verification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSentinelStore.getState().resetSimulation();
  });

  afterEach(() => {
    simulationScheduler.stop();
    vi.useRealTimers();
  });

  it('Module A (Facility Model): defines all four zones and baseline telemetry', () => {
    expect(FACILITY_ZONES.RESEARCH_LAB.code).toBe('ZN-01');
    expect(FACILITY_ZONES.CHEMICAL_LAB.code).toBe('ZN-02');
    expect(FACILITY_ZONES.RESTRICTED_STORAGE.code).toBe('ZN-03');
    expect(FACILITY_ZONES.CONTROL_ROOM.code).toBe('ZN-04');

    expect(NOMINAL_BASELINE_TELEMETRY.temperature).toBe(25);
    expect(NOMINAL_BASELINE_TELEMETRY.gasConcentration).toBe(20);
    expect(NOMINAL_BASELINE_TELEMETRY.smokeDetected).toBe(false);
    expect(NOMINAL_BASELINE_TELEMETRY.intrusionDetected).toBe(false);
  });

  it('Module C (Detection Engine): purely evaluates confirmed fire vs warnings', () => {
    // 1. High temp alone: warning only, not confirmed fire
    const res1 = evaluateDetection(
      { ...NOMINAL_BASELINE_TELEMETRY, temperature: 75, smokeDetected: false },
      []
    );
    expect(res1.detectedIncidents.length).toBe(0);
    expect(res1.highTemperatureWarning).toBe(true);
    expect(res1.smokeWarning).toBe(false);

    // 2. Smoke alone: warning only, not confirmed fire
    const res2 = evaluateDetection(
      { ...NOMINAL_BASELINE_TELEMETRY, temperature: 30, smokeDetected: true },
      []
    );
    expect(res2.detectedIncidents.length).toBe(0);
    expect(res2.smokeWarning).toBe(true);

    // 3. Smoke AND Temp >= 60: confirmed fire emergency
    const res3 = evaluateDetection(
      { ...NOMINAL_BASELINE_TELEMETRY, temperature: 75, smokeDetected: true },
      []
    );
    expect(res3.detectedIncidents.length).toBe(1);
    expect(res3.detectedIncidents[0].category).toBe('FIRE');
    expect(res3.detectedIncidents[0].zoneId).toBe('RESEARCH_LAB');
  });

  it('Module D (Protection Controller): commands suppression and 3s isolation valve', () => {
    const hazard: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: true,
      gasConcentration: 150,
    };
    const telemetry = { ...NOMINAL_BASELINE_TELEMETRY, gasConcentration: 150 };
    const failure: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, gasIsolationFailed: false };

    const prot = stepProtectionController(INITIAL_PROTECTION_EQUIPMENT, hazard, telemetry, failure);
    expect(prot.nextEquipment.gasIsolationValve.state).toBe('ACTIVATION_REQUESTED');
    expect(prot.nextEquipment.emergencyVentilation.state).toBe('OPERATING');
    expect(prot.nextEquipment.chemicalEquipmentShutdown.state).toBe('OPERATING');
  });

  it('Module E (Response Dispatch Engine): deterministic 30s schedule and ETA calculations', () => {
    let team: ResponseTeam = { ...INITIAL_RESPONSE_TEAMS.securityTeam, stage: 'NOTIFICATION_INITIATED', dispatchElapsedSeconds: 0 };

    // Advance 5s -> Dispatch Confirmed
    for (let s = 1; s <= 5; s++) {
      team = advanceTeamDispatch(team, 'RESTRICTED_STORAGE').nextTeam;
    }
    expect(team.stage).toBe('DISPATCH_CONFIRMED');
    expect(team.progress).toBe(17);
    expect(team.etaSeconds).toBe(25);

    // Advance to 20s -> On Site
    for (let s = 6; s <= 20; s++) {
      team = advanceTeamDispatch(team, 'RESTRICTED_STORAGE').nextTeam;
    }
    expect(team.stage).toBe('ON_SITE');

    // Advance to 30s -> Response Completed
    for (let s = 21; s <= 30; s++) {
      team = advanceTeamDispatch(team, 'RESTRICTED_STORAGE').nextTeam;
    }
    expect(team.stage).toBe('RESPONSE_COMPLETED');
    expect(team.progress).toBe(100);
    expect(team.etaSeconds).toBe(0);
  });

  it('Module F (Incident Management Engine): checklist validation and operator authorization', () => {
    const incident: IncidentRecord = {
      id: 'INC-FIRE-TEST',
      category: 'FIRE',
      zoneId: 'RESEARCH_LAB',
      priority: 2,
      detectedAt: Date.now(),
      acknowledgedAt: Date.now(),
      resolvedAt: null,
      state: 'ACTIVE_ACKNOWLEDGED',
      conditionActive: false,
      operatorAcknowledged: true,
      details: 'Contained fire',
      responses: {},
    };

    // When hazard is not yet contained, closure must be rejected
    const uncontainedEnv: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIntensity: 20,
      ambientTemperature: 70,
      smokeConcentration: 30,
    };
    const val1 = validateIncidentClosure(incident, uncontainedEnv, { ...NOMINAL_BASELINE_TELEMETRY, temperature: 70, smokeDetected: true });
    expect(val1.canClose).toBe(false);

    // When hazard is contained and 5s inspection has passed
    const containedEnv: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIntensity: 0,
      ambientTemperature: 25,
      smokeConcentration: 0,
      inspectionStatus: { RESEARCH_LAB: 'PASSED' },
    };
    const val2 = validateIncidentClosure(incident, containedEnv, NOMINAL_BASELINE_TELEMETRY);
    expect(val2.canClose).toBe(true);

    // Operator authorisation marks incident resolved
    const authRes = authorizeIncidentClosure('INC-FIRE-TEST', [incident], containedEnv, NOMINAL_BASELINE_TELEMETRY);
    expect(authRes.success).toBe(true);
    expect(authRes.activeIncidents.length).toBe(0);
    expect(authRes.resolvedIncidents[0].state).toBe('RESOLVED');
  });

  it('Module G (Recovery Controller): controlled zone restoration with safety interlocks', () => {
    // Interlock check: Cannot restore Research Lab while fire is active
    const activeHazardEnv: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIntensity: 50,
    };
    const badRestore = restoreZoneOperations(
      'RESEARCH_LAB',
      INITIAL_PROTECTION_EQUIPMENT,
      INITIAL_RESPONSE_TEAMS,
      activeHazardEnv,
      { ...NOMINAL_BASELINE_TELEMETRY, temperature: 75, smokeDetected: true }
    );
    expect(badRestore.success).toBe(false);

    // Permitted restoration when conditions safe
    const safeRestore = restoreZoneOperations(
      'RESEARCH_LAB',
      INITIAL_PROTECTION_EQUIPMENT,
      INITIAL_RESPONSE_TEAMS,
      INITIAL_HAZARD_ENVIRONMENT,
      NOMINAL_BASELINE_TELEMETRY
    );
    expect(safeRestore.success).toBe(true);
    expect(safeRestore.nextEquipment.fireSuppression.state).toBe('STANDBY');
    expect(safeRestore.nextTeams.fireTeam.stage).toBe('STANDBY');
  });

  it('Module H (Simulation Scheduler): drives store simulation ticks cleanly', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    expect(simulationScheduler.isRunning()).toBe(true);

    // Step 1 scheduler tick
    simulationScheduler.advanceTicks(1);
    expect(useSentinelStore.getState().responseTeams.fireTeam.stage).toBe('NOTIFICATION_INITIATED');
  });
});
