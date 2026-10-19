import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { isIncidentAcknowledged } from '../types';

describe('SENTINEL Hazard State, Incident Resolution & Equipment Recovery Regression Suite', () => {
  beforeEach(() => {
    useSentinelStore.getState().resetSimulation();
  });

  afterEach(() => {
    useSentinelStore.getState().resetSimulation();
  });

  it('Test A — Successful Gas Containment: isolation stops release, extraction reduces conc <= 40, hazard becomes Contained, incident remains open, verification becomes available', () => {
    const store = useSentinelStore.getState();

    // 1. Start Gas Leak scenario
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');
    const state0 = useSentinelStore.getState();
    expect(state0.activeIncidents.length).toBeGreaterThan(0);
    const gasInc = state0.activeIncidents.find(i => i.category === 'GAS_LEAKAGE');
    expect(gasInc).toBeDefined();

    // In-flight emergency state
    const opInitial = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(['ACTIVE_HAZARD', 'RESPONSE_IN_PROGRESS']).toContain(opInitial.status);

    // 2. Step deterministic closed-loop simulation until gas is neutralized (reaches <= 40)
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      const current = useSentinelStore.getState();
      if (current.telemetry.gasConcentration <= 40 && current.protectionEquipment.gasIsolationValve.state === 'ISOLATED') {
        break;
      }
    }

    const stateAfterPurge = useSentinelStore.getState();
    expect(stateAfterPurge.telemetry.gasConcentration).toBeLessThanOrEqual(40);
    expect(stateAfterPurge.hazardEnv.gasConcentration).toBeLessThanOrEqual(40);
    expect(stateAfterPurge.hazardEnv.gasSourceActive).toBe(false);
    expect(stateAfterPurge.protectionEquipment.gasIsolationValve.state).toBe('ISOLATED');
    expect(stateAfterPurge.protectionEquipment.emergencyVentilation.state).toBe('COMPLETED');

    // 3. Authoritative verification of requirements:
    // - Hazard becomes Contained
    const opState = stateAfterPurge.getZoneOperationalState('CHEMICAL_LAB');
    expect(opState.hazardState).toBe('CONTAINED');
    expect(opState.status).toBe('AWAITING_SAFETY_VERIFICATION');
    expect(opState.label).toBe('AWAITING SAFETY VERIFICATION');

    // - Incident remains open
    expect(stateAfterPurge.activeIncidents.some(i => i.category === 'GAS_LEAKAGE')).toBe(true);

    // - Safety verification becomes available (closure validation indicates verification pending)
    const closureValidation = stateAfterPurge.getClosureValidation(gasInc!.id);
    expect(closureValidation).toBeDefined();
    const inspCondition = closureValidation?.conditions.find(c => c.id === 'inspection_passed');
    expect(inspCondition).toBeDefined();
    expect(inspCondition?.status).toBe('PENDING');
  });

  it('Test B — Incident Closure: Acknowledge -> Safety verification -> Authorise closure -> Incident resolved, archive updated, active hazard cleared', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    // Step to containment
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }

    const gasInc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;
    expect(gasInc).toBeDefined();

    // 1. Acknowledge incident
    useSentinelStore.getState().acknowledgeIncident(gasInc.id);
    expect(isIncidentAcknowledged(useSentinelStore.getState().activeIncidents.find(i => i.id === gasInc.id))).toBe(true);

    // 2. Safety verification inspection (5-second physical verification)
    useSentinelStore.getState().requestSafetyInspection('CHEMICAL_LAB');
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CHEMICAL_LAB).toBe('IN_PROGRESS');

    // Advance clock to complete inspection
    for (let i = 0; i < 10; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().hazardEnv.inspectionStatus.CHEMICAL_LAB === 'PASSED') break;
    }
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CHEMICAL_LAB).toBe('PASSED');

    // State is now VERIFIED_SAFE_AWAITING_CLOSURE
    const opVerified = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(opVerified.status).toBe('VERIFIED_SAFE_AWAITING_CLOSURE');
    expect(opVerified.hazardState).toBe('VERIFIED_SAFE');

    // 3. Authorise closure
    const closureRes = useSentinelStore.getState().authorizeIncidentClosure(gasInc.id);
    expect(closureRes.success).toBe(true);

    // Verify outcomes:
    const stateAfterClosure = useSentinelStore.getState();
    // - Incident is marked Resolved
    expect(stateAfterClosure.activeIncidents.find(i => i.id === gasInc.id)).toBeUndefined();
    const archivedInc = stateAfterClosure.resolvedIncidents.find(i => i.id === gasInc.id);
    expect(archivedInc).toBeDefined();
    expect(archivedInc?.state).toBe('RESOLVED');

    // - Operational panel no longer reports active hazard
    const opClosed = stateAfterClosure.getZoneOperationalState('CHEMICAL_LAB');
    expect(opClosed.status).not.toBe('ACTIVE_HAZARD');
    expect(opClosed.status).toBe('INCIDENT_RESOLVED_RECOVERY_PENDING');
  });

  it('Test C — Equipment Restoration: recovery controls enable after closure, restoration preserves gas isolation valve, transitions to Normal Operations', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    // Step to containment
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }

    const gasInc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;

    // Recovery is blocked BEFORE closure and verification
    const opBefore = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(opBefore.canRestoreEquipment).toBe(false);
    expect(opBefore.recoveryUnmetReasons.length).toBeGreaterThan(0);

    // Complete Ack -> Verify -> Close
    useSentinelStore.getState().acknowledgeIncident(gasInc.id);
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        inspectionStatus: { ...s.hazardEnv.inspectionStatus, CHEMICAL_LAB: 'PASSED' }
      }
    }));
    useSentinelStore.getState().authorizeIncidentClosure(gasInc.id);

    // Recovery is now permitted
    const opPermitted = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(opPermitted.canRestoreEquipment).toBe(true);

    // Restore equipment through authorised procedure
    const recoverRes = useSentinelStore.getState().recoverZoneEquipment('CHEMICAL_LAB');
    expect(recoverRes.success).toBe(true);

    const stateFinal = useSentinelStore.getState();
    // Section 6: Do not automatically reopen the gas isolation valve.
    expect(stateFinal.protectionEquipment.gasIsolationValve.state).toBe('ISOLATED');
    expect(stateFinal.protectionEquipment.emergencyVentilation.state).toBe('STANDBY');
    expect(stateFinal.protectionEquipment.chemicalEquipmentShutdown.state).toBe('STANDBY');

    // Zone transitions to Normal Operations
    const opFinal = stateFinal.getZoneOperationalState('CHEMICAL_LAB');
    expect(opFinal.status).toBe('NORMAL');
    expect(opFinal.label).toBe('NORMAL OPERATIONS');
  });

  it('Test D — Extraction Consistency: purge ongoing when Operating, purge completed when Complete, never contradictory', () => {
    useSentinelStore.setState(s => ({
      telemetry: { ...s.telemetry, gasConcentration: 120 },
      hazardEnv: { ...s.hazardEnv, gasConcentration: 120, gasSourceActive: false, gasReleaseRate: 0 },
      protectionEquipment: {
        ...s.protectionEquipment,
        gasIsolationValve: { ...s.protectionEquipment.gasIsolationValve, state: 'ISOLATED' },
        emergencyVentilation: { ...s.protectionEquipment.emergencyVentilation, state: 'OPERATING', details: 'Purge cycle active' }
      }
    }));

    const opOperating = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(opOperating.details).toContain('purge ongoing');
    expect(opOperating.status).toBe('RESPONSE_IN_PROGRESS');

    // Now set scrubber to COMPLETED
    useSentinelStore.setState(s => ({
      telemetry: { ...s.telemetry, gasConcentration: 20 },
      hazardEnv: { ...s.hazardEnv, gasConcentration: 20, gasSourceActive: false, gasReleaseRate: 0 },
      protectionEquipment: {
        ...s.protectionEquipment,
        emergencyVentilation: {
          ...s.protectionEquipment.emergencyVentilation,
          state: 'COMPLETED',
          details: 'Purge cycle complete. Residual toxic gas neutralized below 40/255.'
        }
      }
    }));

    const opComplete = useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB');
    expect(opComplete.details).not.toContain('purge ongoing');
    expect(opComplete.details).toContain('Hazard contained');
  });

  it('Test E — Failed Isolation: hazard remains active while release continues, alternative manual isolation enables containment', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_FAIL');

    // Step simulation
    for (let i = 0; i < 5; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const stateFailed = useSentinelStore.getState();
    expect(stateFailed.protectionEquipment.gasIsolationValve.state).toBe('FAILED');
    expect(stateFailed.hazardEnv.gasReleaseRate).toBeGreaterThan(0);

    const opFailed = stateFailed.getZoneOperationalState('CHEMICAL_LAB');
    expect(opFailed.status).toBe('ACTIVE_HAZARD');
    expect(opFailed.canRestoreEquipment).toBe(false);

    // Operator executes manual retry isolation
    const isolateRes = useSentinelStore.getState().executeManualIntervention('MANUAL_GAS_ISOLATE', 'CHEMICAL_LAB');
    expect(isolateRes.success).toBe(true);

    const stateIsolated = useSentinelStore.getState();
    expect(stateIsolated.protectionEquipment.gasIsolationValve.state).toBe('ISOLATED');
    expect(stateIsolated.hazardEnv.gasReleaseRate).toBe(0);

    // Extraction scrubber now neutralizes residual gas
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }

    const stateContained = useSentinelStore.getState();
    expect(stateContained.telemetry.gasConcentration).toBeLessThanOrEqual(40);
    const opContained = stateContained.getZoneOperationalState('CHEMICAL_LAB');
    expect(opContained.hazardState).toBe('CONTAINED');
    expect(opContained.status).toBe('AWAITING_SAFETY_VERIFICATION');
  });

  it('Test F — Cross-View Consistency: Command Centre, Incident Management, and Operations share consistent state', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    // Step to containment
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }

    const store = useSentinelStore.getState();
    const opState = store.getZoneOperationalState('CHEMICAL_LAB');
    const gasInc = store.activeIncidents.find(i => i.zoneId === 'CHEMICAL_LAB');

    // All views must read from the same authoritative state:
    expect(opState.hazardState).toBe('CONTAINED');
    expect(opState.status).toBe('AWAITING_SAFETY_VERIFICATION');
    expect(gasInc).toBeDefined();
    expect(gasInc?.conditionActive).toBe(false); // concentration <= 40

    // Switch views and assert consistency
    useSentinelStore.getState().setView('incident-management');
    expect(useSentinelStore.getState().currentView).toBe('incident-management');
    expect(useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB').status).toBe('AWAITING_SAFETY_VERIFICATION');

    useSentinelStore.getState().setView('operations');
    expect(useSentinelStore.getState().currentView).toBe('operations');
    expect(useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB').status).toBe('AWAITING_SAFETY_VERIFICATION');

    useSentinelStore.getState().setView('command-centre');
    expect(useSentinelStore.getState().currentView).toBe('command-centre');
    expect(useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB').status).toBe('AWAITING_SAFETY_VERIFICATION');
  });

  it('Test G — Reset and Repeat: Full emergency lifecycle completes, new gas leak scenario begins clean without stale status', () => {
    // Run full lifecycle 1
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_SUCCESS');
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }
    const incId = useSentinelStore.getState().activeIncidents[0].id;
    useSentinelStore.getState().acknowledgeIncident(incId);
    useSentinelStore.setState(s => ({
      hazardEnv: { ...s.hazardEnv, inspectionStatus: { ...s.hazardEnv.inspectionStatus, CHEMICAL_LAB: 'PASSED' } }
    }));
    useSentinelStore.getState().authorizeIncidentClosure(incId);
    useSentinelStore.getState().recoverZoneEquipment('CHEMICAL_LAB');

    expect(useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB').status).toBe('NORMAL');

    // Reset simulation
    useSentinelStore.getState().resetSimulation();
    expect(useSentinelStore.getState().activeIncidents).toHaveLength(0);
    expect(useSentinelStore.getState().telemetry.gasConcentration).toBe(20);

    // Run new gas leak scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_SUCCESS');
    const newInc = useSentinelStore.getState().activeIncidents[0];
    expect(newInc).toBeDefined();
    expect(newInc.category).toBe('GAS_LEAKAGE');
    expect(newInc.state).toBe('ACTIVE_UNACKNOWLEDGED');
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CHEMICAL_LAB).toBeUndefined();
    expect(['ACTIVE_HAZARD', 'RESPONSE_IN_PROGRESS']).toContain(useSentinelStore.getState().getZoneOperationalState('CHEMICAL_LAB').status);
  });

  it('Test H — Multiple Incidents: Fire and Gas run simultaneously; resolving Gas leaves Fire actively progressing', () => {
    // Trigger simultaneous Fire & Gas
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_SIMULTANEOUS');

    const state0 = useSentinelStore.getState();
    const fireInc = state0.activeIncidents.find(i => i.category === 'FIRE');
    const gasInc = state0.activeIncidents.find(i => i.category === 'GAS_LEAKAGE');
    expect(fireInc).toBeDefined();
    expect(gasInc).toBeDefined();

    // Step simulation to contain gas
    for (let i = 0; i < 20; i++) {
      useSentinelStore.getState().stepSimulationTick();
      if (useSentinelStore.getState().telemetry.gasConcentration <= 40) break;
    }

    // Resolve ONLY gas incident
    useSentinelStore.getState().acknowledgeIncident(gasInc!.id);
    useSentinelStore.setState(s => ({
      hazardEnv: { ...s.hazardEnv, inspectionStatus: { ...s.hazardEnv.inspectionStatus, CHEMICAL_LAB: 'PASSED' } }
    }));
    useSentinelStore.getState().authorizeIncidentClosure(gasInc!.id);

    const stateAfterGasResolved = useSentinelStore.getState();
    // Gas is archived
    expect(stateAfterGasResolved.activeIncidents.find(i => i.id === gasInc!.id)).toBeUndefined();
    expect(stateAfterGasResolved.resolvedIncidents.find(i => i.id === gasInc!.id)).toBeDefined();

    // Fire MUST remain active and independent!
    const activeFire = stateAfterGasResolved.activeIncidents.find(i => i.id === fireInc!.id);
    expect(activeFire).toBeDefined();
    expect(activeFire?.category).toBe('FIRE');
    // Fire is not closed merely because gas was closed
    expect(stateAfterGasResolved.resolvedIncidents.find(i => i.id === fireInc!.id)).toBeUndefined();
    const fireOp = stateAfterGasResolved.getZoneOperationalState('RESEARCH_LAB');
    expect(['ACTIVE_HAZARD', 'RESPONSE_IN_PROGRESS', 'AWAITING_SAFETY_VERIFICATION']).toContain(fireOp.status);
    expect(fireOp.status).not.toBe('NORMAL');
  });
});
