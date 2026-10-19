import { describe, it, expect } from 'vitest';
import {
  evaluateConditions,
  stepMonitoringEngine,
  acknowledgeIncidentInEngine,
  resetIncidentInEngine,
  validateResetEligibility,
  calculateAutomaticResponses
} from '../core/monitoringEngine';
import { INITIAL_TELEMETRY } from '../core/scenarios';
import type { SensorTelemetry } from '../types';


describe('SENTINEL Monitoring Engine - Detection Rules', () => {
  it('nominal baseline sensor readings produce no active emergencies', () => {
    const results = evaluateConditions(INITIAL_TELEMETRY);
    expect(results.FIRE.isConditionActive).toBe(false);
    expect(results.GAS_LEAKAGE.isConditionActive).toBe(false);
    expect(results.INTRUSION.isConditionActive).toBe(false);
    expect(results.MANUAL_EMERGENCY.isConditionActive).toBe(false);

    const step = stepMonitoringEngine(INITIAL_TELEMETRY, []);
    expect(step.activeIncidents).toHaveLength(0);
  });

  it('high temperature alone (≥ 60°C) without smoke does NOT produce confirmed fire', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 75,
      smokeDetected: false,
    };
    const results = evaluateConditions(telemetry);
    expect(results.FIRE.isConditionActive).toBe(false);
    expect(results.FIRE.warningNote).toBeDefined();

    const step = stepMonitoringEngine(telemetry, []);
    expect(step.activeIncidents.find(i => i.category === 'FIRE')).toBeUndefined();
  });

  it('smoke detection alone with normal temperature does NOT produce confirmed fire', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 25,
      smokeDetected: true,
    };
    const results = evaluateConditions(telemetry);
    expect(results.FIRE.isConditionActive).toBe(false);
    expect(results.FIRE.warningNote).toBeDefined();

    const step = stepMonitoringEngine(telemetry, []);
    expect(step.activeIncidents.find(i => i.category === 'FIRE')).toBeUndefined();
  });

  it('smoke detection AND high temperature (≥ 60°C) together produce a confirmed Fire emergency', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 65,
      smokeDetected: true,
    };
    const results = evaluateConditions(telemetry);
    expect(results.FIRE.isConditionActive).toBe(true);

    const step = stepMonitoringEngine(telemetry, []);
    const fireIncident = step.activeIncidents.find(i => i.category === 'FIRE');
    expect(fireIncident).toBeDefined();
    expect(fireIncident?.priority).toBe(2);
    expect(fireIncident?.zoneId).toBe('RESEARCH_LAB');
    expect(fireIncident?.state).toBe('ACTIVE_UNACKNOWLEDGED');
    expect(step.automaticResponses.fireAlarm).toBe(true);
    expect(step.automaticResponses.evacuationWarning).toBe(true);
  });

  it('gas reading below threshold (< 100) does NOT produce a gas emergency', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      gasConcentration: 99,
    };
    const results = evaluateConditions(telemetry);
    expect(results.GAS_LEAKAGE.isConditionActive).toBe(false);

    const step = stepMonitoringEngine(telemetry, []);
    expect(step.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')).toBeUndefined();
  });

  it('gas reading at or above threshold (≥ 100) produces confirmed Gas Leakage emergency', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      gasConcentration: 100,
    };
    const results = evaluateConditions(telemetry);
    expect(results.GAS_LEAKAGE.isConditionActive).toBe(true);

    const step = stepMonitoringEngine(telemetry, []);
    const gasIncident = step.activeIncidents.find(i => i.category === 'GAS_LEAKAGE');
    expect(gasIncident).toBeDefined();
    expect(gasIncident?.priority).toBe(3);
    expect(gasIncident?.zoneId).toBe('CHEMICAL_LAB');
    expect(step.automaticResponses.gasAlarm).toBe(true);
    expect(step.automaticResponses.emergencyVentilation).toBe(true);
    expect(step.automaticResponses.zoneIsolation).toBe(true);
  });

  it('intrusion activation produces a Security Intrusion incident', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      intrusionDetected: true,
    };
    const results = evaluateConditions(telemetry);
    expect(results.INTRUSION.isConditionActive).toBe(true);

    const step = stepMonitoringEngine(telemetry, []);
    const intrusionIncident = step.activeIncidents.find(i => i.category === 'INTRUSION');
    expect(intrusionIncident).toBeDefined();
    expect(intrusionIncident?.priority).toBe(4);
    expect(intrusionIncident?.zoneId).toBe('RESTRICTED_STORAGE');
    expect(step.automaticResponses.securityAlarm).toBe(true);
    expect(step.automaticResponses.accessControlWarning).toBe(true);
  });

  it('manual emergency activation produces a Manual Emergency incident with Priority 1', () => {
    const telemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      manualEmergencyActive: true,
      manualEmergencyZone: 'CONTROL_ROOM',
    };
    const results = evaluateConditions(telemetry);
    expect(results.MANUAL_EMERGENCY.isConditionActive).toBe(true);

    const step = stepMonitoringEngine(telemetry, []);
    const manualIncident = step.activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
    expect(manualIncident).toBeDefined();
    expect(manualIncident?.priority).toBe(1);
    expect(step.automaticResponses.generalEmergency).toBe(true);
    expect(step.automaticResponses.operatorAssessmentRequested).toBe(true);
  });
});

