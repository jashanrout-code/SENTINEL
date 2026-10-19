import type {
  ProtectionEquipmentState,
  HazardEnvironment,
  SensorTelemetry,
  EventLogItem,
  ZoneId,
  ResponseTeamsState,
} from '../types';

export interface ZoneRestorationResult {
  success: boolean;
  message: string;
  nextEquipment: ProtectionEquipmentState;
  nextTeams: ResponseTeamsState;
  newEvents: EventLogItem[];
}

export function restoreZoneOperations(
  zoneId: ZoneId,
  equipment: ProtectionEquipmentState,
  teams: ResponseTeamsState,
  hazardEnv: HazardEnvironment,
  telemetry: SensorTelemetry,
  timestamp: number = Date.now()
): ZoneRestorationResult {
  const nextEquipment: ProtectionEquipmentState = {
    fireSuppression: { ...equipment.fireSuppression },
    labEquipmentShutdown: { ...equipment.labEquipmentShutdown },
    fireVentIsolation: { ...equipment.fireVentIsolation },
    gasIsolationValve: { ...equipment.gasIsolationValve },
    emergencyVentilation: { ...equipment.emergencyVentilation },
    chemicalEquipmentShutdown: { ...equipment.chemicalEquipmentShutdown },
    accessPointLockdown: { ...equipment.accessPointLockdown },
    evacuationAlarm: { ...equipment.evacuationAlarm },
  };

  const nextTeams: ResponseTeamsState = {
    fireTeam: { ...teams.fireTeam },
    hazmatTeam: { ...teams.hazmatTeam },
    securityTeam: { ...teams.securityTeam },
  };

  const newEvents: EventLogItem[] = [];

  switch (zoneId) {
    case 'RESEARCH_LAB': {
      // Interlocks: Fire intensity = 0, Temp < 60°C, No smoke
      if (hazardEnv.fireIntensity > 0 || telemetry.temperature >= 60 || telemetry.smokeDetected) {
        return {
          success: false,
          message: 'Recovery Interlock: Cannot restore Research Lab while thermal or smoke hazard is active.',
          nextEquipment,
          nextTeams,
          newEvents,
        };
      }

      // Idempotency check: If already in nominal standby, do not create duplicate events or reset state
      const isAlreadyRestored =
        equipment.fireSuppression.state === 'STANDBY' &&
        equipment.labEquipmentShutdown.state === 'STANDBY' &&
        equipment.fireVentIsolation.state === 'STANDBY' &&
        teams.fireTeam.stage === 'STANDBY';

      if (isAlreadyRestored) {
        return {
          success: true,
          message: 'Research Laboratory equipment is already restored in nominal operational standby.',
          nextEquipment,
          nextTeams,
          newEvents: [],
        };
      }

      nextEquipment.fireSuppression = {
        id: 'EQ-FS-01',
        name: 'Deluge Foam Suppression',
        type: 'SUPPRESSION',
        zoneId: 'RESEARCH_LAB',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Deluge header recharged. System in automatic standby.',
      };

      nextEquipment.labEquipmentShutdown = {
        id: 'EQ-ES-01',
        name: 'Research Rig Power Interlock',
        type: 'SHUTDOWN',
        zoneId: 'RESEARCH_LAB',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Auxiliary power bus re-energized. Breakers closed.',
      };

      nextEquipment.fireVentIsolation = {
        id: 'EQ-VI-01',
        name: 'HVAC Fire Dampers',
        type: 'VENTILATION',
        zoneId: 'RESEARCH_LAB',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'HVAC containment dampers reopened. Normal ventilation restored.',
      };

      nextTeams.fireTeam = {
        ...nextTeams.fireTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        dispatchElapsedSeconds: 0,
        backupRequested: false,
        details: 'Internal Fire Brigade returned to fire station standby.',
      };

      newEvents.push({
        id: `EVT-RESTORE-RES-${timestamp}`,
        timestamp,
        type: 'RECOVERY_COMPLETED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'ZONE OPERATIONS RESTORED: Research Laboratory systems reset to nominal standby. Power re-energized and HVAC dampers open.',
        severity: 'success',
      });

      return {
        success: true,
        message: 'Research Laboratory equipment successfully restored to nominal operational standby.',
        nextEquipment,
        nextTeams,
        newEvents,
      };
    }

    case 'CHEMICAL_LAB': {
      // Interlocks: Gas release stopped, Concentration <= 40
      if (hazardEnv.gasSourceActive || telemetry.gasConcentration > 40) {
        return {
          success: false,
          message: `Recovery Interlock: Cannot restore Chemical Lab while gas concentration (${telemetry.gasConcentration}) exceeds safe baseline (<= 40).`,
          nextEquipment,
          nextTeams,
          newEvents,
        };
      }

      // Idempotency check: If general equipment already restored to nominal standby, return without duplicate events
      const isAlreadyRestored =
        equipment.emergencyVentilation.state === 'STANDBY' &&
        equipment.chemicalEquipmentShutdown.state === 'STANDBY' &&
        teams.hazmatTeam.stage === 'STANDBY';

      if (isAlreadyRestored) {
        return {
          success: true,
          message: 'Chemical Laboratory general equipment is already restored in nominal operational standby.',
          nextEquipment,
          nextTeams,
          newEvents: [],
        };
      }

      // Section 5: Preserve the gas isolation valve in safe isolation.
      // General equipment recovery completed; gas supply reopening requires separate authorisation.
      nextEquipment.gasIsolationValve = {
        ...equipment.gasIsolationValve,
        state: 'ISOLATED',
        controlMode: 'AUTOMATIC',
        lastCommand: 'EQUIPMENT_RECOVERY',
        details: 'Pneumatic valve preserved in safe isolation. Separate authorisation required for reagent line release.',
      };

      nextEquipment.chemicalEquipmentShutdown = {
        id: 'EQ-CS-01',
        name: 'Reactor Power Contactor',
        type: 'SHUTDOWN',
        zoneId: 'CHEMICAL_LAB',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Chemical synthesis reactor primary power contactor re-energized.',
      };

      nextEquipment.emergencyVentilation = {
        id: 'EQ-EV-01',
        name: 'Emergency Extraction System',
        type: 'VENTILATION',
        zoneId: 'CHEMICAL_LAB',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Emergency scrubbers returned to low-velocity baseline ventilation.',
      };

      nextTeams.hazmatTeam = {
        ...nextTeams.hazmatTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        dispatchElapsedSeconds: 0,
        backupRequested: false,
        details: 'HazMat Team returned to containment bay standby.',
      };

      newEvents.push({
        id: `EVT-RESTORE-CHEM-${timestamp}`,
        timestamp,
        type: 'RECOVERY_COMPLETED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'ZONE OPERATIONS RESTORED: Chemical Laboratory equipment recovered to nominal standby. Gas supply line safely preserved in isolation pending separate authorisation.',
        severity: 'success',
      });

      return {
        success: true,
        message: 'Chemical Laboratory equipment recovered to standby. Gas supply line safely preserved in isolation.',
        nextEquipment,
        nextTeams,
        newEvents,
      };
    }

    case 'RESTRICTED_STORAGE': {
      if (hazardEnv.intrusionBreachActive || telemetry.intrusionDetected) {
        return {
          success: false,
          message: 'Recovery Interlock: Cannot restore vault access while perimeter breach is active.',
          nextEquipment,
          nextTeams,
          newEvents,
        };
      }

      // Idempotency check: If access control already in nominal standby, do not duplicate
      const isAlreadyRestored =
        equipment.accessPointLockdown.state === 'STANDBY' &&
        teams.securityTeam.stage === 'STANDBY';

      if (isAlreadyRestored) {
        return {
          success: true,
          message: 'Restricted Storage security systems are already restored in nominal operational standby.',
          nextEquipment,
          nextTeams,
          newEvents: [],
        };
      }

      nextEquipment.accessPointLockdown = {
        id: 'EQ-AL-01',
        name: 'Vault Magnetic Access Control',
        type: 'ACCESS_CONTROL',
        zoneId: 'RESTRICTED_STORAGE',
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Magnetic access lock restored to nominal credential-entry mode. Emergency egress verified free.',
      };

      nextTeams.securityTeam = {
        ...nextTeams.securityTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        dispatchElapsedSeconds: 0,
        backupRequested: false,
        details: 'Tactical Security Unit returned to security post standby.',
      };

      newEvents.push({
        id: `EVT-RESTORE-SEC-${timestamp}`,
        timestamp,
        type: 'RECOVERY_COMPLETED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'ZONE OPERATIONS RESTORED: Restricted Storage magnetic door lock returned to normal access mode.',
        severity: 'success',
      });

      return {
        success: true,
        message: 'Restricted Storage normal access control operation restored.',
        nextEquipment,
        nextTeams,
        newEvents,
      };
    }

    case 'CONTROL_ROOM': {
      nextEquipment.evacuationAlarm.state = 'STANDBY';
      nextEquipment.evacuationAlarm.details = 'Evacuation strobes and sirens in standby.';

      return {
        success: true,
        message: 'Control Room operations verified nominal.',
        nextEquipment,
        nextTeams,
        newEvents,
      };
    }
  }
}
