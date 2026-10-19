import type {
  ProtectionEquipmentState,
  EquipmentFailureConfig,
  EventLogItem,
  HazardEnvironment,
  SensorTelemetry,
} from '../types';

export interface ProtectionStepResult {
  nextEquipment: ProtectionEquipmentState;
  newEvents: EventLogItem[];
  effectiveSuppression: boolean;
  effectiveIsolation: boolean;
  effectiveExtraction: boolean;
}

export function stepProtectionController(
  currentEquipment: ProtectionEquipmentState,
  hazardEnv: HazardEnvironment,
  telemetry: SensorTelemetry,
  failureConfig: EquipmentFailureConfig,
  timestamp: number = Date.now()
): ProtectionStepResult {
  const nextEquipment: ProtectionEquipmentState = {
    fireSuppression: { ...currentEquipment.fireSuppression },
    labEquipmentShutdown: { ...currentEquipment.labEquipmentShutdown },
    fireVentIsolation: { ...currentEquipment.fireVentIsolation },
    gasIsolationValve: { ...currentEquipment.gasIsolationValve },
    emergencyVentilation: { ...currentEquipment.emergencyVentilation },
    chemicalEquipmentShutdown: { ...currentEquipment.chemicalEquipmentShutdown },
    accessPointLockdown: { ...currentEquipment.accessPointLockdown },
    evacuationAlarm: { ...currentEquipment.evacuationAlarm },
  };

  const newEvents: EventLogItem[] = [];

  // 1. FIRE PROTECTION LOGIC
  const fireActive = hazardEnv.fireIgnited || hazardEnv.fireIntensity > 0 || (telemetry.smokeDetected && telemetry.temperature >= 60);

  if (fireActive) {
    if (nextEquipment.evacuationAlarm.state !== 'OPERATING') {
      nextEquipment.evacuationAlarm.state = 'OPERATING';
      nextEquipment.evacuationAlarm.details = 'Evacuation strobe and multi-tone acoustic alarm operating in thermal zones.';
    }

    if (nextEquipment.labEquipmentShutdown.state !== 'OPERATING') {
      nextEquipment.labEquipmentShutdown.state = 'OPERATING';
      nextEquipment.labEquipmentShutdown.details = 'High-voltage experimental power bus interlock opened.';
      newEvents.push({
        id: `EVT-PROT-PWR-${timestamp}`,
        timestamp,
        type: 'COUNTERMEASURE_ACTIVATED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Protective Countermeasure: Research rig electrical isolation breaker tripped.',
        severity: 'info',
      });
    }

    if (nextEquipment.fireVentIsolation.state !== 'ISOLATED') {
      nextEquipment.fireVentIsolation.state = 'ISOLATED';
      nextEquipment.fireVentIsolation.details = 'HVAC supply and return dampers pneumatically sealed.';
      newEvents.push({
        id: `EVT-PROT-DAMP-${timestamp}`,
        timestamp,
        type: 'COUNTERMEASURE_ACTIVATED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Protective Countermeasure: Research Lab HVAC fire and smoke dampers sealed.',
        severity: 'info',
      });
    }

    if (failureConfig.fireSuppressionFailed) {
      if (nextEquipment.fireSuppression.state !== 'FAULT') {
        nextEquipment.fireSuppression.state = 'FAULT';
        nextEquipment.fireSuppression.details = 'Suppression pump pressure failure. Deluge header dry.';
        newEvents.push({
          id: `EVT-PROT-SUPP-FAIL-${timestamp}`,
          timestamp,
          type: 'SUPPRESSION_FAILED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'CRITICAL EQUIPMENT FAULT: Automated fire suppression system pressure failed to build. Manual intervention required.',
          severity: 'critical',
        });
      }
    } else {
      if (nextEquipment.fireSuppression.state !== 'OPERATING') {
        nextEquipment.fireSuppression.state = 'OPERATING';
        nextEquipment.fireSuppression.details = 'Deluge foam-mist discharge nozzles active across ceiling grid.';
        newEvents.push({
          id: `EVT-PROT-SUPP-ACT-${timestamp}`,
          timestamp,
          type: 'COUNTERMEASURE_ACTIVATED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'Automated Fire Suppression Discharged: Foam-mist deluge operating in Research Laboratory.',
          severity: 'warning',
        });
      }
    }
  }

  // 2. GAS PROTECTION LOGIC
  const gasActive = hazardEnv.gasSourceActive || hazardEnv.gasConcentration >= 100;

  if (gasActive) {
    if (nextEquipment.evacuationAlarm.state !== 'OPERATING') {
      nextEquipment.evacuationAlarm.state = 'OPERATING';
      nextEquipment.evacuationAlarm.details = 'Gas hazard strobe and audible alert broadcasting in Chemical Lab.';
    }

    if (nextEquipment.chemicalEquipmentShutdown.state !== 'OPERATING') {
      nextEquipment.chemicalEquipmentShutdown.state = 'OPERATING';
      nextEquipment.chemicalEquipmentShutdown.details = 'Synthesis reactor primary power contactors tripped.';
      newEvents.push({
        id: `EVT-PROT-CHEM-PWR-${timestamp}`,
        timestamp,
        type: 'COUNTERMEASURE_ACTIVATED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Protective Countermeasure: Chemical synthesis reactor emergency shutdown initiated.',
        severity: 'info',
      });
    }

    // Gas isolation valve logic (3s deterministic closure countdown)
    if (failureConfig.gasIsolationFailed) {
      if (nextEquipment.gasIsolationValve.state !== 'FAULT') {
        nextEquipment.gasIsolationValve.state = 'FAULT';
        nextEquipment.gasIsolationValve.details = 'Valve stem actuator jammed open. Gas source remains unisolated.';
        newEvents.push({
          id: `EVT-PROT-VALVE-FAIL-${timestamp}`,
          timestamp,
          type: 'ISOLATION_FAILED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'CRITICAL EQUIPMENT FAULT: Gas supply isolation valve failed to seat. Toxic release continues unabated.',
          severity: 'critical',
        });
      }
    } else {
      if (nextEquipment.gasIsolationValve.state === 'STANDBY') {
        nextEquipment.gasIsolationValve.state = 'ACTIVATION_REQUESTED';
        nextEquipment.gasIsolationValve.details = 'Quarter-turn pneumatic actuator energized. Valve closing (3s)...';
      }
    }

    // Emergency ventilation
    if (failureConfig.ventilationFailed) {
      if (nextEquipment.emergencyVentilation.state !== 'FAULT') {
        nextEquipment.emergencyVentilation.state = 'FAULT';
        nextEquipment.emergencyVentilation.details = 'Extraction blower motor overload tripped.';
        newEvents.push({
          id: `EVT-PROT-VENT-FAIL-${timestamp}`,
          timestamp,
          type: 'VENTILATION_FAILED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'EQUIPMENT FAULT: Emergency extraction scrubber exhaust blower failure.',
          severity: 'critical',
        });
      }
    } else {
      if (nextEquipment.emergencyVentilation.state !== 'OPERATING') {
        nextEquipment.emergencyVentilation.state = 'OPERATING';
        nextEquipment.emergencyVentilation.details = 'Scrubber fan running at high extraction velocity.';
        newEvents.push({
          id: `EVT-PROT-VENT-ACT-${timestamp}`,
          timestamp,
          type: 'COUNTERMEASURE_ACTIVATED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'Protective Countermeasure: High-capacity emergency toxic gas extraction activated.',
          severity: 'info',
        });
      }
    }
  }

  // 3. SECURITY ACCESS PROTECTION LOGIC
  const intrusionActive = hazardEnv.intrusionBreachActive || telemetry.intrusionDetected;

  if (intrusionActive) {
    if (nextEquipment.accessPointLockdown.state !== 'OPERATING') {
      nextEquipment.accessPointLockdown.state = 'OPERATING';
      nextEquipment.accessPointLockdown.details = 'High-security magnetic interlocks energized. Emergency egress hardware verified free.';
      newEvents.push({
        id: `EVT-PROT-LOCK-${timestamp}`,
        timestamp,
        type: 'COUNTERMEASURE_ACTIVATED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Protective Countermeasure: Vault access magnetic lockdown engaged without obstructing egress.',
        severity: 'info',
      });
    }
  }

  const effectiveSuppression = nextEquipment.fireSuppression.state === 'OPERATING';
  const effectiveIsolation = nextEquipment.gasIsolationValve.state === 'ISOLATED';
  const effectiveExtraction = nextEquipment.emergencyVentilation.state === 'OPERATING';

  return {
    nextEquipment,
    newEvents,
    effectiveSuppression,
    effectiveIsolation,
    effectiveExtraction,
  };
}