describe('SENTINEL Monitoring Engine - Boundary Conditions & Clamping', () => {
  it('temperature boundary: exactly 59°C vs 60°C with smoke detected', () => {
    const below: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 59, smokeDetected: true };
    const atThreshold: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 60, smokeDetected: true };

    expect(evaluateConditions(below).FIRE.isConditionActive).toBe(false);
    expect(evaluateConditions(atThreshold).FIRE.isConditionActive).toBe(true);
  });

  it('gas boundary: exactly 99 vs 100', () => {
    const below: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 99 };
    const atThreshold: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 100 };

    expect(evaluateConditions(below).GAS_LEAKAGE.isConditionActive).toBe(false);
    expect(evaluateConditions(atThreshold).GAS_LEAKAGE.isConditionActive).toBe(true);
  });

  it('handles out-of-range sensor values cleanly (clamped to unsigned 8-bit 0-255)', () => {
    const over: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 999, smokeDetected: true };
    const negative: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: -50, smokeDetected: true };

    expect(evaluateConditions(over).FIRE.isConditionActive).toBe(true);
    expect(evaluateConditions(negative).FIRE.isConditionActive).toBe(false);
  });
});

describe('SENTINEL Monitoring Engine - Alarm Lifecycle & Retention', () => {
  it('alarm remains retained in CONDITION_CLEARED state when initiating condition returns to normal', () => {
    // 1. Initial fire trigger
    const triggerTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 75, smokeDetected: true };
    const step1 = stepMonitoringEngine(triggerTelemetry, []);
    expect(step1.activeIncidents).toHaveLength(1);
    expect(step1.activeIncidents[0].state).toBe('ACTIVE_UNACKNOWLEDGED');

    // 2. Initiating condition clears (sensors back to 25°C, smoke clear)
    const clearedTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 25, smokeDetected: false };
    const step2 = stepMonitoringEngine(clearedTelemetry, step1.activeIncidents);

    // Alarm is NOT cleared! It is retained in CONDITION_CLEARED state
    expect(step2.activeIncidents).toHaveLength(1);
    expect(step2.activeIncidents[0].state).toBe('CONDITION_CLEARED');
    expect(step2.activeIncidents[0].conditionActive).toBe(false);
  });

  it('acknowledgement records awareness but does NOT clear alarm or deactivate protective responses', () => {
    const triggerTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, temperature: 75, smokeDetected: true };
    const step1 = stepMonitoringEngine(triggerTelemetry, []);
    const incidentId = step1.activeIncidents[0].id;

    // Acknowledge incident
    const ackResult = acknowledgeIncidentInEngine(incidentId, step1.activeIncidents);
    const ackIncident = ackResult.updatedIncidents.find(i => i.id === incidentId);
    expect(ackIncident?.acknowledgedAt).not.toBeNull();
    expect(ackIncident?.state).toBe('ACTIVE_ACKNOWLEDGED');

    // Responses MUST remain active
    const responses = calculateAutomaticResponses(ackResult.updatedIncidents);
    expect(responses.fireAlarm).toBe(true);
    expect(responses.evacuationWarning).toBe(true);
  });

  it('reset is rejected while the initiating condition remains active', () => {
    const triggerTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 150 };
    const step1 = stepMonitoringEngine(triggerTelemetry, []);
    const incidentId = step1.activeIncidents[0].id;

    // Acknowledge first
    const { updatedIncidents } = acknowledgeIncidentInEngine(incidentId, step1.activeIncidents);

    // Attempt reset while gas is still 150 (conditionActive = true)
    const resetResult = resetIncidentInEngine(incidentId, updatedIncidents);
    expect(resetResult.success).toBe(false);
    expect(resetResult.event.type).toBe('RESET_REJECTED');
    expect(resetResult.updatedIncidents).toHaveLength(1); // Incident is retained
  });

  it('reset is rejected if operator has not acknowledged the alarm, even if condition cleared', () => {
    // 1. Gas incident triggered
    const triggerTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 150 };
    const step1 = stepMonitoringEngine(triggerTelemetry, []);
    const incidentId = step1.activeIncidents[0].id;

    // 2. Gas cleared without acknowledgement
    const clearedTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 20 };
    const step2 = stepMonitoringEngine(clearedTelemetry, step1.activeIncidents);

    // Reset attempt
    const resetResult = resetIncidentInEngine(incidentId, step2.activeIncidents);
    expect(resetResult.success).toBe(false);
    expect(resetResult.event.type).toBe('RESET_REJECTED');
  });

  it('successful reset clears retained alarm and resolves the incident after required criteria are met', () => {
    // 1. Gas incident triggered
    const triggerTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 150 };
    const step1 = stepMonitoringEngine(triggerTelemetry, []);
    const incidentId = step1.activeIncidents[0].id;

    // 2. Acknowledge alarm
    const { updatedIncidents: ackIncidents } = acknowledgeIncidentInEngine(incidentId, step1.activeIncidents);

    // 3. Sensor condition clears
    const clearedTelemetry: SensorTelemetry = { ...INITIAL_TELEMETRY, gasConcentration: 20 };
    const step2 = stepMonitoringEngine(clearedTelemetry, ackIncidents);

    // 4. Verify reset eligibility
    const validation = validateResetEligibility(step2.activeIncidents[0]);
    expect(validation.canReset).toBe(true);

    // 5. Execute reset
    const resetResult = resetIncidentInEngine(incidentId, step2.activeIncidents);
    expect(resetResult.success).toBe(true);
    expect(resetResult.updatedIncidents).toHaveLength(0);
    expect(resetResult.resolvedIncident?.state).toBe('RESOLVED');
    expect(resetResult.event.type).toBe('RESET_COMPLETED');
  });

  it('resetting one incident does NOT clear or affect unrelated incidents', () => {
    // Trigger Fire AND Gas
    const dualTelemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 70,
      smokeDetected: true,
      gasConcentration: 120,
    };
    const step1 = stepMonitoringEngine(dualTelemetry, []);
    expect(step1.activeIncidents).toHaveLength(2);

    const fireInc = step1.activeIncidents.find(i => i.category === 'FIRE')!;
    const gasInc = step1.activeIncidents.find(i => i.category === 'GAS_LEAKAGE')!;

    // Acknowledge Fire
    const { updatedIncidents: step2 } = acknowledgeIncidentInEngine(fireInc.id, step1.activeIncidents);

    // Clear Fire condition while Gas remains active
    const fireClearedTelemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 25,
      smokeDetected: false,
      gasConcentration: 120, // Gas still active!
    };
    const step3 = stepMonitoringEngine(fireClearedTelemetry, step2);

    // Reset Fire
    const resetFire = resetIncidentInEngine(fireInc.id, step3.activeIncidents);
    expect(resetFire.success).toBe(true);

    // Gas incident must remain completely intact!
    expect(resetFire.updatedIncidents).toHaveLength(1);
    expect(resetFire.updatedIncidents[0].id).toBe(gasInc.id);
    expect(resetFire.updatedIncidents[0].conditionActive).toBe(true);
  });
});

