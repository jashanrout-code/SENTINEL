import type {
  SensorTelemetry,
  EmergencyCategory,
  IncidentRecord,
  AlarmLifecycleState,
  EventLogItem,
  ZoneId,
  AutomaticResponses,
  HazardEnvironment
} from '../types';
import { CATEGORY_PRIORITY, isIncidentAcknowledged } from '../types';


export interface DetectionResult {
  isConditionActive: boolean;
  warningNote?: string;
  details: string;
  zoneId: ZoneId;
}

export const TEMPERATURE_THRESHOLD = 60;
export const GAS_THRESHOLD = 100;

/**
 * Pure evaluation function for individual emergency condition detection.
 */
export function evaluateConditions(telemetry: SensorTelemetry): Record<EmergencyCategory, DetectionResult> {
  // Clamped sensor reading semantics (8-bit unsigned representation 0-255)
  const validTemp = Math.min(255, Math.max(0, Math.round(telemetry.temperature)));
  const validGas = Math.min(255, Math.max(0, Math.round(telemetry.gasConcentration)));
  const smoke = Boolean(telemetry.smokeDetected);
  const intrusion = Boolean(telemetry.intrusionDetected);
  const manual = Boolean(telemetry.manualEmergencyActive);

  // 1. Fire: Smoke AND Temperature >= 60
  const isFire = smoke && validTemp >= TEMPERATURE_THRESHOLD;
  let fireWarning: string | undefined;
  if (!isFire) {
    if (validTemp >= TEMPERATURE_THRESHOLD && !smoke) {
      fireWarning = `Thermal threshold exceeded (${validTemp}°C >= ${TEMPERATURE_THRESHOLD}°C). Ionization smoke clear; awaiting confirmation.`;
    } else if (smoke && validTemp < TEMPERATURE_THRESHOLD) {
      fireWarning = `Smoke detected in Research Laboratory. Thermal threshold not reached (${validTemp}°C < ${TEMPERATURE_THRESHOLD}°C); awaiting thermal confirmation.`;
    }
  }

  // 2. Gas: Gas reading >= 100
  const isGas = validGas >= GAS_THRESHOLD;
  let gasWarning: string | undefined;
  if (!isGas && validGas >= 75) {
    gasWarning = `Elevated gas concentration detected (${validGas}/255). Below alarm threshold (${GAS_THRESHOLD}/255).`;
  }

  // 3. Intrusion: Intrusion detected in Restricted Storage
  const isIntrusion = intrusion;

  // 4. Manual: Manual emergency active
  const isManual = manual;

  return {
    MANUAL_EMERGENCY: {
      isConditionActive: isManual,
      zoneId: telemetry.manualEmergencyZone || 'CONTROL_ROOM',
      details: isManual
        ? `Manual emergency switch tripped at ${telemetry.manualEmergencyZone || 'Control Room'}. Central safety protocol activated.`
        : 'Manual emergency stations nominal.',
    },
    FIRE: {
      isConditionActive: isFire,
      warningNote: fireWarning,
      zoneId: 'RESEARCH_LAB',
      details: isFire
        ? `Confirmed fire condition: Thermal reading ${validTemp}°C (threshold ≥ ${TEMPERATURE_THRESHOLD}°C) with positive smoke detection.`
        : fireWarning || 'Thermal and optical smoke sensors nominal in Research Laboratory.',
    },
    GAS_LEAKAGE: {
      isConditionActive: isGas,
      warningNote: gasWarning,
      zoneId: 'CHEMICAL_LAB',
      details: isGas
        ? `Critical gas concentration: Reading ${validGas} on 0–255 scale (threshold ≥ ${GAS_THRESHOLD}). Emergency ventilation initiated.`
        : gasWarning || 'Catalytic gas sensor nominal in Chemical Laboratory.',
    },
    INTRUSION: {
      isConditionActive: isIntrusion,
      zoneId: 'RESTRICTED_STORAGE',
      details: isIntrusion
        ? 'Perimeter optical security breach detected in Restricted Storage vault.'
        : 'Perimeter optical sensors nominal in Restricted Storage.',
    },
  };
}

