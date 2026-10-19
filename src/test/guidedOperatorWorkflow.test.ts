import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { stepClosedLoopSimulation } from '../core/hazardSimulationEngine';
import { simulationScheduler } from '../core/simulationScheduler';

describe('SENTINEL Critical Security Assessment, Safety Verification & Guided Workflow (Tests A-L)', () => {
  beforeEach(() => {
    simulationScheduler.stop();
    useSentinelStore.getState().resetSimulation();
  });

  it('Test A — Dispatch Completion: Restricted Storage intrusion security team completes dispatch lifecycle', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');
    useSentinelStore.getState().stepSimulationTick();

    let current = useSentinelStore.getState();
    expect(current.activeIncidents.length).toBeGreaterThan(0);
    expect(current.telemetry.intrusionDetected).toBe(true);
    expect(['NOTIFICATION_INITIATED', 'DISPATCH_CONFIRMED']).toContain(current.responseTeams.securityTeam.stage);

    // Step simulation until dispatch completes (approx 30s)
    for (let i = 0; i < 30; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    current = useSentinelStore.getState();
    expect(current.responseTeams.securityTeam.stage).toBe('RESPONSE_COMPLETED');
    expect(current.responseTeams.securityTeam.progress).toBe(100);
    expect(current.responseTeams.securityTeam.etaSeconds).toBe(0);
  });

  it('Test B — Assessment Progression: Assessment advances deterministically past 20% to 100%', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    // Dispatch until security team arrives on site
    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      const st = useSentinelStore.getState().responseTeams.securityTeam.stage;
      if (st === 'ON_SITE' || st === 'INTERVENTION_UNDERWAY' || st === 'RESPONSE_COMPLETED') break;
    }

    const preStart = useSentinelStore.getState();
    expect(['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED']).toContain(preStart.responseTeams.securityTeam.stage);

    // Operator initiates area assessment
    const startResult = store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    expect(startResult.success).toBe(true);

    const initiated = useSentinelStore.getState();
    expect(initiated.responseTeams.securityTeam.assessmentUnderway).toBe(true);
    expect(initiated.responseTeams.securityTeam.assessmentProgress).toBeGreaterThanOrEqual(20);

    // Advance clock tick by tick and verify progress advances beyond 20%
    useSentinelStore.getState().stepSimulationTick();
    const tick1 = useSentinelStore.getState();
    expect(tick1.responseTeams.securityTeam.assessmentProgress).toBeGreaterThan(20);

    // Continue until 100% completion
    for (let i = 0; i < 6; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const completed = useSentinelStore.getState();
    expect(completed.responseTeams.securityTeam.assessmentProgress).toBe(100);
    expect(completed.responseTeams.securityTeam.assessmentCompleted).toBe(true);
  });

  it('Test C — Navigation Independence: Assessment continues running when operator navigates away', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    const startProgress = useSentinelStore.getState().responseTeams.securityTeam.assessmentProgress || 0;

    // Operator navigates to Command Centre view
    store.setView('command-centre');
    expect(useSentinelStore.getState().currentView).toBe('command-centre');

    // Step simulation in background while on another view
    useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().stepSimulationTick();

    // Navigate to Incident Management view
    store.setView('incident-management');
    expect(useSentinelStore.getState().currentView).toBe('incident-management');

    useSentinelStore.getState().stepSimulationTick();

    // Return to Operations view
    store.setView('operations');
    const returnState = useSentinelStore.getState();
    expect(returnState.responseTeams.securityTeam.assessmentProgress).toBeGreaterThan(startProgress);
  });

  it('Test D — Dispatch State Independence: RESPONSE_COMPLETED does not freeze running assessment', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    expect(useSentinelStore.getState().responseTeams.securityTeam.assessmentUnderway).toBe(true);

    // Step until dispatch reaches 100% (RESPONSE_COMPLETED)
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const teamState = useSentinelStore.getState().responseTeams.securityTeam;
    expect(teamState.stage).toBe('RESPONSE_COMPLETED');
    expect(teamState.progress).toBe(100);

    // Assessment must NOT be frozen; it should have completed to 100%
    expect(teamState.assessmentProgress).toBe(100);
    expect(teamState.assessmentCompleted).toBe(true);
  });

  it('Test E — Verification Availability: Verify & Secure Area action unlocks when assessment completes', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 6; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const state = useSentinelStore.getState();
    expect(state.responseTeams.securityTeam.assessmentCompleted).toBe(true);

    // Verify & Secure Area is available
    const verifyResult = store.executeManualIntervention('CONFIRM_AREA_SECURED', 'RESTRICTED_STORAGE');
    expect(verifyResult.success).toBe(true);
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('IN_PROGRESS');
  });

  it('Test F — Verification Duration: 5-second inspection counts down and completes deterministically', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 6; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    // Start verification
    store.executeManualIntervention('CONFIRM_AREA_SECURED', 'RESTRICTED_STORAGE');
    const startEnv = useSentinelStore.getState().hazardEnv;
    expect(startEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('IN_PROGRESS');
    expect(startEnv.inspectionCountdown?.RESTRICTED_STORAGE).toBe(5);

    // Advance 3 seconds
    useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().stepSimulationTick();

    const midEnv = useSentinelStore.getState().hazardEnv;
    expect(midEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('IN_PROGRESS');
    expect(midEnv.inspectionCountdown?.RESTRICTED_STORAGE).toBeLessThanOrEqual(2);

    // Complete inspection
    useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().stepSimulationTick();

    const finalEnv = useSentinelStore.getState().hazardEnv;
    expect(finalEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('PASSED');
    expect(finalEnv.inspectionCountdown?.RESTRICTED_STORAGE).toBe(0);
    expect(useSentinelStore.getState().hazardEnv.containmentStatus.intrusion).toBe('CONTAINED');
  });

  it('Test G — Failed Verification: Unsafe conditions fail inspection and block incident closure', () => {
    const env = { ...useSentinelStore.getState().hazardEnv, intrusionBreachActive: true };
    const equip = { ...useSentinelStore.getState().protectionEquipment };
    const teams = { ...useSentinelStore.getState().responseTeams };
    const failureConfig = { ...useSentinelStore.getState().failureConfig };
    const telemetry = { ...useSentinelStore.getState().telemetry, intrusionDetected: true };

    env.inspectionCountdown.RESTRICTED_STORAGE = 1;
    env.inspectionStatus.RESTRICTED_STORAGE = 'IN_PROGRESS';

    const step = stepClosedLoopSimulation(env, equip, teams, failureConfig, telemetry, Date.now());
    expect(step.nextEnv.inspectionStatus.RESTRICTED_STORAGE).toBe('FAILED');
  });

  it('Test H — Incident Retention: Incident remains retained and accessible until explicit closure', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    // Progress through assessment and verification
    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }
    store.executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 6; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    store.executeManualIntervention('CONFIRM_AREA_SECURED', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 5; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const state = useSentinelStore.getState();
    expect(state.hazardEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('PASSED');
    // Incident MUST still be active and accessible, NOT prematurely deleted!
    const activeSecInc = state.activeIncidents.find(i => i.zoneId === 'RESTRICTED_STORAGE');
    expect(activeSecInc).toBeDefined();
    expect(['DETECTED', 'ACKNOWLEDGED', 'CONDITION_CLEARED']).toContain(activeSecInc?.state);
  });

  it('Test I — Guided Navigation: Generates correct actions and navigates with focus target', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    let actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions.length).toBeGreaterThan(0);

    // Initial action is acknowledgement
    const ackAction = actions.find(a => a.stage === 'ACKNOWLEDGEMENT' && a.zoneId === 'RESTRICTED_STORAGE');
    expect(ackAction).toBeDefined();

    // Trigger guided navigation to acknowledgement
    store.navigateToGuidedAction(ackAction!);
    expect(useSentinelStore.getState().currentView).toBe('incident-management');
    expect(useSentinelStore.getState().activeHighlightTarget).toBe(ackAction!.targetControlId);

    // Acknowledge incident
    const incId = ackAction!.incidentId!;
    useSentinelStore.getState().acknowledgeIncident(incId);

    // Advance security team to on site
    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    // Now Guided Navigation must offer assessment action
    actions = useSentinelStore.getState().getPendingOperatorActions();
    const assessAction = actions.find(a => a.stage === 'SECURITY_ASSESSMENT');
    expect(assessAction).toBeDefined();
    expect(assessAction?.actionLabel).toBe('Proceed to Area Assessment');

    // Click Proceed to Area Assessment
    store.navigateToGuidedAction(assessAction!);
    expect(useSentinelStore.getState().currentView).toBe('operations');
    expect(useSentinelStore.getState().selectedZoneId).toBe('RESTRICTED_STORAGE');
    expect(useSentinelStore.getState().activeHighlightTarget).toBe('action-assess-RESTRICTED_STORAGE');
  });

  it('Test J — Full Recovery: Complete lifecycle returns ZN-03 to normal operations', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_INTRUSION');

    const incident = useSentinelStore.getState().activeIncidents.find(i => i.zoneId === 'RESTRICTED_STORAGE');
    expect(incident).toBeDefined();

    // 1. Acknowledge
    useSentinelStore.getState().acknowledgeIncident(incident!.id);

    // 2. Dispatch to site
    for (let i = 0; i < 15; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'].includes(useSentinelStore.getState().responseTeams.securityTeam.stage)) break;
    }

    // 3. Initiate assessment and complete
    useSentinelStore.getState().executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 8; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    expect(useSentinelStore.getState().responseTeams.securityTeam.assessmentCompleted).toBe(true);

    // 4. Physical safety verification inspection
    useSentinelStore.getState().executeManualIntervention('CONFIRM_AREA_SECURED', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 5; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESTRICTED_STORAGE).toBe('PASSED');

    // 5. Authorise incident closure
    const closureRes = useSentinelStore.getState().authorizeIncidentClosure(incident!.id);
    expect(closureRes.success).toBe(true);

    // 6. Reset alarm
    const resetRes = useSentinelStore.getState().resetIncident(incident!.id);
    expect(resetRes.success).toBe(true);

    // 7. Recover zone equipment
    const recoverRes = useSentinelStore.getState().recoverZoneEquipment('RESTRICTED_STORAGE');
    expect(recoverRes.success).toBe(true);

    // 8. Zone returns to normal operations
    const opState = useSentinelStore.getState().getZoneOperationalState('RESTRICTED_STORAGE');
    expect(opState.status).toBe('NORMAL');
    expect(opState.hazardState).toBe('NORMAL');
    expect(opState.equipmentState).toBe('OPERATIONAL');
  });

  it('Test K — Repeat Scenario: Subsequent intrusion runs cleanly without stale progress', () => {
    const store = useSentinelStore.getState();
    // Run scenario 1
    store.applyScenario('SCENARIO_AUTO_INTRUSION');
    const inc1 = useSentinelStore.getState().activeIncidents[0];
    useSentinelStore.getState().acknowledgeIncident(inc1.id);
    for (let i = 0; i < 15; i++) useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().executeManualIntervention('START_SECURITY_ASSESSMENT', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 8; i++) useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().executeManualIntervention('CONFIRM_AREA_SECURED', 'RESTRICTED_STORAGE');
    for (let i = 0; i < 5; i++) useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().authorizeIncidentClosure(inc1.id);
    useSentinelStore.getState().resetIncident(inc1.id);
    useSentinelStore.getState().recoverZoneEquipment('RESTRICTED_STORAGE');

    expect(useSentinelStore.getState().getZoneOperationalState('RESTRICTED_STORAGE').status).toBe('NORMAL');

    // Reset and trigger scenario 2
    useSentinelStore.getState().resetSimulation();
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_INTRUSION');

    const state2 = useSentinelStore.getState();
    expect(state2.responseTeams.securityTeam.assessmentProgress).toBe(0);
    expect(state2.responseTeams.securityTeam.assessmentCompleted).toBe(false);
    expect(state2.responseTeams.securityTeam.assessmentUnderway).toBe(false);
    expect(state2.hazardEnv.inspectionStatus?.RESTRICTED_STORAGE).toBeUndefined();
  });

  it('Test L — Simultaneous Incidents: Fire and Intrusion progress independently', () => {
    const store = useSentinelStore.getState();
    // Trigger intrusion
    store.applyScenario('SCENARIO_AUTO_INTRUSION');
    // Also trigger fire
    useSentinelStore.setState(s => ({
      ...s,
      telemetry: { ...s.telemetry, temperature: 95, smokeDetected: true },
      hazardEnv: { ...s.hazardEnv, fireIgnited: true, fireIntensity: 80, ambientTemperature: 95, smokeConcentration: 70 },
      responseTeams: {
        ...s.responseTeams,
        fireTeam: { ...s.responseTeams.fireTeam, stage: 'NOTIFICATION_INITIATED', progress: 10 }
      }
    }));

    // Step simulation
    for (let i = 0; i < 10; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const state = useSentinelStore.getState();
    // Both teams progress independently
    expect(state.responseTeams.fireTeam.progress).toBeGreaterThan(10);
    expect(state.responseTeams.securityTeam.progress).toBeGreaterThan(10);
    expect(state.responseTeams.fireTeam.stage).not.toBe('STANDBY');
    expect(state.responseTeams.securityTeam.stage).not.toBe('STANDBY');
  });
});
