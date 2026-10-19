import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { simulationScheduler } from '../core/simulationScheduler';
import { isIncidentAcknowledged } from '../types';

describe('SENTINEL — Control Room Manual Emergency Verification, Alarm Lifecycle & Guided Workflow Suite', () => {
  beforeEach(() => {
    simulationScheduler.stop();
    useSentinelStore.getState().resetSimulation();
  });

  // ==================== PART A: MANUAL EMERGENCY LIFECYCLE TESTS ====================

  it('Test 1-4: Triggering Control Room manual emergency creates Priority 1 incident for ZN-04 with active trip and immediate acknowledgement availability', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const state = useSentinelStore.getState();
    const inc = state.activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
    expect(inc).toBeDefined();
    expect(inc?.zoneId).toBe('CONTROL_ROOM');
    expect(inc?.priority).toBe(1);
    expect(isIncidentAcknowledged(inc)).toBe(false);
    expect(state.telemetry.manualEmergencyActive).toBe(true);
    expect(state.hazardEnv.manualEmergencyActive).toBe(true);

    // Urgent manual intervention is accessible before acknowledgement
    const tripActiveInOperations = state.telemetry.manualEmergencyActive;
    expect(tripActiveInOperations).toBe(true);

    // Immediate acknowledgement
    useSentinelStore.getState().acknowledgeIncident(inc!.id);
    const stateAck = useSentinelStore.getState();
    const ackInc = stateAck.activeIncidents.find(i => i.id === inc!.id);
    expect(isIncidentAcknowledged(ackInc)).toBe(true);
    // Manual trip remains active until explicitly cleared
    expect(stateAck.telemetry.manualEmergencyActive).toBe(true);
  });

  it('Test 5: Verification is blocked when manual trip is still active in Control Room', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    useSentinelStore.getState().acknowledgeIncident(inc.id);

    // Attempt verification while trip is active
    const verifyRes = useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.message).toContain('Safety Verification Unavailable — Manual Emergency Trip Still Active');
    expect(verifyRes.zoneId).toBe('CONTROL_ROOM');

    // Inspection status remains NONE
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('NONE');

    // Closure and Reset are both blocked
    const closureVal = useSentinelStore.getState().getClosureValidation(inc.id);
    expect(closureVal?.canClose).toBe(false);
    const resetRes = useSentinelStore.getState().resetIncident(inc.id);
    expect(resetRes.success).toBe(false);
  });

  it('Test 6-10: Five-second inspection runs deterministically through central scheduler, references Control Room, and passes when conditions are safe', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    useSentinelStore.getState().acknowledgeIncident(inc.id);

    // Clear manual trip
    useSentinelStore.getState().setSensorValue('manualEmergencyActive', false);
    useSentinelStore.getState().stepSimulationTick();
    expect(useSentinelStore.getState().telemetry.manualEmergencyActive).toBe(false);

    // Initiate safety verification
    const verifyRes = useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.zoneId).toBe('CONTROL_ROOM');
    expect(verifyRes.message).toContain('Control Room');
    expect(verifyRes.message).not.toContain('Research Laboratory');

    // Check inspection state in store
    let currentState = useSentinelStore.getState();
    expect(currentState.hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('IN_PROGRESS');
    expect(currentState.hazardEnv.inspectionCountdown.CONTROL_ROOM).toBe(5);

    // Verify recent event references Control Room, not Research Laboratory
    const recentEvent = currentState.eventLog[0];
    expect(recentEvent.zoneId).toBe('CONTROL_ROOM');
    expect(recentEvent.category).toBe('MANUAL_EMERGENCY');
    expect(recentEvent.message).toContain('Control Room');
    expect(recentEvent.message).not.toContain('Research Laboratory');

    // Step simulation through central scheduler (countdown 5 -> 4 -> 3 -> 2 -> 1 -> 0 / PASSED)
    for (let i = 0; i < 5; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    currentState = useSentinelStore.getState();
    expect(currentState.hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('PASSED');
    expect(currentState.hazardEnv.containmentStatus.manual).toBe('CONTAINED');

    // Verify pass event
    const passEvent = currentState.eventLog.find(e => e.type === 'SAFETY_VERIFIED' && e.zoneId === 'CONTROL_ROOM');
    expect(passEvent).toBeDefined();
    expect(passEvent?.category).toBe('MANUAL_EMERGENCY');
  });

  it('Test 11: Inspection fails if manual trip is re-engaged during verification', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    useSentinelStore.getState().acknowledgeIncident(inc.id);
    useSentinelStore.getState().setSensorValue('manualEmergencyActive', false);
    useSentinelStore.getState().stepSimulationTick();

    // Start verification
    useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('IN_PROGRESS');

    // Tick 2 seconds
    useSentinelStore.getState().stepSimulationTick();
    useSentinelStore.getState().stepSimulationTick();

    // Re-engage manual trip switch midway through inspection!
    useSentinelStore.getState().setSensorValue('manualEmergencyActive', true);

    // Finish countdown
    for (let i = 0; i < 4; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }

    const state = useSentinelStore.getState();
    expect(state.hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('FAILED');
    const failEvent = state.eventLog.find(e => e.type === 'INSPECTION_FAILED' && e.zoneId === 'CONTROL_ROOM');
    expect(failEvent).toBeDefined();
  });

  it('Test 12-16: Strict lifecycle ordering: Authorise Closure unlocks after verification, and Reset Alarm unlocks only after Authorise Closure', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    useSentinelStore.getState().acknowledgeIncident(inc.id);

    // Before trip clearance: Closure disabled, Reset disabled
    let closureVal = useSentinelStore.getState().getClosureValidation(inc.id)!;
    expect(closureVal.canClose).toBe(false);
    let resetAttempt = useSentinelStore.getState().resetIncident(inc.id);
    expect(resetAttempt.success).toBe(false);

    // Clear trip switch
    useSentinelStore.getState().setSensorValue('manualEmergencyActive', false);
    useSentinelStore.getState().stepSimulationTick();

    // After trip clearance, but BEFORE safety verification:
    // Closure disabled, Reset disabled
    closureVal = useSentinelStore.getState().getClosureValidation(inc.id)!;
    expect(closureVal.canClose).toBe(false);
    expect(closureVal.unmetReasons.some(r => r.includes('Safety verification inspection unmet'))).toBe(true);

    resetAttempt = useSentinelStore.getState().resetIncident(inc.id);
    expect(resetAttempt.success).toBe(false);

    // Run 5s verification to completion
    useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    for (let i = 0; i < 5; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('PASSED');

    // After verification passed:
    // Authorise Closure is now SATISFIED and ELIGIBLE!
    closureVal = useSentinelStore.getState().getClosureValidation(inc.id)!;
    expect(closureVal.canClose).toBe(true);

    // But Reset Alarm remains LOCKED until closure is explicitly authorised!
    resetAttempt = useSentinelStore.getState().resetIncident(inc.id);
    expect(resetAttempt.success).toBe(false);
    expect(resetAttempt.message).toContain('Emergency closure must be formally authorised');

    // Explicitly Authorise Emergency Closure
    const closureRes = useSentinelStore.getState().authorizeIncidentClosure(inc.id);
    expect(closureRes.success).toBe(true);
    expect(closureRes.message).toContain('Emergency closure formally authorised');

    // Incident is now closure authorised in active incidents
    const stateAfterClosure = useSentinelStore.getState();
    const closedInc = stateAfterClosure.activeIncidents.find(i => i.id === inc.id);
    expect(closedInc).toBeDefined();
    expect(closedInc?.closureAuthorizedAt).toBeDefined();

    // NOW Reset Alarm becomes available and permitted!
    const finalReset = useSentinelStore.getState().resetIncident(inc.id);
    expect(finalReset.success).toBe(true);
    expect(finalReset.message).toContain('Alarm reset confirmed');

    // Incident is now archived in resolvedIncidents
    const stateFinal = useSentinelStore.getState();
    expect(stateFinal.activeIncidents.find(i => i.id === inc.id)).toBeUndefined();
    const resolved = stateFinal.resolvedIncidents.find(i => i.id === inc.id);
    expect(resolved).toBeDefined();
    expect(resolved?.state).toBe('RESOLVED');
  });

  it('Test 17: A second manual emergency starts with fresh verification and closure state', () => {
    const store = useSentinelStore.getState();

    // Run cycle 1
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();
    let inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    store.acknowledgeIncident(inc.id);
    store.setSensorValue('manualEmergencyActive', false);
    store.stepSimulationTick();
    store.requestSafetyInspection('CONTROL_ROOM');
    for (let i = 0; i < 5; i++) store.stepSimulationTick();
    store.authorizeIncidentClosure(inc.id);
    store.resetIncident(inc.id);

    expect(useSentinelStore.getState().activeIncidents.length).toBe(0);

    // Trigger cycle 2
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const state2 = useSentinelStore.getState();
    const inc2 = state2.activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
    expect(inc2).toBeDefined();
    expect(inc2?.closureAuthorizedAt).toBeUndefined();
    expect(state2.hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('NONE');
    expect(state2.hazardEnv.inspectionCountdown.CONTROL_ROOM).toBe(0);
    expect(state2.telemetry.manualEmergencyActive).toBe(true);
  });

  // ==================== PART B: GUIDED NAVIGATION TESTS ====================

  it('Test 18-21: Guided Navigation generates correct sequential actions for manual emergency and deduplicates', () => {
    const store = useSentinelStore.getState();
    store.triggerManualEmergency('CONTROL_ROOM');
    store.stepSimulationTick();

    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;

    // Stage 1: Unacknowledged -> Acknowledgement
    let actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions[0].stage).toBe('ACKNOWLEDGEMENT');
    expect(actions[0].actionLabel).toBe('Proceed to Acknowledgement');
    expect(actions[0].priority).toBe(1);

    // Acknowledge alarm
    useSentinelStore.getState().acknowledgeIncident(inc.id);

    // Stage 2: Trip active -> Clear Manual Emergency Trip
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions[0].stage).toBe('CLEAR_MANUAL_TRIP');
    expect(actions[0].actionLabel).toBe('Clear Manual Emergency Trip');
    expect(actions[0].destinationView).toBe('operations');
    expect(actions[0].targetControlId).toBe('action-clear-manual-trip');

    // Test Navigation targeting
    useSentinelStore.getState().navigateToGuidedAction(actions[0]);
    expect(useSentinelStore.getState().currentView).toBe('operations');
    expect(useSentinelStore.getState().selectedZoneId).toBe('CONTROL_ROOM');
    expect(useSentinelStore.getState().activeHighlightTarget).toBe('action-clear-manual-trip');

    // Clear trip switch
    useSentinelStore.getState().setSensorValue('manualEmergencyActive', false);
    useSentinelStore.getState().stepSimulationTick();

    // Stage 3: Trip cleared -> Proceed to Safety Verification
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions[0].stage).toBe('SAFETY_INSPECTION');
    expect(actions[0].actionLabel).toBe('Proceed to Safety Verification');
    expect(actions[0].destinationView).toBe('incident-management');
    expect(actions[0].targetControlId).toBe('action-inspect-CONTROL_ROOM');

    // Start verification
    useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');

    // While inspection is in progress, the initiation action is NOT repeated
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions.some(a => a.stage === 'SAFETY_INSPECTION')).toBe(false);

    // Complete 5s countdown
    for (let i = 0; i < 5; i++) useSentinelStore.getState().stepSimulationTick();

    // Stage 4: Verification passed -> Proceed to Emergency Closure
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions[0].stage).toBe('CLOSURE');
    expect(actions[0].actionLabel).toBe('Proceed to Emergency Closure');
    expect(actions[0].targetControlId).toBe(`action-close-${inc.id}`);

    // Authorise closure
    useSentinelStore.getState().authorizeIncidentClosure(inc.id);

    // Stage 5: Closure authorised -> Proceed to Alarm Reset
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions[0].stage).toBe('ALARM_RESET');
    expect(actions[0].actionLabel).toBe('Proceed to Alarm Reset');
    expect(actions[0].targetControlId).toBe(`action-reset-${inc.id}`);

    // Reset alarm
    useSentinelStore.getState().resetIncident(inc.id);

    // Stage 6: All actions completed, queue is clear
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions.find(a => a.incidentId === inc.id)).toBeUndefined();
  });

  // ==================== PART C: CROSS-INCIDENT REGRESSION TESTS ====================

  it('Test 22: Simultaneous Fire, Gas, Security, and Manual emergencies progress independently without cross-talk', () => {
    const store = useSentinelStore.getState();

    // Trigger all 4 incidents
    store.setSensorValue('temperature', 75);
    store.setSensorValue('smokeDetected', true);
    store.setSensorValue('gasConcentration', 130);
    store.setSensorValue('intrusionDetected', true);
    store.setSensorValue('manualEmergencyActive', true);
    store.setSensorValue('manualEmergencyZone', 'CONTROL_ROOM');
    store.stepSimulationTick();

    const state = useSentinelStore.getState();
    expect(state.activeIncidents).toHaveLength(4);

    const manualInc = state.activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY')!;
    const fireInc = state.activeIncidents.find(i => i.category === 'FIRE')!;
    const gasInc = state.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;
    const secInc = state.activeIncidents.find(i => i.category === 'INTRUSION')!;

    // Strict priority ordering in activeIncidents
    expect(manualInc.priority).toBe(1);
    expect(fireInc.priority).toBe(2);
    expect(gasInc.priority).toBe(3);
    expect(secInc.priority).toBe(4);

    // Acknowledge manual emergency
    store.acknowledgeIncident(manualInc.id);
    expect(isIncidentAcknowledged(useSentinelStore.getState().activeIncidents.find(i => i.id === manualInc.id))).toBe(true);
    expect(isIncidentAcknowledged(useSentinelStore.getState().activeIncidents.find(i => i.id === fireInc.id))).toBe(false);

    // Clear manual trip only
    store.setSensorValue('manualEmergencyActive', false);
    store.stepSimulationTick();

    // Verify fire and gas are unaffected
    expect(useSentinelStore.getState().telemetry.temperature).toBeGreaterThanOrEqual(50);
    expect(useSentinelStore.getState().telemetry.gasConcentration).toBeGreaterThan(40);

    // Run manual inspection
    store.requestSafetyInspection('CONTROL_ROOM');
    for (let i = 0; i < 5; i++) store.stepSimulationTick();
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus.CONTROL_ROOM).toBe('PASSED');
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESEARCH_LAB ?? 'NONE').toBe('NONE');

    // Authorise closure for manual emergency
    store.authorizeIncidentClosure(manualInc.id);
    store.resetIncident(manualInc.id);

    // Manual is resolved, other 3 incidents remain completely intact
    const remaining = useSentinelStore.getState().activeIncidents;
    expect(remaining).toHaveLength(3);
    expect(remaining.some(i => i.category === 'FIRE')).toBe(true);
    expect(remaining.some(i => i.category === 'GAS_LEAKAGE')).toBe(true);
    expect(remaining.some(i => i.category === 'INTRUSION')).toBe(true);
  });
});