/**
 * Calculates current active automatic protective responses based on retained active incidents.
 */
export function calculateAutomaticResponses(activeIncidents: IncidentRecord[]): AutomaticResponses {
  const responses: AutomaticResponses = {
    fireAlarm: false,
    evacuationWarning: false,
    gasAlarm: false,
    emergencyVentilation: false,
    zoneIsolation: false,
    securityAlarm: false,
    areaCompromised: false,
    accessControlWarning: false,
    generalEmergency: false,
    operatorAssessmentRequested: false,
  };

  // Protective responses remain active as long as the incident is retained (unacknowledged, acknowledged, or condition cleared awaiting reset)
  for (const inc of activeIncidents) {
    if (inc.state === 'RESOLVED') continue;

    switch (inc.category) {
      case 'FIRE':
        responses.fireAlarm = true;
        responses.evacuationWarning = true;
        responses.zoneIsolation = true;
        break;
      case 'GAS_LEAKAGE':
        responses.gasAlarm = true;
        responses.emergencyVentilation = true;
        responses.zoneIsolation = true;
        break;
      case 'INTRUSION':
        responses.securityAlarm = true;
        responses.areaCompromised = true;
        responses.accessControlWarning = true;
        break;
      case 'MANUAL_EMERGENCY':
        responses.generalEmergency = true;
        responses.operatorAssessmentRequested = true;
        break;
    }
  }

  return responses;
}

export interface EngineStepOutput {
  activeIncidents: IncidentRecord[];
  newEvents: EventLogItem[];
  automaticResponses: AutomaticResponses;
}

/**
 * Generates an incident ID
 */
function createIncidentId(category: EmergencyCategory, timestamp: number): string {
  const prefix = {
    MANUAL_EMERGENCY: 'INC-MAN',
    FIRE: 'INC-FIRE',
    GAS_LEAKAGE: 'INC-GAS',
    INTRUSION: 'INC-SEC',
  }[category];
  const shortTime = timestamp.toString().slice(-4);
  return `${prefix}-${shortTime}`;
}

/**
 * Step monitoring engine state with updated telemetry.
 * Retains alarms, manages lifecycle transitions, and emits event logs deterministically.
 */
