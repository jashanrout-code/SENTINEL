import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { isIncidentAcknowledged } from '../types';
import { normalizeIncidentRecord } from '../core/incidentNormalizer';
import { validateResetEligibility } from '../core/monitoringEngine';

describe('SENTINEL — Authoritative Alarm Acknowledgement & Incident Closure Suite', () => {
  beforeEach(() => {
    useSentinelStore.getState().resetSimulation();
  });

  // Test A — New Incident
  it('Test A: New Incident initiates with unacknowledged status across all indicators', () => {
    const store = useSentinelStore.getState();

    // Trigger Fire scenario
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    const state = useSentinelStore.getState();
    const activeIncidents = state.activeIncidents;
    expect(activeIncidents.length).toBeGreaterThanOrEqual(1);

    const fireIncident = activeIncidents.find(i => i.category === 'FIRE')!;
    expect(fireIncident).toBeDefined();

    // Canonical state check
    expect(isIncidentAcknowledged(fireIncident)).toBe(false);
    expect(fireIncident.acknowledgedAt).toBeNull();

    // Unacknowledged counter check
    const unackCount = activeIncidents.filter(i => !isIncidentAcknowledged(i)).length;
    expect(unackCount).toBe(activeIncidents.length);

    // Reset validation check
    const resetVal = validateResetEligibility(fireIncident);
    expect(resetVal.canReset).toBe(false);
    expect(resetVal.reasons.some(r => r.includes('must be acknowledged'))).toBe(true);

    // Closure validation check
    const closureVal = state.getClosureValidation(fireIncident.id)!;
    expect(closureVal).toBeDefined();
    expect(closureVal.canClose).toBe(false);
    const ackCond = closureVal.conditions.find(c => c.id === 'acknowledged')!;
    expect(ackCond.status).toBe('PENDING');
  });

  // Test B — Acknowledge Incident
  it('Test B: Acknowledging incident updates canonical record and all indicators synchronously', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    let state = useSentinelStore.getState();
    const fireIncident = state.activeIncidents.find(i => i.category === 'FIRE')!;
    const initialUnack = state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length;

    // Operator acknowledges alarm
    const nowBefore = Date.now();
    store.acknowledgeIncident(fireIncident.id);
    const nowAfter = Date.now();

    state = useSentinelStore.getState();
    const updatedIncident = state.activeIncidents.find(i => i.id === fireIncident.id)!;

    // Canonical record is updated
    expect(isIncidentAcknowledged(updatedIncident)).toBe(true);
    expect(typeof updatedIncident.acknowledgedAt).toBe('number');
    expect(updatedIncident.acknowledgedAt).toBeGreaterThanOrEqual(nowBefore);
    expect(updatedIncident.acknowledgedAt).toBeLessThanOrEqual(nowAfter);
    expect(updatedIncident.acknowledgedBy).toBe('Control Room Operator');

    // Unacknowledged counter decreases
    const nextUnack = state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length;
    expect(nextUnack).toBe(initialUnack - 1);

    // Reset interlock: acknowledgement passes
    const resetVal = validateResetEligibility(updatedIncident);
    expect(resetVal.reasons.some(r => r.includes('must be acknowledged'))).toBe(false);

    // Closure interlock: acknowledgement condition is SATISFIED
    const closureVal = state.getClosureValidation(updatedIncident.id)!;
    const ackCond = closureVal.conditions.find(c => c.id === 'acknowledged')!;
    expect(ackCond.status).toBe('SATISFIED');
  });

  // Test C — Closure Eligibility
  it('Test C: Closure requires all safety conditions in addition to acknowledgement', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    let state = useSentinelStore.getState();
    const fireIncident = state.activeIncidents.find(i => i.category === 'FIRE')!;

    // Acknowledge incident
    store.acknowledgeIncident(fireIncident.id);
    state = useSentinelStore.getState();

    // Acknowledgement passed, but closure still unavailable because fire is active
    let closureVal = state.getClosureValidation(fireIncident.id)!;
    expect(closureVal.conditions.find(c => c.id === 'acknowledged')?.status).toBe('SATISFIED');
    expect(closureVal.canClose).toBe(false);

    const attemptClose = store.authorizeIncidentClosure(fireIncident.id);
    expect(attemptClose.success).toBe(false);
    expect(attemptClose.message).toContain('Closure Interlock');

    // Now satisfy the safety prerequisites (containment, safe sensors, verification inspection)
    useSentinelStore.setState({
      hazardEnv: {
        ...state.hazardEnv,
        fireIntensity: 0,
        ambientTemperature: 24,
        smokeConcentration: 0,
        inspectionStatus: {
          ...state.hazardEnv.inspectionStatus,
          RESEARCH_LAB: 'PASSED',
        },
      },
      telemetry: {
        ...state.telemetry,
        temperature: 24,
        smokeDetected: false,
      },
    });

    state = useSentinelStore.getState();
    closureVal = state.getClosureValidation(fireIncident.id)!;
    expect(closureVal.canClose).toBe(true);

    // Now operator can successfully authorize closure
    const authorized = store.authorizeIncidentClosure(fireIncident.id);
    expect(authorized.success).toBe(true);

    const postState = useSentinelStore.getState();
    expect(postState.activeIncidents.some(i => i.id === fireIncident.id)).toBe(false);
    expect(postState.resolvedIncidents.some(i => i.id === fireIncident.id)).toBe(true);
  });

  // Test D — Multiple Incidents
  it('Test D: Multiple simultaneous incidents are tracked and acknowledged independently', () => {
    const store = useSentinelStore.getState();

    // Simultaneously trigger fire, gas, and security intrusion telemetry
    useSentinelStore.setState({
      telemetry: {
        ...store.telemetry,
        temperature: 80,
        smokeDetected: true,
        gasConcentration: 150,
        intrusionDetected: true,
      },
      hazardEnv: {
        ...store.hazardEnv,
        fireIntensity: 80,
        ambientTemperature: 80,
        smokeConcentration: 70,
        gasSourceActive: true,
        gasConcentration: 150,
        intrusionBreachActive: true,
      },
    });

    // Step simulation tick
    store.stepSimulationTick();

    let state = useSentinelStore.getState();
    expect(state.activeIncidents.length).toBe(3);

    const fireInc = state.activeIncidents.find(i => i.category === 'FIRE')!;
    const gasInc = state.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;
    const intrusionInc = state.activeIncidents.find(i => i.category === 'INTRUSION')!;

    expect(fireInc).toBeDefined();
    expect(gasInc).toBeDefined();
    expect(intrusionInc).toBeDefined();

    expect(state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length).toBe(3);

    // Acknowledge ONLY gas incident
    store.acknowledgeIncident(gasInc.id);

    state = useSentinelStore.getState();
    const updatedGas = state.activeIncidents.find(i => i.id === gasInc.id)!;
    const updatedFire = state.activeIncidents.find(i => i.id === fireInc.id)!;
    const updatedIntrusion = state.activeIncidents.find(i => i.id === intrusionInc.id)!;

    expect(isIncidentAcknowledged(updatedGas)).toBe(true);
    expect(isIncidentAcknowledged(updatedFire)).toBe(false);
    expect(isIncidentAcknowledged(updatedIntrusion)).toBe(false);

    expect(state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length).toBe(2);

    // Acknowledge remaining incidents
    store.acknowledgeIncident(fireInc.id);
    store.acknowledgeIncident(intrusionInc.id);

    state = useSentinelStore.getState();
    expect(state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length).toBe(0);
    expect(state.activeIncidents.every(i => isIncidentAcknowledged(i))).toBe(true);
  });

  // Test E — Legacy Records Normalization
  it('Test E: Normalizes legacy records with conflicting fields and prevents permanent lock', () => {
    // Case 1: Legacy record claiming ACTIVE_ACKNOWLEDGED but with acknowledgedAt = null
    const invalidAckRecord = {
      id: 'INC-LEGACY-01',
      category: 'FIRE' as const,
      zoneId: 'RESEARCH_LAB' as const,
      priority: 1,
      detectedAt: Date.now() - 60000,
      acknowledgedAt: null,
      state: 'ACTIVE_ACKNOWLEDGED' as const,
      conditionActive: true,
      details: 'Conflicting legacy incident.',
      responses: {},
      operatorAcknowledged: true, // legacy boolean mismatch
    };

    const normalized1 = normalizeIncidentRecord(invalidAckRecord);
    // Reliable evidence (acknowledgedAt) is null, so it must be treated as unacknowledged
    expect(isIncidentAcknowledged(normalized1)).toBe(false);
    expect(normalized1.acknowledgedAt).toBeNull();
    expect(normalized1.operatorAcknowledged).toBe(false);
    expect(normalized1.state).toBe('ACTIVE_UNACKNOWLEDGED');

    // Case 2: Condition cleared before acknowledgement
    const clearedUnack = {
      id: 'INC-LEGACY-02',
      category: 'GAS_LEAKAGE' as const,
      zoneId: 'CHEMICAL_LAB' as const,
      priority: 2,
      detectedAt: Date.now() - 30000,
      acknowledgedAt: null,
      state: 'CONDITION_CLEARED' as const,
      conditionActive: false,
      details: 'Gas cleared before ack.',
      responses: {},
    };

    const normalized2 = normalizeIncidentRecord(clearedUnack);
    expect(isIncidentAcknowledged(normalized2)).toBe(false);
    expect(normalized2.acknowledgedAt).toBeNull();
    // Cannot reset until acknowledged
    const resetRes = validateResetEligibility(normalized2);
    expect(resetRes.canReset).toBe(false);
    expect(resetRes.reasons[0]).toContain('must be acknowledged');

    // Case 3: Legacy record with valid timestamp
    const validLegacy = {
      id: 'INC-LEGACY-03',
      category: 'INTRUSION' as const,
      zoneId: 'RESTRICTED_STORAGE' as const,
      priority: 3,
      detectedAt: Date.now() - 50000,
      acknowledgedAt: Date.now() - 40000,
      state: 'ACTIVE_UNACKNOWLEDGED' as const, // stale state mismatch
      conditionActive: true,
      details: 'Valid acknowledged timestamp but stale state string.',
      responses: {},
    };

    const normalized3 = normalizeIncidentRecord(validLegacy);
    expect(isIncidentAcknowledged(normalized3)).toBe(true);
    expect(normalized3.state).toBe('ACTIVE_ACKNOWLEDGED');
    expect(normalized3.operatorAcknowledged).toBe(true);
  });

  // Test F — Navigation Preserves State
  it('Test F: Navigation between views retains exact acknowledgement state', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    let state = useSentinelStore.getState();
    const gasInc = state.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;
    store.acknowledgeIncident(gasInc.id);

    state = useSentinelStore.getState();
    const ackTimestamp = state.activeIncidents.find(i => i.id === gasInc.id)!.acknowledgedAt;
    expect(ackTimestamp).toBeGreaterThan(0);

    // Switch view to Incident Management
    store.setView('incident-management');
    expect(useSentinelStore.getState().currentView).toBe('incident-management');
    expect(isIncidentAcknowledged(useSentinelStore.getState().activeIncidents[0])).toBe(true);

    // Switch view to Operations
    store.setView('operations');
    expect(useSentinelStore.getState().currentView).toBe('operations');
    expect(isIncidentAcknowledged(useSentinelStore.getState().activeIncidents[0])).toBe(true);

    // Return to Command Centre
    store.setView('command-centre');
    expect(useSentinelStore.getState().currentView).toBe('command-centre');
    const returnedInc = useSentinelStore.getState().activeIncidents[0];
    expect(isIncidentAcknowledged(returnedInc)).toBe(true);
    expect(returnedInc.acknowledgedAt).toBe(ackTimestamp);
  });

  // Test G — Reset and Simulation Cleanliness
  it('Test G: Simulation reset restores completely clean baseline without stale acknowledgement', () => {
    const store = useSentinelStore.getState();
    store.applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    let state = useSentinelStore.getState();
    const fireInc = state.activeIncidents[0];
    store.acknowledgeIncident(fireInc.id);

    state = useSentinelStore.getState();
    expect(state.activeIncidents.every(i => isIncidentAcknowledged(i))).toBe(true);

    // Reset simulation
    store.resetSimulation();

    state = useSentinelStore.getState();
    expect(state.activeIncidents).toHaveLength(0);
    expect(state.resolvedIncidents.length).toBeGreaterThanOrEqual(1);

    // Start a new emergency
    store.applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    state = useSentinelStore.getState();
    expect(state.activeIncidents.length).toBeGreaterThanOrEqual(1);
    const newGasInc = state.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;

    // New incident has fresh unacknowledged state, no carry-over
    expect(isIncidentAcknowledged(newGasInc)).toBe(false);
    expect(newGasInc.acknowledgedAt).toBeNull();
    expect(newGasInc.operatorAcknowledged).toBe(false);
    expect(state.activeIncidents.filter(i => !isIncidentAcknowledged(i)).length).toBe(state.activeIncidents.length);
  });
});
