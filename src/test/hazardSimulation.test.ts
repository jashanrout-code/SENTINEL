import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import {
  stepClosedLoopSimulation,
  INITIAL_HAZARD_ENVIRONMENT,
  INITIAL_PROTECTION_EQUIPMENT,
  INITIAL_RESPONSE_TEAMS,
  INITIAL_FAILURE_CONFIG
} from '../core/hazardSimulationEngine';
import { validateResetEligibility } from '../core/monitoringEngine';
import { INITIAL_TELEMETRY } from '../core/scenarios';
import type {
  HazardEnvironment,
  ProtectionEquipmentState,
  ResponseTeamsState,
  EquipmentFailureConfig,
  SensorTelemetry
} from '../types';

describe('SENTINEL Closed-Loop Hazard Simulation & Countermeasures Engine', () => {
  beforeEach(() => {
    useSentinelStore.getState().resetSimulation();
  });

  it('fire suppression reduces simulated fire intensity and temperature when operational', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIgnited: true,
      fireIntensity: 85,
      ambientTemperature: 85,
      smokeConcentration: 80,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, fireSuppressionFailed: false };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 85, smokeDetected: true };

    const initialIntensity = env.fireIntensity;
    const initialTemp = env.ambientTemperature;

    // Tick 1: suppression activates
    const step1 = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now());
    expect(step1.nextEquipment.fireSuppression.state).toBe('OPERATING');

    env = step1.nextEnv;
    equip = step1.nextEquipment;
    teams = step1.nextTeams;
    telemetry = step1.derivedTelemetry;

    // Simulate automatic closed-loop mitigation
    for (let i = 1; i < 25; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Fire intensity must have decreased progressively
    expect(env.fireIntensity).toBeLessThan(initialIntensity);
    // Ambient temperature must have decreased
    expect(env.ambientTemperature).toBeLessThan(initialTemp);
    // When fire drops sufficiently, containment reaches CONTAINED
    expect(env.containmentStatus.fire).toBe('CONTAINED');
    // Derived telemetry updates automatically
    expect(telemetry.temperature).toBeLessThan(initialTemp);
  });

  it('fire suppression failure prevents automatic fire containment', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIgnited: true,
      fireIntensity: 90,
      ambientTemperature: 90,
      smokeConcentration: 90,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, fireSuppressionFailed: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 90, smokeDetected: true };

    // Tick 1: suppression attempted
    const step1 = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now());
    expect(step1.nextEquipment.fireSuppression.state).toBe('FAILED');
    expect(step1.nextEnv.containmentStatus.fire).toBe('UNCONTROLLED');

    env = step1.nextEnv;
    equip = step1.nextEquipment;
    teams = step1.nextTeams;
    telemetry = step1.derivedTelemetry;

    for (let i = 1; i < 6; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Suppression pump must report FAILED state
    expect(equip.fireSuppression.state).toBe('FAILED');
    // Fire must remain uncontrolled prior to manual team intervention
    expect(env.containmentStatus.fire).toBe('UNCONTROLLED');
    expect(env.fireIntensity).toBeGreaterThan(50);
  });

  it('gas isolation stops the simulated release when successful', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: true,
      gasReleaseRate: 85,
      gasConcentration: 180,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, gasIsolationFailed: false };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 180 };

    for (let i = 0; i < 20; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Solenoid valve must be ISOLATED (sealed)
    expect(equip.gasIsolationValve.state).toBe('ISOLATED');
    // Gas release rate must have been cut to 0
    expect(env.gasReleaseRate).toBe(0);
    expect(env.gasSourceActive).toBe(false);
  });

  it('gas isolation failure allows the release to continue', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: true,
      gasReleaseRate: 80,
      gasConcentration: 170,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, gasIsolationFailed: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 170 };

    for (let i = 0; i < 5; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Valve must be marked FAILED
    expect(equip.gasIsolationValve.state).toBe('FAILED');
    // Gas release continues actively
    expect(env.gasSourceActive).toBe(true);
    expect(env.gasReleaseRate).toBeGreaterThan(0);
    expect(env.containmentStatus.gas).toBe('UNCONTROLLED');
  });

  it('ventilation reduces residual gas concentration only when operating', () => {
    // Case A: Ventilation Operating
    let envA: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: false,
      gasReleaseRate: 0,
      gasConcentration: 150,
    };
    let equipA: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teamsA: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfigA: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, ventilationFailed: false };
    let telemetryA: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 150 };

    for (let i = 0; i < 20; i++) {
      const step = stepClosedLoopSimulation(envA, equipA, teamsA, failureConfigA, telemetryA, Date.now() + i * 1000);
      envA = step.nextEnv;
      equipA = step.nextEquipment;
      teamsA = step.nextTeams;
      telemetryA = step.derivedTelemetry;
    }
    expect(equipA.emergencyVentilation.state).toBe('OPERATING');
    expect(envA.gasConcentration).toBeLessThan(100);

    // Case B: Ventilation Failed
    let envB: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: false,
      gasReleaseRate: 0,
      gasConcentration: 150,
    };
    let equipB: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teamsB: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfigB: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, ventilationFailed: true };
    let telemetryB: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 150 };

    for (let i = 0; i < 20; i++) {
      const step = stepClosedLoopSimulation(envB, equipB, teamsB, failureConfigB, telemetryB, Date.now() + i * 1000);
      envB = step.nextEnv;
      equipB = step.nextEquipment;
      teamsB = step.nextTeams;
      telemetryB = step.derivedTelemetry;
    }
    expect(equipB.emergencyVentilation.state).toBe('FAILED');
    // Gas concentration remains trapped at dangerous high level without exhaust scrubber
    expect(envB.gasConcentration).toBeGreaterThanOrEqual(100);
    expect(envB.gasConcentration).toBeGreaterThan(envA.gasConcentration);
  });

  it('intrusion remains active until an appropriate security resolution', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      intrusionBreachActive: true,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, securityDelay: false };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, intrusionDetected: true };

    // Initially after breach, lockdown is triggered and security team notified
    const step1 = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now());
    expect(step1.nextEquipment.accessPointLockdown.state).toBe('OPERATING');
    expect(step1.nextTeams.securityTeam.stage).not.toBe('STANDBY');
    // Breach is still active before team arrives
    expect(step1.nextEnv.intrusionBreachActive).toBe(true);

    // Progress simulation through security intervention
    env = step1.nextEnv;
    equip = step1.nextEquipment;
    teams = step1.nextTeams;
    telemetry = step1.derivedTelemetry;

    for (let i = 0; i < 35; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // After team completes sweep, intrusion condition clears
    expect(teams.securityTeam.stage).toBe('RESPONSE_COMPLETED');
    expect(env.intrusionBreachActive).toBe(false);
    expect(telemetry.intrusionDetected).toBe(false);
    expect(env.containmentStatus.intrusion).toBe('CONTAINED');
  });

  it('response-team status transitions occur in correct deterministic order', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIgnited: true,
      fireIntensity: 80,
      ambientTemperature: 80,
      smokeConcentration: 75,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    // With suppression failed, the team completes the entire turnout and transit lifecycle
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, fireSuppressionFailed: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 80, smokeDetected: true };

    const observedStages: string[] = [];

    for (let i = 0; i < 40; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now() + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;

      if (!observedStages.includes(teams.fireTeam.stage)) {
        observedStages.push(teams.fireTeam.stage);
      }
    }

    // Must include sequential operational progression
    expect(observedStages).toContain('NOTIFICATION_INITIATED');
    expect(observedStages).toContain('DISPATCH_CONFIRMED');
    expect(observedStages).toContain('EN_ROUTE');
    expect(observedStages).toContain('ON_SITE');
  });

  it('multiple simultaneous emergencies remain independent', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_SIMULTANEOUS');

    const state = useSentinelStore.getState();
    const fireIncident = state.activeIncidents.find(i => i.category === 'FIRE');
    const gasIncident = state.activeIncidents.find(i => i.category === 'GAS_LEAKAGE');

    expect(fireIncident).toBeDefined();
    expect(gasIncident).toBeDefined();
    expect(fireIncident?.zoneId).toBe('RESEARCH_LAB');
    expect(gasIncident?.zoneId).toBe('CHEMICAL_LAB');

    // Run simulation ticks to mitigate both in parallel
    for (let i = 0; i < 30; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const nextState = useSentinelStore.getState();
    // Research Lab fire mitigated
    expect(nextState.telemetry.temperature).toBeLessThan(60);
    // Chemical Lab gas mitigated
    expect(nextState.telemetry.gasConcentration).toBeLessThan(100);
    // Both incidents retain independent alarm tracking
    expect(nextState.activeIncidents.length).toBe(2);
  });

  it('acknowledgement does not deactivate countermeasures or clear active hazards', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_FAIL');
    const state = useSentinelStore.getState();
    const fireIncident = state.activeIncidents.find(i => i.category === 'FIRE');
    expect(fireIncident).toBeDefined();

    // Acknowledge alarm
    useSentinelStore.getState().acknowledgeIncident(fireIncident!.id);
    const ackState = useSentinelStore.getState();
    const ackIncident = ackState.activeIncidents.find(i => i.id === fireIncident!.id);

    expect(ackIncident?.state).toBe('ACTIVE_ACKNOWLEDGED');
    // Audible siren may silence, but interlocks and equipment are NOT deactivated
    expect(ackState.automaticResponses.zoneIsolation).toBe(true);
    expect(ackState.automaticResponses.evacuationWarning).toBe(true);
  });

  it('safe sensor readings do not automatically clear retained alarms', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    // Step simulation until temperature and smoke return to safe nominal levels
    for (let i = 0; i < 35; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const state = useSentinelStore.getState();
    // Temperature is back to safe nominal
    expect(state.telemetry.temperature).toBeLessThan(60);
    expect(state.telemetry.smokeDetected).toBe(false);

    // But the alarm is STILL retained in activeIncidents!
    const retainedIncident = state.activeIncidents.find(i => i.category === 'FIRE');
    expect(retainedIncident).toBeDefined();
    // State is either ACTIVE_UNACKNOWLEDGED or CONDITION_CLEARED
    expect(['ACTIVE_UNACKNOWLEDGED', 'CONDITION_CLEARED']).toContain(retainedIncident?.state);
    // Condition active is false
    expect(retainedIncident?.conditionActive).toBe(false);
  });

  it('reset eligibility strictly follows the established lifecycle', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    const state = useSentinelStore.getState();
    const incident = state.activeIncidents.find(i => i.category === 'FIRE')!;

    // 1. While active unacknowledged and above threshold: Reset must be blocked
    const check1 = validateResetEligibility(incident);
    expect(check1.canReset).toBe(false);

    // 2. Acknowledge, but still above threshold: Reset must be blocked
    useSentinelStore.getState().acknowledgeIncident(incident.id);
    const ackIncident = useSentinelStore.getState().activeIncidents.find(i => i.id === incident.id)!;
    const check2 = validateResetEligibility(ackIncident);
    expect(check2.canReset).toBe(false);

    // 3. Step simulation until conditions are restored
    for (let i = 0; i < 35; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    const safeIncident = useSentinelStore.getState().activeIncidents.find(i => i.id === incident.id)!;
    const check3 = validateResetEligibility(safeIncident);
    expect(check3.canReset).toBe(true);

    // 4. Reset executes successfully
    const res = useSentinelStore.getState().resetIncident(incident.id);
    expect(res.success).toBe(true);
    expect(useSentinelStore.getState().activeIncidents.find(i => i.id === incident.id)).toBeUndefined();
  });

  it('simulation reset restores consistent initial conditions without orphaned state', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_MULTIPLE_CONCURRENT');
    expect(useSentinelStore.getState().activeIncidents.length).toBeGreaterThan(0);

    useSentinelStore.getState().resetSimulation();
    const state = useSentinelStore.getState();

    expect(state.activeIncidents).toHaveLength(0);
    expect(state.telemetry.temperature).toBe(25);
    expect(state.telemetry.gasConcentration).toBe(20);
    expect(state.telemetry.smokeDetected).toBe(false);
    expect(state.telemetry.intrusionDetected).toBe(false);
    expect(state.hazardEnv.fireIntensity).toBe(0);
    expect(state.hazardEnv.gasReleaseRate).toBe(0);
    expect(state.isSimulationRunning).toBe(false);
    expect(state.protectionEquipment.fireSuppression.state).toBe('STANDBY');
    expect(state.responseTeams.fireTeam.stage).toBe('STANDBY');
  });

  it('manual sensor test and automated emergency scenario modes do not conflict', () => {
    // Start automated scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    expect(useSentinelStore.getState().simulationMode).toBe('AUTOMATED_SCENARIO');
    expect(useSentinelStore.getState().isSimulationRunning).toBe(true);

    // Switch to Manual Sensor Test mode
    useSentinelStore.getState().setSimulationMode('MANUAL_SENSOR_TEST');
    expect(useSentinelStore.getState().simulationMode).toBe('MANUAL_SENSOR_TEST');
    // Clock is paused to prevent background hazard steps from overwriting manual adjustments
    expect(useSentinelStore.getState().isSimulationRunning).toBe(false);

    // Manually adjust gas sensor
    useSentinelStore.getState().setSensorValue('gasConcentration', 190);
    expect(useSentinelStore.getState().telemetry.gasConcentration).toBe(190);
    const gasIncident = useSentinelStore.getState().activeIncidents.find(i => i.category === 'GAS_LEAKAGE');
    expect(gasIncident).toBeDefined();

    // Revert to Automated Scenario mode
    useSentinelStore.getState().setSimulationMode('AUTOMATED_SCENARIO');
    expect(useSentinelStore.getState().simulationMode).toBe('AUTOMATED_SCENARIO');
  });
});