export function stepMonitoringEngine(
  telemetry: SensorTelemetry,
  currentIncidents: IncidentRecord[],
  now: number = Date.now()
): EngineStepOutput {
  const conditionEvals = evaluateConditions(telemetry);
  const updatedIncidents: IncidentRecord[] = [...currentIncidents];
  const newEvents: EventLogItem[] = [];

  const categories: EmergencyCategory[] = ['MANUAL_EMERGENCY', 'FIRE', 'GAS_LEAKAGE', 'INTRUSION'];

  for (const cat of categories) {
    const evalResult = conditionEvals[cat];
    const existingIndex = updatedIncidents.findIndex(inc => inc.category === cat && inc.state !== 'RESOLVED');

    if (evalResult.isConditionActive) {
      if (existingIndex === -1) {
        // New incident detection
        const newIncidentId = createIncidentId(cat, now);
        const newIncident: IncidentRecord = {
          id: newIncidentId,
          category: cat,
          zoneId: evalResult.zoneId,
          priority: CATEGORY_PRIORITY[cat].priority,
          detectedAt: now,
          acknowledgedAt: null,
          acknowledgedBy: null,
          resolvedAt: null,
          state: 'ACTIVE_UNACKNOWLEDGED',
          conditionActive: true,
          details: evalResult.details,
          responses: {},
          operatorAcknowledged: false,
        };

        updatedIncidents.push(newIncident);

        newEvents.push({
          id: `EVT-${now}-${cat}-DET`,
          timestamp: now,
          type: 'EMERGENCY_DETECTED',
          category: cat,
          zoneId: evalResult.zoneId,
          message: `${CATEGORY_PRIORITY[cat].title} detected in ${evalResult.zoneId.replace('_', ' ')}. ${evalResult.details}`,
          severity: 'critical',
        });

        newEvents.push({
          id: `EVT-${now}-${cat}-ALM`,
          timestamp: now,
          type: 'ALARM_ACTIVATED',
          category: cat,
          zoneId: evalResult.zoneId,
          message: `Alarm activated for ${CATEGORY_PRIORITY[cat].title}. Priority ${CATEGORY_PRIORITY[cat].priority}. Safety interlocks engaged.`,
          severity: 'critical',
        });
      } else {
        // Incident already exists - update conditionActive flag
        const existing = updatedIncidents[existingIndex];
        const isAck = isIncidentAcknowledged(existing);
        const wasCleared = existing.state === 'CONDITION_CLEARED';
        const updatedState: AlarmLifecycleState = wasCleared
          ? (isAck ? 'ACTIVE_ACKNOWLEDGED' : 'ACTIVE_UNACKNOWLEDGED')
          : existing.state;

        updatedIncidents[existingIndex] = {
          ...existing,
          conditionActive: true,
          state: updatedState,
          details: evalResult.details,
        };

        if (wasCleared) {
          newEvents.push({
            id: `EVT-${now}-${cat}-RECUR`,
            timestamp: now,
            type: 'EMERGENCY_DETECTED',
            category: cat,
            zoneId: evalResult.zoneId,
            message: `Emergency condition re-emerged for retained incident ${existing.id}.`,
            severity: 'critical',
          });
        }
      }
    } else {
      // Condition is currently NOT active
      if (existingIndex !== -1) {
        const existing = updatedIncidents[existingIndex];
        // If condition was active before, record clearance
        if (existing.conditionActive) {
          updatedIncidents[existingIndex] = {
            ...existing,
            conditionActive: false,
            state: 'CONDITION_CLEARED',
          };

          newEvents.push({
            id: `EVT-${now}-${cat}-CLR`,
            timestamp: now,
            type: 'CONDITION_CLEARED',
            category: cat,
            zoneId: existing.zoneId,
            message: `Initiating sensor condition cleared for incident ${existing.id}. Alarm remains retained until operator reset.`,
            severity: 'info',
          });
        }
      }
    }
  }

  // Sort active incidents by priority ascending (1 = Highest)
  const sortedIncidents = updatedIncidents
    .filter(inc => inc.state !== 'RESOLVED')
    .sort((a, b) => a.priority - b.priority);

  const responses = calculateAutomaticResponses(sortedIncidents);

  return {
    activeIncidents: sortedIncidents,
    newEvents,
    automaticResponses: responses,
  };
}

/**
 * Acknowledge an active incident.
 */
export function acknowledgeIncidentInEngine(
  incidentId: string,
  currentIncidents: IncidentRecord[],
  now: number = Date.now(),
  operator: string = 'Control Room Operator'
): { updatedIncidents: IncidentRecord[]; event?: EventLogItem } {
  const index = currentIncidents.findIndex(inc => inc.id === incidentId);
  if (index === -1) return { updatedIncidents: currentIncidents };

  const target = currentIncidents[index];
  if (isIncidentAcknowledged(target)) {
    // Already acknowledged
    return { updatedIncidents: currentIncidents };
  }

  const updated: IncidentRecord = {
    ...target,
    acknowledgedAt: now,
    acknowledgedBy: operator,
    operatorAcknowledged: true,
    state: target.conditionActive ? 'ACTIVE_ACKNOWLEDGED' : 'CONDITION_CLEARED',
  };

  const newIncidents = [...currentIncidents];
  newIncidents[index] = updated;

  const event: EventLogItem = {
    id: `EVT-${now}-${incidentId}-ACK`,
    timestamp: now,
    type: 'ALARM_ACKNOWLEDGED',
    category: target.category,
    zoneId: target.zoneId,
    message: `Operator (${operator}) acknowledged incident ${target.id} (${CATEGORY_PRIORITY[target.category].title}). Alarm and protective responses remain active.`,
    severity: 'info',
  };

  return { updatedIncidents: newIncidents, event };
}

