import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import {
  INITIAL_HAZARD_ENVIRONMENT,
  INITIAL_PROTECTION_EQUIPMENT,
  INITIAL_RESPONSE_TEAMS,
  INITIAL_FAILURE_CONFIG,
  stepClosedLoopSimulation,
  executeManualCommand
} from '../core/hazardSimulationEngine';
import { INITIAL_TELEMETRY } from '../core/scenarios';
import type {
  HazardEnvironment,
  ProtectionEquipmentState,
  ResponseTeamsState,
  EquipmentFailureConfig,
  SensorTelemetry
} from '../types';

describe('SENTINEL Automatic Response, Manual Intervention & Recovery Engine', () => {
  beforeEach(() => {
    useSentinelStore.getState().resetSimulation();
  });

  it('Dispatch Timing: progress advances automatically, ETA decreases consistently, and reaches 100% / 0s ETA', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIgnited: true,
      fireIntensity: 60,
      ambientTemperature: 75,
      smokeConcentration: 70,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    const failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, fireSuppressionFailed: false };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 75, smokeDetected: true };

    const initialStep = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 1000);
    expect(initialStep.nextTeams.fireTeam.stage).toBe('NOTIFICATION_INITIATED');
    expect(initialStep.nextTeams.fireTeam.progress).toBeGreaterThan(0);
    expect(initialStep.nextTeams.fireTeam.etaSeconds).toBeGreaterThan(0);

    env = initialStep.nextEnv;
    equip = initialStep.nextEquipment;
    teams = initialStep.nextTeams;
    telemetry = initialStep.derivedTelemetry;

    let previousProgress = teams.fireTeam.progress;

    // Advance 40 simulation steps
    for (let i = 0; i < 40; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 2000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;

      // Ensure progress never decreases
      expect(teams.fireTeam.progress).toBeGreaterThanOrEqual(previousProgress);
      previousProgress = teams.fireTeam.progress;

      // If team arrives or completes, ETA must reach 0
      if (teams.fireTeam.stage === 'RESPONSE_COMPLETED' || teams.fireTeam.stage === 'ON_SITE') {
        expect(teams.fireTeam.etaSeconds).toBeLessThanOrEqual(2);
      }
    }

    // Verify fire was suppressed and brigade reaches completed status with exactly 100% and 0s ETA
    expect(env.containmentStatus.fire).toBe('CONTAINED');
    expect(teams.fireTeam.stage).toBe('RESPONSE_COMPLETED');
    expect(teams.fireTeam.progress).toBe(100);
    expect(teams.fireTeam.etaSeconds).toBe(0);
  });

  it('Fire Emergency: failed automatic protection followed by successful manual intervention', () => {
    // 1. Fire begins with suppression failure configured
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      fireIgnited: true,
      fireIntensity: 85,
      ambientTemperature: 95,
      smokeConcentration: 85,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    let failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, fireSuppressionFailed: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 95, smokeDetected: true };

    // Run 5 ticks: equipment attempts to start but fails
    for (let i = 0; i < 5; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 1000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    expect(equip.fireSuppression.state).toBe('FAILED');
    expect(env.fireIntensity).toBeGreaterThan(60);

    // 2. Operator performs manual intervention: Retry / Force suppression
    const retryResult = executeManualCommand(
      env,
      equip,
      teams,
      failureConfig,
      telemetry,
      'RETRY_FIRE_SUPPRESSION',
      6000
    );

    expect(retryResult.result.success).toBe(true);
    expect(retryResult.nextEquipment.fireSuppression.state).toBe('OPERATING');
    expect(retryResult.nextEquipment.fireSuppression.controlMode).toBe('MANUAL_OVERRIDE');
    expect(retryResult.nextFailureConfig.fireSuppressionFailed).toBe(false);

    // 3. Operator requests backup fire squad
    const backupResult = executeManualCommand(
      retryResult.nextEnv,
      retryResult.nextEquipment,
      retryResult.nextTeams,
      retryResult.nextFailureConfig,
      retryResult.derivedTelemetry,
      'REQUEST_BACKUP_FIRE_BRIGADE',
      7000
    );

    expect(backupResult.result.success).toBe(true);
    expect(backupResult.nextTeams.fireTeam.backupRequested).toBe(true);

    // 4. Progress simulation with manual overrides active
    env = backupResult.nextEnv;
    equip = backupResult.nextEquipment;
    teams = backupResult.nextTeams;
    failureConfig = backupResult.nextFailureConfig;
    telemetry = backupResult.derivedTelemetry;

    for (let i = 0; i < 30; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 8000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Fire must now be contained and extinguished
    expect(env.containmentStatus.fire).toBe('CONTAINED');
    expect(env.fireIntensity).toBe(0);
    expect(env.fireIgnited).toBe(false);
    expect(telemetry.temperature).toBeLessThan(45);
  });

  it('Gas Emergency: failed isolation valve followed by manual retry, extraction and HazMat backup', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      gasSourceActive: true,
      gasReleaseRate: 20,
      gasConcentration: 130,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    let failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, gasIsolationFailed: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 130 };

    // Advance 5 steps: isolation valve fails
    for (let i = 0; i < 5; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 1000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    expect(equip.gasIsolationValve.state).toBe('FAILED');
    expect(env.gasSourceActive).toBe(true);

    // Operator intervenes: Retry gas isolation
    const isolationRetry = executeManualCommand(
      env,
      equip,
      teams,
      failureConfig,
      telemetry,
      'RETRY_GAS_ISOLATION',
      6000
    );
    expect(isolationRetry.result.success).toBe(true);
    expect(isolationRetry.nextEquipment.gasIsolationValve.state).toBe('ISOLATED');
    expect(isolationRetry.nextFailureConfig.gasIsolationFailed).toBe(false);

    // Operator activates emergency extraction ventilation
    const ventCommand = executeManualCommand(
      isolationRetry.nextEnv,
      isolationRetry.nextEquipment,
      isolationRetry.nextTeams,
      isolationRetry.nextFailureConfig,
      isolationRetry.derivedTelemetry,
      'ACTIVATE_EMERGENCY_VENTILATION',
      7000
    );
    expect(ventCommand.result.success).toBe(true);
    expect(ventCommand.nextEquipment.emergencyVentilation.state).toBe('OPERATING');

    // Operator requests HazMat backup
    const hazmatCommand = executeManualCommand(
      ventCommand.nextEnv,
      ventCommand.nextEquipment,
      ventCommand.nextTeams,
      ventCommand.nextFailureConfig,
      ventCommand.derivedTelemetry,
      'REQUEST_HAZMAT_BACKUP',
      8000
    );
    expect(hazmatCommand.result.success).toBe(true);
    expect(hazmatCommand.nextTeams.hazmatTeam.backupRequested).toBe(true);

    // Progress simulation
    env = hazmatCommand.nextEnv;
    equip = hazmatCommand.nextEquipment;
    teams = hazmatCommand.nextTeams;
    failureConfig = hazmatCommand.nextFailureConfig;
    telemetry = hazmatCommand.derivedTelemetry;

    for (let i = 0; i < 30; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 9000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Gas source isolated and concentration purged below toxic threshold
    expect(env.gasSourceActive).toBe(false);
    expect(env.containmentStatus.gas).toBe('CONTAINED');
    expect(telemetry.gasConcentration).toBeLessThan(25);
  });

  it('Security Breach: delayed response resolution through backup, assessment and verification', () => {
    let env: HazardEnvironment = {
      ...INITIAL_HAZARD_ENVIRONMENT,
      intrusionBreachActive: true,
    };
    let equip: ProtectionEquipmentState = { ...INITIAL_PROTECTION_EQUIPMENT };
    let teams: ResponseTeamsState = { ...INITIAL_RESPONSE_TEAMS };
    let failureConfig: EquipmentFailureConfig = { ...INITIAL_FAILURE_CONFIG, securityDelay: true };
    let telemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, intrusionDetected: true };

    // Advance 2 steps: lockdown triggers, security notified and delay flagged
    for (let i = 0; i < 2; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 1000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    expect(equip.accessPointLockdown.state).toBe('OPERATING');
    expect(teams.securityTeam.details).toContain('delayed');

    // Operator intervenes: Requests backup tactical squad
    const backupCmd = executeManualCommand(
      env,
      equip,
      teams,
      failureConfig,
      telemetry,
      'REQUEST_BACKUP_SECURITY',
      6000
    );
    expect(backupCmd.result.success).toBe(true);
    expect(backupCmd.nextTeams.securityTeam.backupRequested).toBe(true);
    expect(backupCmd.nextFailureConfig.securityDelay).toBe(false);

    // Progress until team reaches site
    env = backupCmd.nextEnv;
    equip = backupCmd.nextEquipment;
    teams = backupCmd.nextTeams;
    failureConfig = backupCmd.nextFailureConfig;
    telemetry = backupCmd.derivedTelemetry;

    for (let i = 0; i < 4; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 7000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    expect(['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED']).toContain(teams.securityTeam.stage);

    // Operator initiates area security assessment
    const assessCmd = executeManualCommand(
      env,
      equip,
      teams,
      failureConfig,
      telemetry,
      'START_SECURITY_ASSESSMENT',
      12000
    );
    expect(assessCmd.result.success).toBe(true);
    expect(assessCmd.nextTeams.securityTeam.assessmentUnderway).toBe(true);

    // Progress through assessment
    env = assessCmd.nextEnv;
    equip = assessCmd.nextEquipment;
    teams = assessCmd.nextTeams;
    failureConfig = assessCmd.nextFailureConfig;
    telemetry = assessCmd.derivedTelemetry;

    for (let i = 0; i < 6; i++) {
      const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, 13000 + i * 1000);
      env = step.nextEnv;
      equip = step.nextEquipment;
      teams = step.nextTeams;
      telemetry = step.derivedTelemetry;
    }

    // Operator confirms area secured
    const verifyCmd = executeManualCommand(
      env,
      equip,
      teams,
      failureConfig,
      telemetry,
      'CONFIRM_AREA_SECURED',
      20000
    );
    expect(verifyCmd.result.success).toBe(true);
    expect(verifyCmd.nextEnv.intrusionBreachActive).toBe(false);
    expect(verifyCmd.nextEnv.containmentStatus.intrusion).toBe('CONTAINED');
    expect(verifyCmd.nextTeams.securityTeam.stage).toBe('RESPONSE_COMPLETED');
  });

  it('Safety Interlocks: blocks routine equipment restoration while active hazardous conditions persist', () => {
    // Trigger fire scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    useSentinelStore.getState().stepSimulationTick();
    expect(useSentinelStore.getState().hazardEnv.fireIgnited).toBe(true);

    // Attempting equipment recovery must be rejected
    const recoveryResult = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(recoveryResult.success).toBe(false);
    expect(recoveryResult.message).toContain('rejected');

    // Suppression must remain active
    const currentEquip = useSentinelStore.getState().protectionEquipment;
    expect(currentEquip.fireSuppression.state).not.toBe('STANDBY');
  });

  it('Recovery Workflow: full containment -> safe sensors -> ack -> reset -> equipment recovery to standby', () => {
    // 1. Start automated fire scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    expect(useSentinelStore.getState().activeIncidents.length).toBeGreaterThan(0);
    const incidentId = useSentinelStore.getState().activeIncidents[0].id;

    // 2. Allow closed-loop suppression to contain the fire
    for (let i = 0; i < 35; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const stateAfterContainment = useSentinelStore.getState();
    expect(stateAfterContainment.hazardEnv.fireIntensity).toBe(0);
    expect(stateAfterContainment.hazardEnv.containmentStatus.fire).toBe('CONTAINED');
    expect(stateAfterContainment.telemetry.temperature).toBeLessThan(45);

    // 3. Acknowledge the incident
    useSentinelStore.getState().acknowledgeIncident(incidentId);
    const stateAfterAck = useSentinelStore.getState();
    expect(stateAfterAck.activeIncidents[0].acknowledgedAt).not.toBeNull();

    // 3b. Complete safety verification inspection
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        inspectionStatus: { ...s.hazardEnv.inspectionStatus, RESEARCH_LAB: 'PASSED' },
      },
    }));

    // 4. Reset the incident
    const resetRes = useSentinelStore.getState().resetIncident(incidentId);
    expect(resetRes.success).toBe(true);
    expect(useSentinelStore.getState().activeIncidents.length).toBe(0);

    // 5. Recover zone equipment
    const recoverRes = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(recoverRes.success).toBe(true);

    const recoveredEquip = useSentinelStore.getState().protectionEquipment;
    expect(recoveredEquip.fireSuppression.state).toBe('STANDBY');
    expect(recoveredEquip.labEquipmentShutdown.state).toBe('STANDBY');
    expect(recoveredEquip.fireVentIsolation.state).toBe('STANDBY');

    // 6. Verify zone operational state is restored to NORMAL
    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.status).toBe('NORMAL');
  });

  it('Simultaneous Emergencies: fire and gas operate independently without cross-interference', () => {
    // Trigger dual emergency
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_SIMULTANEOUS');
    useSentinelStore.getState().stepSimulationTick();
    const incidents = useSentinelStore.getState().activeIncidents;
    expect(incidents.length).toBe(2);

    const fireIncident = incidents.find(i => i.category === 'FIRE');
    const gasIncident = incidents.find(i => i.category === 'GAS_LEAKAGE');
    expect(fireIncident).toBeDefined();
    expect(gasIncident).toBeDefined();

    // Perform manual intervention only on gas (retry isolation)
    const gasResult = useSentinelStore.getState().executeManualIntervention('RETRY_GAS_ISOLATION', 'CHEMICAL_LAB');
    expect(gasResult.success).toBe(true);

    // Research lab fire protection equipment must still be operating independently
    const currentEquip = useSentinelStore.getState().protectionEquipment;
    expect(currentEquip.fireSuppression.state).toBe('OPERATING');
    expect(currentEquip.gasIsolationValve.state).toBe('ISOLATED');
  });

  it('Navigation: switching operational views preserves simulation continuity', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    // Switch views
    store.setView('incident-management');
    expect(useSentinelStore.getState().currentView).toBe('incident-management');

    store.stepSimulationTick();

    store.setView('operations');
    expect(useSentinelStore.getState().currentView).toBe('operations');

    store.stepSimulationTick();

    store.setView('command-centre');
    expect(useSentinelStore.getState().currentView).toBe('command-centre');

    // Countermeasures and dispatch should have progressed uninterrupted
    const state = useSentinelStore.getState();
    expect(state.responseTeams.fireTeam.progress).toBeGreaterThan(0);
  });
});
