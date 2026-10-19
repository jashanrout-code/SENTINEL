import type {
  IncidentRecord,
  HazardEnvironment,
  SensorTelemetry,
  ClosureConditionItem,
  ClosureValidationResult,
  EventLogItem
} from '../types';
import { isIncidentAcknowledged } from '../types';

export function validateIncidentClosure(
  incident: IncidentRecord,
  hazardEnv: HazardEnvironment,
  telemetry: SensorTelemetry
): ClosureValidationResult {
  const conditions: ClosureConditionItem[] = [];
  const unmetReasons: string[] = [];

  // Special workflow: Manual Emergency
  if (incident.category === 'MANUAL_EMERGENCY') {
    const isAck = isIncidentAcknowledged(incident);
    conditions.push({
      id: 'ack',
      label: 'Alarm Acknowledged by Operator',
      status: isAck ? 'SATISFIED' : 'PENDING',
      details: isAck ? 'Operator acknowledged emergency activation.' : 'Awaiting operator alarm acknowledgement.',
    });
    if (!isAck) unmetReasons.push('Alarm acknowledgement required.');

    const tripCleared = !telemetry.manualEmergencyActive && !hazardEnv.manualEmergencyActive;
    conditions.push({
      id: 'trip_cleared',
      label: 'Manual Emergency Trip Cleared',
      status: tripCleared ? 'SATISFIED' : 'PENDING',
      details: tripCleared ? 'Control Room manual trip switch is nominal / reset.' : 'Manual emergency trip switch remains active.',
    });
    if (!tripCleared) unmetReasons.push('Manual emergency trip switch must be cleared.');

    const zoneId = incident.zoneId;
    const inspStatus = hazardEnv.inspectionStatus?.[zoneId] ?? 'NONE';
    const isInspectionPassed = inspStatus === 'PASSED';

    let inspConditionStatus: 'SATISFIED' | 'PENDING' | 'FAILED' = 'PENDING';
    let inspDetails = '';

    if (isInspectionPassed) {
      inspConditionStatus = 'SATISFIED';
      inspDetails = '5-second safety verification inspection completed successfully. Station verified safe.';
    } else if (inspStatus === 'IN_PROGRESS') {
      const cd = hazardEnv.inspectionCountdown?.[zoneId] ?? 0;
      inspConditionStatus = 'PENDING';
      inspDetails = `Safety verification inspection currently in progress (${cd}s remaining)...`;
    } else if (inspStatus === 'FAILED') {
      inspConditionStatus = 'FAILED';
      inspDetails = 'Safety verification inspection FAILED. Manual trip was re-engaged or hazard condition active.';
    } else {
      inspConditionStatus = 'PENDING';
      inspDetails = 'Safety verification inspection has not been initiated. 5s inspection required after trip clearance.';
    }

    conditions.push({
      id: 'inspection_passed',
      label: 'Safety Verification Completed (5s Inspection)',
      status: inspConditionStatus,
      details: inspDetails,
    });
    if (!isInspectionPassed) {
      unmetReasons.push(`Safety verification inspection unmet: ${inspDetails}`);
    }

    const canClose = conditions.every(c => c.status === 'SATISFIED');
    return {
      canClose,
      eligible: canClose,
      conditions,
      unmetReasons,
    };
  }

  // STANDARD CLOSURE PRE-REQUISITES (1 to 4)

  // 1. Hazard Contained
  let isHazardContained = false;
  let hazardDetails = '';

  if (incident.category === 'FIRE') {
    isHazardContained =
      hazardEnv.fireIntensity === 0 &&
      hazardEnv.ambientTemperature < 60 &&
      hazardEnv.smokeConcentration === 0;
    hazardDetails = isHazardContained
      ? `Fire fully extinguished. Temperature at ${telemetry.temperature}°C (< 60°C). Optical smoke cleared.`
      : `Fire containment pending: intensity ${hazardEnv.fireIntensity}%, temp ${telemetry.temperature}°C, smoke ${telemetry.smokeDetected ? 'detected' : 'cleared'}.`;
  } else if (incident.category === 'GAS_LEAKAGE') {
    isHazardContained =
      !hazardEnv.gasSourceActive &&
      hazardEnv.gasConcentration <= 40;
    hazardDetails = isHazardContained
      ? `Gas release isolated. Concentration at ${telemetry.gasConcentration} (<= 40 safe threshold).`
      : `Gas containment pending: concentration ${telemetry.gasConcentration} (safe <= 40), release ${hazardEnv.gasSourceActive ? 'active' : 'stopped'}.`;
  } else if (incident.category === 'INTRUSION') {
    isHazardContained =
      !hazardEnv.intrusionBreachActive &&
      (hazardEnv.containmentStatus?.intrusion === 'CONTAINED' ||
       hazardEnv.securityAreaStatus === 'SECURED_PENDING_VERIFICATION' ||
       hazardEnv.securityAreaStatus === 'SECURED');
    hazardDetails = isHazardContained
      ? 'Intruder contained by Physical Security. Vault perimeter secured.'
      : 'Intrusion containment pending: tactical intervention required.';
  }

  conditions.push({
    id: 'hazard_contained',
    label: 'Hazard Contained',
    status: isHazardContained ? 'SATISFIED' : 'PENDING',
    details: hazardDetails,
  });
  if (!isHazardContained) {
    unmetReasons.push(`Hazard is not contained: ${hazardDetails}`);
  }

  // 2. Sensor Conditions Satisfy Safety Requirements
  let isSensorsSafe = false;
  let sensorDetails = '';

  if (incident.category === 'FIRE') {
    isSensorsSafe = telemetry.temperature < 60 && !telemetry.smokeDetected;
    sensorDetails = isSensorsSafe
      ? `Sensors nominal: ${telemetry.temperature}°C (< 60°C safe limit), no smoke detected.`
      : `Sensor thresholds elevated: ${telemetry.temperature}°C, smoke ${telemetry.smokeDetected ? 'ACTIVE' : 'CLEARED'}.`;
  } else if (incident.category === 'GAS_LEAKAGE') {
    isSensorsSafe = telemetry.gasConcentration <= 40;
    sensorDetails = isSensorsSafe
      ? `Gas sensor at safe baseline: ${telemetry.gasConcentration} (<= 40 safe threshold).`
      : `Gas sensor elevated: ${telemetry.gasConcentration} (must be <= 40 before closure).`;
  } else if (incident.category === 'INTRUSION') {
    isSensorsSafe = !telemetry.intrusionDetected;
    sensorDetails = isSensorsSafe
      ? 'Perimeter optical and motion sensors clear.'
      : 'Perimeter intrusion sensor actively tripped.';
  }

  conditions.push({
    id: 'sensors_safe',
    label: 'Sensors Within Configured Limits',
    status: isSensorsSafe ? 'SATISFIED' : 'PENDING',
    details: sensorDetails,
  });
  if (!isSensorsSafe) {
    unmetReasons.push(`Sensor readings unsafe: ${sensorDetails}`);
  }

  // 3. Safety Verification Completed Successfully
  const zoneId = incident.zoneId;
  const inspStatus = hazardEnv.inspectionStatus?.[zoneId] ?? 'NONE';
  const isInspectionPassed = inspStatus === 'PASSED';

  let inspDetails = '';
  let inspConditionStatus: 'SATISFIED' | 'PENDING' | 'FAILED' = 'PENDING';

  if (isInspectionPassed) {
    inspConditionStatus = 'SATISFIED';
    inspDetails = 'Authorised 5-second safety verification inspection completed successfully. Area confirmed secure.';
  } else if (inspStatus === 'IN_PROGRESS') {
    const cd = hazardEnv.inspectionCountdown?.[zoneId] ?? 0;
    inspConditionStatus = 'PENDING';
    inspDetails = `Safety verification inspection currently in progress (${cd}s remaining)...`;
  } else if (inspStatus === 'FAILED') {
    inspConditionStatus = 'FAILED';
    inspDetails = 'Safety verification inspection FAILED or was INVALIDATED due to recurring hazard condition. Re-inspection required.';
  } else {
    inspConditionStatus = 'PENDING';
    inspDetails = 'Safety verification inspection has not been initiated. Inspection required after containment.';
  }

  conditions.push({
    id: 'inspection_passed',
    label: 'Safety Verification Completed (5s Inspection)',
    status: inspConditionStatus,
    details: inspDetails,
  });
  if (!isInspectionPassed) {
    unmetReasons.push(`Safety verification inspection unmet: ${inspDetails}`);
  }

  // 4. Alarm Acknowledged
  const isAcknowledged = isIncidentAcknowledged(incident);
  conditions.push({
    id: 'acknowledged',
    label: 'Alarm Acknowledged by Operator',
    status: isAcknowledged ? 'SATISFIED' : 'PENDING',
    details: isAcknowledged
      ? 'Operator acknowledged active alarm.'
      : 'Alarm must be acknowledged before closure authorization.',
  });
  if (!isAcknowledged) {
    unmetReasons.push('Operator alarm acknowledgement required.');
  }

  const canClose = conditions.every(c => c.status === 'SATISFIED');

  return {
    canClose,
    eligible: canClose,
    conditions,
    unmetReasons,
  };
}

