import type {
  SensorTelemetry,
  ZoneId,
  HazardEnvironment,
  EquipmentFailureConfig
} from '../types';

export interface PredefinedScenario {
  id: string;
  name: string;
  description: string;
  targetZone: ZoneId;
  telemetryUpdates: Partial<SensorTelemetry>;
  // Closed-loop parameters
  isAutomated?: boolean;
  initialHazard?: Partial<HazardEnvironment>;
  failureConfig?: Partial<EquipmentFailureConfig>;
}

export const INITIAL_TELEMETRY: SensorTelemetry = {
  temperature: 25, // °C
  smokeDetected: false,
  gasConcentration: 20, // 0 - 255 scale
  intrusionDetected: false,
  manualEmergencyActive: false,
  manualEmergencyZone: 'CONTROL_ROOM',
  sensorFaults: {
    temperature: false,
    smoke: false,
    gas: false,
    intrusion: false,
  },
};

export const PREDEFINED_SCENARIOS: PredefinedScenario[] = [
  {
    id: 'SCENARIO_NORMAL',
    name: '1. Baseline Normal Operation',
    description: 'All zones nominal. Baseline ambient conditions across facility.',
    targetZone: 'CONTROL_ROOM',
    telemetryUpdates: {
      temperature: 25,
      smokeDetected: false,
      gasConcentration: 20,
      intrusionDetected: false,
      manualEmergencyActive: false,
      sensorFaults: { temperature: false, smoke: false, gas: false, intrusion: false },
    },
    isAutomated: false,
    initialHazard: {
      fireIntensity: 0,
      fireIgnited: false,
      ambientTemperature: 25,
      smokeConcentration: 0,
      gasReleaseRate: 0,
      gasSourceActive: false,
      gasConcentration: 20,
      intrusionBreachActive: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_FIRE_SUCCESS',
    name: '2. Fire with Successful Suppression',
    description: 'Thermal runaway in Research Lab (82°C + smoke). Automatic foam mist discharges, cools zone to 25°C, clears smoke, and contains fire.',
    targetZone: 'RESEARCH_LAB',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 82,
      smokeDetected: true,
      gasConcentration: 20,
      intrusionDetected: false,
      manualEmergencyActive: false,
    },
    initialHazard: {
      fireIntensity: 85,
      fireIgnited: true,
      ambientTemperature: 82,
      smokeConcentration: 85,
    },
    failureConfig: {
      fireSuppressionFailed: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_FIRE_FAIL',
    name: '3. Fire with Suppression Failure',
    description: 'Thermal runaway in Research Lab, but suppression pump faults. Fire remains uncontrolled until Fire Response Team reaches manual intervention.',
    targetZone: 'RESEARCH_LAB',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 84,
      smokeDetected: true,
      gasConcentration: 20,
      intrusionDetected: false,
      manualEmergencyActive: false,
    },
    initialHazard: {
      fireIntensity: 90,
      fireIgnited: true,
      ambientTemperature: 84,
      smokeConcentration: 90,
    },
    failureConfig: {
      fireSuppressionFailed: true,
    },
  },
  {
    id: 'SCENARIO_AUTO_GAS_SUCCESS',
    name: '4. Gas Leak with Successful Isolation & Ventilation',
    description: 'Gas surges to 175 in Chemical Lab. Emergency valve seals source, extraction scrubbers purge residual gas to baseline 20.',
    targetZone: 'CHEMICAL_LAB',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 25,
      smokeDetected: false,
      gasConcentration: 175,
      intrusionDetected: false,
      manualEmergencyActive: false,
    },
    initialHazard: {
      gasReleaseRate: 80,
      gasSourceActive: true,
      gasConcentration: 175,
    },
    failureConfig: {
      gasIsolationFailed: false,
      ventilationFailed: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_GAS_FAIL',
    name: '5. Gas Leak with Valve Isolation Failure',
    description: 'Gas valve actuator jams open. Gas continues entering room (uncontrolled) until HazMat team performs manual bypass shutoff.',
    targetZone: 'CHEMICAL_LAB',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 25,
      smokeDetected: false,
      gasConcentration: 180,
      intrusionDetected: false,
      manualEmergencyActive: false,
    },
    initialHazard: {
      gasReleaseRate: 75,
      gasSourceActive: true,
      gasConcentration: 180,
    },
    failureConfig: {
      gasIsolationFailed: true,
      ventilationFailed: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_INTRUSION',
    name: '6. Intrusion with Security Interlock',
    description: 'Perimeter optical breach in Restricted Storage. Vault magnetic lock secures area; Security Team sweeps and clears intrusion.',
    targetZone: 'RESTRICTED_STORAGE',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 25,
      smokeDetected: false,
      gasConcentration: 20,
      intrusionDetected: true,
      manualEmergencyActive: false,
    },
    initialHazard: {
      intrusionBreachActive: true,
    },
    failureConfig: {
      securityDelay: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_SIMULTANEOUS',
    name: '7. Simultaneous Fire & Gas Leak',
    description: 'Dual catastrophic event: Concurrent fire in Research Lab and toxic gas in Chemical Lab. Parallel closed-loop mitigation active.',
    targetZone: 'RESEARCH_LAB',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 84,
      smokeDetected: true,
      gasConcentration: 185,
      intrusionDetected: false,
      manualEmergencyActive: false,
    },
    initialHazard: {
      fireIntensity: 85,
      fireIgnited: true,
      ambientTemperature: 84,
      smokeConcentration: 85,
      gasReleaseRate: 75,
      gasSourceActive: true,
      gasConcentration: 185,
    },
    failureConfig: {
      fireSuppressionFailed: false,
      gasIsolationFailed: false,
      ventilationFailed: false,
    },
  },
  {
    id: 'SCENARIO_AUTO_MULTIPLE_CONCURRENT',
    name: '8. Multiple Concurrent Emergencies',
    description: 'Facility-wide compound incident: Active Fire, Toxic Gas, Security Intrusion, and Manual Emergency tripped simultaneously.',
    targetZone: 'CONTROL_ROOM',
    isAutomated: true,
    telemetryUpdates: {
      temperature: 88,
      smokeDetected: true,
      gasConcentration: 215,
      intrusionDetected: true,
      manualEmergencyActive: true,
      manualEmergencyZone: 'CONTROL_ROOM',
    },
    initialHazard: {
      fireIntensity: 90,
      fireIgnited: true,
      ambientTemperature: 88,
      smokeConcentration: 90,
      gasReleaseRate: 85,
      gasSourceActive: true,
      gasConcentration: 215,
      intrusionBreachActive: true,
      manualEmergencyActive: true,
    },
    failureConfig: {
      fireSuppressionFailed: false,
      gasIsolationFailed: false,
      ventilationFailed: false,
    },
  },
];
