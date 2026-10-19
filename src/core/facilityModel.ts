import type { ZoneId, ZoneMetadata, SensorTelemetry } from '../types';

export const FACILITY_NAME = 'SENTINEL Research & Industrial Facility';
export const FACILITY_CODE = 'FAC-SEC-04';

export interface ZoneFacilityDefinition extends ZoneMetadata {
  dimensions: { width: number; height: number; depth: number };
  position: [number, number, number];
  primarySensors: string[];
  protectionEquipmentIds: string[];
  responseTeamType: 'FIRE' | 'HAZMAT' | 'SECURITY' | 'NONE';
  safetyThresholds: {
    tempMax?: number;
    smokeDetectedAllowed?: boolean;
    gasConcentrationMax?: number;
    intrusionAllowed?: boolean;
  };
}

export const FACILITY_ZONES: Record<ZoneId, ZoneFacilityDefinition> = {
  RESEARCH_LAB: {
    id: 'RESEARCH_LAB',
    code: 'ZN-01',
    name: 'Research Laboratory',
    type: 'HIGH_VOLTAGE_RESEARCH',
    areaSqm: 180,
    equipmentCount: 14,
    status: 'NORMAL',
    dimensions: { width: 14, height: 4.5, depth: 10 },
    position: [-7, 0, -5],
    primarySensors: ['Thermal Sensor Array (PT-100)', 'Optical Smoke Obscuration Detector'],
    protectionEquipmentIds: ['fireSuppression', 'labEquipmentShutdown', 'fireVentIsolation', 'evacuationAlarm'],
    responseTeamType: 'FIRE',
    safetyThresholds: {
      tempMax: 59, // Safe < 60°C
      smokeDetectedAllowed: false,
    },
  },
  CHEMICAL_LAB: {
    id: 'CHEMICAL_LAB',
    code: 'ZN-02',
    name: 'Chemical Laboratory',
    type: 'HAZARDOUS_SYNTHESIS',
    areaSqm: 110,
    equipmentCount: 9,
    status: 'NORMAL',
    dimensions: { width: 12, height: 4.5, depth: 8 },
    position: [7, 0, -5],
    primarySensors: ['Multi-spectrum Electrochemical Gas Detector (0-255 scale)'],
    protectionEquipmentIds: ['gasIsolationValve', 'emergencyVentilation', 'chemicalEquipmentShutdown'],
    responseTeamType: 'HAZMAT',
    safetyThresholds: {
      gasConcentrationMax: 40, // Safe threshold <= 40 (alarm threshold >= 100)
    },
  },
  RESTRICTED_STORAGE: {
    id: 'RESTRICTED_STORAGE',
    code: 'ZN-03',
    name: 'Restricted Storage',
    type: 'HIGH_SECURITY_STORAGE',
    areaSqm: 65,
    equipmentCount: 6,
    status: 'NORMAL',
    dimensions: { width: 8, height: 4.5, depth: 7 },
    position: [7, 0, 4],
    primarySensors: ['Volumetric Infrared & Optical Perimeter Beam'],
    protectionEquipmentIds: ['accessPointLockdown'],
    responseTeamType: 'SECURITY',
    safetyThresholds: {
      intrusionAllowed: false,
    },
  },
  CONTROL_ROOM: {
    id: 'CONTROL_ROOM',
    code: 'ZN-04',
    name: 'Control Room',
    type: 'OPERATIONS_COMMAND',
    areaSqm: 85,
    equipmentCount: 12,
    status: 'NORMAL',
    dimensions: { width: 10, height: 4.5, depth: 7 },
    position: [-7, 0, 4],
    primarySensors: ['Manual Emergency Pull Station', 'Master Console Interlocks'],
    protectionEquipmentIds: ['evacuationAlarm'],
    responseTeamType: 'NONE',
    safetyThresholds: {},
  },
};

export const NOMINAL_BASELINE_TELEMETRY: SensorTelemetry = {
  temperature: 25,
  smokeDetected: false,
  gasConcentration: 20,
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
