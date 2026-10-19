import type {
  SensorTelemetry,
  IncidentRecord,
  EventLogItem,
  ZoneId,
  EmergencyCategory,
} from '../types';
import { CATEGORY_PRIORITY } from '../types';

export interface DetectionResult {
  detectedIncidents: IncidentRecord[];
  newEvents: EventLogItem[];
  highTemperatureWarning: boolean;
  smokeWarning: boolean;
}

/**
 * Pure deterministic Detection Engine that evaluates sensor telemetry against
 * industrial threshold models to identify emergencies, warnings, and faults.
 */
export function evaluateDetection(
  telemetry: SensorTelemetry,
  existingIncidents: IncidentRecord[],
  timestamp: number = Date.now()
): DetectionResult {
  const newEvents: EventLogItem[] = [];
  const detectedIncidents: IncidentRecord[] = [...existingIncidents];

  const hasActiveCategory = (category: EmergencyCategory, zoneId?: ZoneId) =>
    detectedIncidents.some(
      inc => inc.category === category && (!zoneId || inc.zoneId === zoneId)
    );

  // 1. FIRE EVALUATION (RESEARCH LABORATORY)
  // Specification: Confirmed simulated fire requires: Smoke detected AND Temperature >= 60°C.
  // Temperature alone produces high-temperature warning, not a confirmed fire.
  // Smoke alone produces smoke warning, not a confirmed fire.
  const isConfirmedFire = telemetry.smokeDetected && telemetry.temperature >= 60;
  const isHighTempWarning = !isConfirmedFire && telemetry.temperature >= 60;
  const isSmokeWarning = !isConfirmedFire && telemetry.smokeDetected;

  if (isConfirmedFire && !hasActiveCategory('FIRE', 'RESEARCH_LAB')) {
    const fireIncident: IncidentRecord = {
      id: `INC-FIRE-${timestamp}`,
      category: 'FIRE',
      zoneId: 'RESEARCH_LAB',
      zoneCode: 'ZN-01',
      zoneName: 'Research Laboratory',
      severity: 'CRITICAL',
      priority: CATEGORY_PRIORITY.FIRE.priority,
      state: 'ACTIVE_UNACKNOWLEDGED',
      conditionActive: true,
      detectedAt: timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
      title: 'Confirmed Fire Emergency — Research Laboratory',
      description: `Active thermal runaway confirmed: Optical smoke detected simultaneously with temperature at ${telemetry.temperature}°C (>= 60°C threshold). Automatic suppression interlocks activated.`,
      details: `Active thermal runaway confirmed: Optical smoke detected simultaneously with temperature at ${telemetry.temperature}°C.`,
      operatorAcknowledged: false,
      inspectionState: 'NONE',
      responses: {
        fireAlarm: true,
        evacuationWarning: true,
        zoneIsolation: true,
      },
    };
    detectedIncidents.push(fireIncident);
    newEvents.push({
      id: `EVT-DET-FIRE-${timestamp}`,
      timestamp,
      type: 'EMERGENCY_DETECTED',
      category: 'FIRE',
      zoneId: 'RESEARCH_LAB',
      message: `CONFIRMED FIRE EMERGENCY in Research Laboratory. Temperature ${telemetry.temperature}°C >= 60°C with dense smoke obscuration. Suppression commanded.`,
      severity: 'critical',
    });
  }

  // 2. GAS EVALUATION (CHEMICAL LABORATORY)
  // Specification: Gas emergency threshold: 100 or above on the fictional 0–255 sensor scale.
  const isGasEmergency = telemetry.gasConcentration >= 100;

  if (isGasEmergency && !hasActiveCategory('GAS_LEAKAGE', 'CHEMICAL_LAB')) {
    const gasIncident: IncidentRecord = {
      id: `INC-GAS-${timestamp}`,
      category: 'GAS_LEAKAGE',
      zoneId: 'CHEMICAL_LAB',
      zoneCode: 'ZN-02',
      zoneName: 'Chemical Laboratory',
      severity: 'HIGH',
      priority: CATEGORY_PRIORITY.GAS_LEAKAGE.priority,
      state: 'ACTIVE_UNACKNOWLEDGED',
      conditionActive: true,
      detectedAt: timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
      title: 'Toxic Gas Leakage Emergency — Chemical Laboratory',
      description: `Atmospheric concentration reached ${telemetry.gasConcentration} (>= 100 threshold on 0-255 scale). Gas supply isolation and emergency extraction commanded.`,
      details: `Atmospheric concentration reached ${telemetry.gasConcentration} on 0-255 scale.`,
      operatorAcknowledged: false,
      inspectionState: 'NONE',
      responses: {
        gasAlarm: true,
        zoneIsolation: true,
        emergencyVentilation: true,
      },
    };
    detectedIncidents.push(gasIncident);
    newEvents.push({
      id: `EVT-DET-GAS-${timestamp}`,
      timestamp,
      type: 'EMERGENCY_DETECTED',
      category: 'GAS_LEAKAGE',
      zoneId: 'CHEMICAL_LAB',
      message: `TOXIC GAS LEAKAGE DETECTED in Chemical Laboratory. Concentration ${telemetry.gasConcentration} >= 100 threshold. Isolation and extraction active.`,
      severity: 'critical',
    });
  }

  // 3. SECURITY BREACH EVALUATION (RESTRICTED STORAGE)
  // Specification: Begins when restricted-area intrusion condition becomes active.
  const isSecurityBreach = telemetry.intrusionDetected;

  if (isSecurityBreach && !hasActiveCategory('INTRUSION', 'RESTRICTED_STORAGE')) {
    const secIncident: IncidentRecord = {
      id: `INC-SEC-${timestamp}`,
      category: 'INTRUSION',
      zoneId: 'RESTRICTED_STORAGE',
      zoneCode: 'ZN-03',
      zoneName: 'Restricted Storage',
      severity: 'HIGH',
      priority: CATEGORY_PRIORITY.INTRUSION.priority,
      state: 'ACTIVE_UNACKNOWLEDGED',
      conditionActive: true,
      detectedAt: timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
      title: 'Restricted Perimeter Breach — Restricted Storage',
      description: 'Volumetric and optical perimeter sensor tripped in high-security vault. Magnetic lock secured without obstructing egress. Physical security dispatched.',
      details: 'Volumetric and optical perimeter sensor tripped in high-security vault.',
      operatorAcknowledged: false,
      inspectionState: 'NONE',
      responses: {
        securityAlarm: true,
        areaCompromised: true,
      },
    };
    detectedIncidents.push(secIncident);
    newEvents.push({
      id: `EVT-DET-SEC-${timestamp}`,
      timestamp,
      type: 'EMERGENCY_DETECTED',
      category: 'INTRUSION',
      zoneId: 'RESTRICTED_STORAGE',
      message: 'PERIMETER INTRUSION BREACH DETECTED in Restricted Storage. Magnetic lockdown engaged; tactical security unit notified.',
      severity: 'critical',
    });
  }

  // 4. MANUAL EMERGENCY EVALUATION (CONTROL ROOM / ZONE)
  if (telemetry.manualEmergencyActive && !hasActiveCategory('MANUAL_EMERGENCY')) {
    const targetZone: ZoneId = telemetry.manualEmergencyZone || 'CONTROL_ROOM';
    const zoneCode = targetZone === 'RESEARCH_LAB' ? 'ZN-01' : targetZone === 'CHEMICAL_LAB' ? 'ZN-02' : targetZone === 'RESTRICTED_STORAGE' ? 'ZN-03' : 'ZN-04';
    const zoneName = targetZone === 'RESEARCH_LAB' ? 'Research Laboratory' : targetZone === 'CHEMICAL_LAB' ? 'Chemical Laboratory' : targetZone === 'RESTRICTED_STORAGE' ? 'Restricted Storage' : 'Control Room';

    const manualIncident: IncidentRecord = {
      id: `INC-MAN-${timestamp}`,
      category: 'MANUAL_EMERGENCY',
      zoneId: targetZone,
      zoneCode,
      zoneName,
      severity: 'HIGH',
      priority: CATEGORY_PRIORITY.MANUAL_EMERGENCY.priority,
      state: 'ACTIVE_UNACKNOWLEDGED',
      conditionActive: true,
      detectedAt: timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
      title: `Manual Emergency Alarm — ${zoneName}`,
      description: `Manual emergency pull station activated at ${zoneName}. General emergency alarm active. Operator assessment required.`,
      details: `Manual emergency pull station activated at ${zoneName}.`,
      operatorAcknowledged: false,
      manualAssessmentState: 'PENDING',
      inspectionState: 'NONE',
      responses: {
        generalEmergency: true,
        operatorAssessmentRequested: true,
      },
    };
    detectedIncidents.push(manualIncident);
    newEvents.push({
      id: `EVT-DET-MAN-${timestamp}`,
      timestamp,
      type: 'MANUAL_EMERGENCY_INITIATED',
      category: 'MANUAL_EMERGENCY',
      zoneId: targetZone,
      message: `MANUAL EMERGENCY ALARM ACTIVATED at ${zoneName}. Operator assessment required to determine hazard classification.`,
      severity: 'critical',
    });
  }

  return {
    detectedIncidents,
    newEvents,
    highTemperatureWarning: isHighTempWarning,
    smokeWarning: isSmokeWarning,
  };
}