describe('SENTINEL Monitoring Engine - Prioritisation & Concurrent Incidents', () => {
  it('correctly prioritises multiple concurrent incidents according to demonstration configuration', () => {
    // Trigger all 4 incident types simultaneously
    const allTelemetry: SensorTelemetry = {
      ...INITIAL_TELEMETRY,
      temperature: 80,
      smokeDetected: true,
      gasConcentration: 140,
      intrusionDetected: true,
      manualEmergencyActive: true,
      manualEmergencyZone: 'CONTROL_ROOM',
    };

    const step = stepMonitoringEngine(allTelemetry, []);
    expect(step.activeIncidents).toHaveLength(4);

    // Must be strictly ordered: Priority 1 (Manual) -> 2 (Fire) -> 3 (Gas) -> 4 (Intrusion)
    expect(step.activeIncidents[0].category).toBe('MANUAL_EMERGENCY');
    expect(step.activeIncidents[0].priority).toBe(1);

    expect(step.activeIncidents[1].category).toBe('FIRE');
    expect(step.activeIncidents[1].priority).toBe(2);

    expect(step.activeIncidents[2].category).toBe('GAS_LEAKAGE');
    expect(step.activeIncidents[2].priority).toBe(3);

    expect(step.activeIncidents[3].category).toBe('INTRUSION');
    expect(step.activeIncidents[3].priority).toBe(4);
  });

  it('new emergencies are detected even during acknowledgement of an existing incident', () => {
    // 1. Intrusion starts
    const step1 = stepMonitoringEngine({ ...INITIAL_TELEMETRY, intrusionDetected: true }, []);
    const intrusionId = step1.activeIncidents[0].id;

    // 2. Operator acknowledges intrusion
    const { updatedIncidents: step2 } = acknowledgeIncidentInEngine(intrusionId, step1.activeIncidents);

    // 3. Fire suddenly breaks out
    const step3 = stepMonitoringEngine({
      ...INITIAL_TELEMETRY,
      intrusionDetected: true,
      temperature: 85,
      smokeDetected: true,
    }, step2);

    expect(step3.activeIncidents).toHaveLength(2);
    // Fire (Priority 2) preempts Intrusion (Priority 4) at top of queue
    expect(step3.activeIncidents[0].category).toBe('FIRE');
    expect(step3.activeIncidents[1].category).toBe('INTRUSION');
    expect(step3.activeIncidents[1].state).toBe('ACTIVE_ACKNOWLEDGED');
  });
});