export function authorizeIncidentClosure(
  incidentId: string,
  incidents: IncidentRecord[],
  hazardEnv: HazardEnvironment,
  telemetry: SensorTelemetry,
  timestamp: number = Date.now()
): {
  success: boolean;
  message: string;
  activeIncidents: IncidentRecord[];
  resolvedIncidents: IncidentRecord[];
  newEvents: EventLogItem[];
} {
  const incident = incidents.find(inc => inc.id === incidentId);
  if (!incident) {
    return {
      success: false,
      message: `Incident ${incidentId} not found.`,
      activeIncidents: incidents,
      resolvedIncidents: [],
      newEvents: [],
    };
  }

  const validation = validateIncidentClosure(incident, hazardEnv, telemetry);
  if (!validation.canClose) {
    return {
      success: false,
      message: `Closure Interlock: Cannot authorise closure. Unmet conditions: ${validation.unmetReasons.join('; ')}`,
      activeIncidents: incidents,
      resolvedIncidents: [],
      newEvents: [],
    };
  }

  const isManual = incident.category === 'MANUAL_EMERGENCY';

  const updatedIncident: IncidentRecord = {
    ...incident,
    state: isManual ? 'CONDITION_CLEARED' : 'RESOLVED',
    resolvedAt: isManual ? null : timestamp,
    closureAuthorizedBy: 'Control Room Senior Operator (Authorised)',
    closureAuthorizedAt: timestamp,
    closureValidationSnapshot: validation,
  };

  const nextActive = isManual
    ? incidents.map(inc => inc.id === incidentId ? updatedIncident : inc)
    : incidents.filter(inc => inc.id !== incidentId);

  const newEvents: EventLogItem[] = [
    {
      id: `EVT-CLOSURE-${incident.id}-${timestamp}`,
      timestamp,
      type: isManual ? 'MANUAL_OVERRIDE' : 'INCIDENT_RESOLVED',
      category: incident.category,
      zoneId: incident.zoneId,
      message: isManual
        ? `EMERGENCY CLOSURE FORMALLY AUTHORISED for ${incident.title}. Safety verification confirmed. Alarm reset now eligible.`
        : `EMERGENCY CLOSURE FORMALLY AUTHORISED for ${incident.title}. Alarm cleared. Incident archived in permanent safety log. Equipment restoration pending.`,
      severity: 'success',
    },
  ];

  return {
    success: true,
    message: isManual
      ? `Emergency closure formally authorised for ${incident.title}. Proceed to alarm reset.`
      : `Emergency closure formally authorised for ${incident.title}. Incident archived.`,
    activeIncidents: nextActive,
    resolvedIncidents: isManual ? [] : [updatedIncident],
    newEvents,
  };
}