export interface ResetValidationResult {
  canReset: boolean;
  reasons: string[];
}

/**
 * Validates reset eligibility based on strict industrial safety requirements:
 * 1. Initiating condition must NOT be active.
 * 2. Alarm MUST have been acknowledged by operator prior to routine reset.
 */
export function validateResetEligibility(
  incident: IncidentRecord,
  hazardEnv?: HazardEnvironment
): ResetValidationResult {
  const reasons: string[] = [];

  if (incident.conditionActive) {
    reasons.push('Triggering sensor threshold condition is still active.');
  }

  if (incident.category === 'MANUAL_EMERGENCY' && hazardEnv?.manualEmergencyActive) {
    reasons.push('Manual emergency trip switch remains active in Control Room.');
  }

  if (!isIncidentAcknowledged(incident)) {
    reasons.push('Incident must be acknowledged by operator prior to system reset.');
  }

  if (incident.category === 'MANUAL_EMERGENCY') {
    const isVerified = hazardEnv ? hazardEnv.inspectionStatus?.CONTROL_ROOM === 'PASSED' : true;
    if (!isVerified) {
      reasons.push('Safety verification inspection must be completed and passed prior to alarm reset.');
    }
    if (!incident.closureAuthorizedAt) {
      reasons.push('Emergency closure must be formally authorised before alarm reset is permitted.');
    }
  }

  return {
    canReset: reasons.length === 0,
    reasons,
  };
}

/**
 * Attempt to reset an incident.
 */
export function resetIncidentInEngine(
  incidentId: string,
  currentIncidents: IncidentRecord[],
  now: number = Date.now(),
  hazardEnv?: HazardEnvironment
): {
  success: boolean;
  updatedIncidents: IncidentRecord[];
  resolvedIncident?: IncidentRecord;
  event: EventLogItem;
} {
  const index = currentIncidents.findIndex(inc => inc.id === incidentId);
  if (index === -1) {
    return {
      success: false,
      updatedIncidents: currentIncidents,
      event: {
        id: `EVT-${now}-RST-ERR`,
        timestamp: now,
        type: 'RESET_REJECTED',
        message: `Reset attempt failed: Incident ${incidentId} not found.`,
        severity: 'warning',
      },
    };
  }

  const target = currentIncidents[index];
  const validation = validateResetEligibility(target, hazardEnv);

  if (!validation.canReset) {
    return {
      success: false,
      updatedIncidents: currentIncidents,
      event: {
        id: `EVT-${now}-${incidentId}-RST-REJ`,
        timestamp: now,
        type: 'RESET_REJECTED',
        category: target.category,
        zoneId: target.zoneId,
        message: `Alarm reset rejected for ${target.id}: ${validation.reasons.join(' ')}`,
        severity: 'warning',
      },
    };
  }

  // Permitted reset!
  const resolved: IncidentRecord = {
    ...target,
    state: 'RESOLVED',
    resolvedAt: now,
  };

  const remainingIncidents = currentIncidents.filter(inc => inc.id !== incidentId);

  return {
    success: true,
    updatedIncidents: remainingIncidents,
    resolvedIncident: resolved,
    event: {
      id: `EVT-${now}-${incidentId}-RST-OK`,
      timestamp: now,
      type: 'RESET_COMPLETED',
      category: target.category,
      zoneId: target.zoneId,
      message: `Alarm reset confirmed for ${target.id}. Protective responses deactivated and incident moved to history.`,
      severity: 'success',
    },
  };
}

export {
  validateIncidentClosure as validateClosureEligibility,
  authorizeIncidentClosure as authorizeIncidentClosureInEngine
} from './incidentManagementEngine';

export { isIncidentAcknowledged } from '../types';
export { normalizeIncidentRecord, normalizeIncidentList } from './incidentNormalizer';
