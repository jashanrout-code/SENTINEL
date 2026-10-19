import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { simulationScheduler } from '../core/simulationScheduler';
import { restoreZoneOperations } from '../core/recoveryController';

describe('SENTINEL Equipment Restoration Lifecycle & Button State Regression Suite', () => {
  beforeEach(() => {
    simulationScheduler.stop();
    useSentinelStore.getState().resetSimulation();
  });

  function setupResolvedFireLab() {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.zoneId === 'RESEARCH_LAB')!;
    store.acknowledgeIncident(inc.id);
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        inspectionStatus: { ...s.hazardEnv.inspectionStatus, RESEARCH_LAB: 'PASSED' },
        fireIntensity: 0,
        fireIgnited: false,
        smokeConcentration: 0,
        ambientTemperature: 22
      },
      telemetry: { ...s.telemetry, temperature: 22, smokeDetected: false }
    }));
    store.authorizeIncidentClosure(inc.id);
    store.resetIncident(inc.id);
    return inc;
  }

  function setupResolvedChemicalLab() {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.zoneId === 'CHEMICAL_LAB')!;
    store.acknowledgeIncident(inc.id);
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        inspectionStatus: { ...s.hazardEnv.inspectionStatus, CHEMICAL_LAB: 'PASSED' },
        gasSourceActive: false,
        gasReleaseRate: 0,
        gasConcentration: 15
      },
      telemetry: { ...s.telemetry, gasConcentration: 15 }
    }));
    store.authorizeIncidentClosure(inc.id);
    store.resetIncident(inc.id);
    return inc;
  }

  it('1. Restoration is unavailable before safety prerequisites are met', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    store.stepSimulationTick();

    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RECOVERY_LOCKED');
    expect(opState.canRestoreEquipment).toBe(false);
    expect(opState.recoveryUnmetReasons.length).toBeGreaterThan(0);

    // Direct invocation fails safety check
    const recoveryResult = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(recoveryResult.success).toBe(false);
    expect(recoveryResult.message).toContain('Recovery rejected');
  });

  it('2. Restoration becomes available after authorised closure and applicable alarm-reset requirements', () => {
    setupResolvedFireLab();

    // Restoration must now be RECOVERY_PERMITTED
    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RECOVERY_PERMITTED');
    expect(opState.canRestoreEquipment).toBe(true);
    expect(opState.recoveryUnmetReasons.length).toBe(0);
  });

  it('3. Clicking Restore starts exactly one recovery operation', () => {
    setupResolvedFireLab();

    // Single restore call
    const result = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(result.success).toBe(true);

    const afterEvents = useSentinelStore.getState().eventLog;
    const recoveryEvents = afterEvents.filter(e => e.type === 'EQUIPMENT_RECOVERED' && e.zoneId === 'RESEARCH_LAB');
    expect(recoveryEvents.length).toBe(1);
  });

  it('4. Successful restoration transitions to RESTORED', () => {
    setupResolvedFireLab();

    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    const state = useSentinelStore.getState();
    expect(state.zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');
    expect(state.zoneRecovery.RESEARCH_LAB.progress).toBe(100);

    const opState = state.getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RESTORED');
    expect(opState.status).toBe('NORMAL');
    expect(opState.label).toBe('NORMAL OPERATIONS');
  });

  it('5. The button becomes disabled after completion', () => {
    setupResolvedFireLab();

    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.canRestoreEquipment).toBe(false);
    expect(opState.recoveryLifecycleState).toBe('RESTORED');
  });

  it('6. The blinking animation stops', () => {
    setupResolvedFireLab();

    // Before restoration: animation is permitted
    const opBefore = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opBefore.recoveryLifecycleState).toBe('RECOVERY_PERMITTED');

    // After restoration: RESTORED state has no animation
    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    const opAfter = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opAfter.recoveryLifecycleState).toBe('RESTORED');
    expect(opAfter.dotColor).toBe('bg-emerald-400'); // No animate-pulse or animate-ping
    expect(opAfter.dotColor).not.toContain('animate');
  });

  it('7. Repeated restoration requests have no unintended effect (Idempotent)', () => {
    setupResolvedFireLab();

    // First restoration
    const firstRes = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(firstRes.success).toBe(true);

    const initialEventCount = useSentinelStore.getState().eventLog.length;

    // Second repeated restoration
    const secondRes = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(secondRes.success).toBe(true);
    expect(secondRes.message).toContain('already restored');

    // Third repeated restoration
    const thirdRes = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(thirdRes.success).toBe(true);

    // Verify no new recovery events created
    const postEvents = useSentinelStore.getState().eventLog;
    expect(postEvents.length).toBe(initialEventCount);

    // Verify recovery state unchanged
    expect(useSentinelStore.getState().zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');

    // Verify engine-level idempotency protection directly
    const engineRes = restoreZoneOperations(
      'RESEARCH_LAB',
      useSentinelStore.getState().protectionEquipment,
      useSentinelStore.getState().responseTeams,
      useSentinelStore.getState().hazardEnv,
      useSentinelStore.getState().telemetry,
      Date.now()
    );
    expect(engineRes.success).toBe(true);
    expect(engineRes.newEvents.length).toBe(0);
  });

  it('8. Navigation between views does not reset completion', () => {
    setupResolvedFireLab();
    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    expect(useSentinelStore.getState().zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');

    // Navigate to multiple views and switch selected zones
    const store = useSentinelStore.getState();
    store.setView('operations');
    store.selectZone('CHEMICAL_LAB');
    store.setView('incident-management');
    store.selectZone('CONTROL_ROOM');
    store.setView('command-centre');
    store.selectZone('RESEARCH_LAB');

    // RESTORED state must persist
    expect(useSentinelStore.getState().zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');
    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RESTORED');
    expect(opState.canRestoreEquipment).toBe(false);
  });

  it('9. Research Laboratory recovery works', () => {
    setupResolvedFireLab();

    const res = useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');
    expect(res.success).toBe(true);

    const equip = useSentinelStore.getState().protectionEquipment;
    expect(equip.fireSuppression.state).toBe('STANDBY');
    expect(equip.labEquipmentShutdown.state).toBe('STANDBY');
    expect(equip.fireVentIsolation.state).toBe('STANDBY');

    const op = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(op.recoveryLifecycleState).toBe('RESTORED');
    expect(op.status).toBe('NORMAL');
  });

  it('10. Chemical Laboratory recovery works', () => {
    setupResolvedChemicalLab();

    const res = useSentinelStore.getState().recoverZoneEquipment('CHEMICAL_LAB');
    expect(res.success).toBe(true);

    const equip = useSentinelStore.getState().protectionEquipment;
    expect(equip.emergencyVentilation.state).toBe('STANDBY');
    expect(equip.chemicalEquipmentShutdown.state).toBe('STANDBY');

    const op = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(op.recoveryLifecycleState).toBe('RESTORED');
    expect(op.status).toBe('NORMAL');
  });

  it('11. Chemical Laboratory gas isolation remains intact until separately authorised for reopening', () => {
    setupResolvedChemicalLab();

    // Execute general equipment restoration
    useSentinelStore.getState().recoverZoneEquipment('CHEMICAL_LAB');

    // Gas isolation valve MUST remain ISOLATED
    expect(useSentinelStore.getState().protectionEquipment.gasIsolationValve.state).toBe('ISOLATED');
    expect(useSentinelStore.getState().zoneRecovery.CHEMICAL_LAB.gasSupplyAuthorised).toBeFalsy();

    // Now operator separately authorises reopening
    const reopenRes = useSentinelStore.getState().executeManualIntervention('RESTORE_GAS_SUPPLY', 'CHEMICAL_LAB');
    expect(reopenRes.success).toBe(true);

    expect(useSentinelStore.getState().protectionEquipment.gasIsolationValve.state).toBe('STANDBY');
    expect(useSentinelStore.getState().zoneRecovery.CHEMICAL_LAB.gasSupplyAuthorised).toBe(true);
  });

  it('12. Guided Operator Navigation removes completed recovery actions', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.zoneId === 'RESEARCH_LAB')!;
    useSentinelStore.getState().acknowledgeIncident(inc.id);
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        inspectionStatus: { ...s.hazardEnv.inspectionStatus, RESEARCH_LAB: 'PASSED' },
        fireIntensity: 0,
        fireIgnited: false,
        smokeConcentration: 0,
        ambientTemperature: 22
      },
      telemetry: { ...s.telemetry, temperature: 22, smokeDetected: false }
    }));
    useSentinelStore.getState().authorizeIncidentClosure(inc.id);

    // Before restoration: guided navigation offers equipment recovery
    let actions = useSentinelStore.getState().getPendingOperatorActions();
    const recoveryActionBefore = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(recoveryActionBefore).toBeDefined();

    // Perform recovery
    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    // After restoration: guided navigation removes equipment recovery
    actions = useSentinelStore.getState().getPendingOperatorActions();
    const recoveryActionAfter = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(recoveryActionAfter).toBeUndefined();
  });

  it('13. A subsequent emergency correctly establishes a new recovery cycle', () => {
    setupResolvedFireLab();
    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    expect(useSentinelStore.getState().zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');

    // Trigger a new emergency in Research Lab
    useSentinelStore.getState().triggerManualEmergency('RESEARCH_LAB');

    // New recovery cycle must be initialized to RECOVERY_LOCKED
    expect(useSentinelStore.getState().zoneRecovery.RESEARCH_LAB.state).toBe('RECOVERY_LOCKED');
    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RECOVERY_LOCKED');
    expect(opState.canRestoreEquipment).toBe(false);
  });
});
