import type {
  HazardEnvironment,
  ProtectionEquipmentState,
  ResponseTeamsState,
  EquipmentFailureConfig,
  SensorTelemetry,
  EventLogItem,
  ManualInterventionCommandType,
  ManualInterventionResult,
  ZoneId,
  TeamDispatchStage
} from '../types';

export const INITIAL_HAZARD_ENVIRONMENT: HazardEnvironment = {
  fireIntensity: 0,
  fireIgnited: false,
  ambientTemperature: 25,
  smokeConcentration: 0,
  gasReleaseRate: 0,
  gasSourceActive: false,
  gasConcentration: 20,
  intrusionBreachActive: false,
  manualEmergencyActive: false,
  inspectionCountdown: {},
  inspectionStatus: {},
  containmentStatus: {
    fire: 'SAFE',
    gas: 'SAFE',
    intrusion: 'SAFE',
    manual: 'SAFE',
  },
};

export const INITIAL_PROTECTION_EQUIPMENT: ProtectionEquipmentState = {
  fireSuppression: {
    id: 'EQ-FS-01',
    name: 'Foam/Mist Fire Suppression System',
    zoneId: 'RESEARCH_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Automated chemical foam mist discharge manifold',
  },
  labEquipmentShutdown: {
    id: 'EQ-EP-01',
    name: 'Research Equipment Power Interlock',
    zoneId: 'RESEARCH_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Auxiliary power contactors for experimental rigs',
  },
  fireVentIsolation: {
    id: 'EQ-FD-01',
    name: 'HVAC Fire & Smoke Damper',
    zoneId: 'RESEARCH_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Zone smoke isolation damper',
  },
  gasIsolationValve: {
    id: 'EQ-GV-01',
    name: 'Emergency Gas Shutoff Valve',
    zoneId: 'CHEMICAL_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Pneumatic fast-closing pipeline isolation valve',
  },
  emergencyVentilation: {
    id: 'EQ-EV-01',
    name: 'Emergency Extraction & Scrubbers',
    zoneId: 'CHEMICAL_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Exhaust extraction fans with active carbon scrubber',
  },
  chemicalEquipmentShutdown: {
    id: 'EQ-CP-01',
    name: 'Chemical Synthesis Power Interlock',
    zoneId: 'CHEMICAL_LAB',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Reactor thermal jacket & pump shutoff',
  },
  accessPointLockdown: {
    id: 'EQ-SL-01',
    name: 'Vault Security Magnetic Lock',
    zoneId: 'RESTRICTED_STORAGE',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Fail-secure magnetic barrier interlock',
  },
  evacuationAlarm: {
    id: 'EQ-EA-01',
    name: 'Facility Evacuation Strobe & Siren',
    zoneId: 'CONTROL_ROOM',
    state: 'STANDBY',
    health: 'nominal',
    controlMode: 'AUTOMATIC',
    details: 'Multi-tone audible siren & high-intensity beacons',
  },
};

export const INITIAL_RESPONSE_TEAMS: ResponseTeamsState = {
  fireTeam: {
    id: 'TM-FIR-01',
    name: 'Internal Fire Brigade',
    type: 'FIRE',
    stage: 'STANDBY',
    progress: 0,
    etaSeconds: 0,
    details: 'Specialized facility industrial firefighting team',
  },
  hazmatTeam: {
    id: 'TM-HAZ-01',
    name: 'Hazardous Materials Team',
    type: 'HAZMAT',
    stage: 'STANDBY',
    progress: 0,
    etaSeconds: 0,
    details: 'Chemical spill response and atmospheric sampling unit',
  },
  securityTeam: {
    id: 'TM-SEC-01',
    name: 'Physical Security Team',
    type: 'SECURITY',
    stage: 'STANDBY',
    progress: 0,
    etaSeconds: 0,
    details: 'Vault access control and rapid intervention personnel',
    assessmentUnderway: false,
    assessmentProgress: 0,
    assessmentCompleted: false,
  },
};

export const INITIAL_FAILURE_CONFIG: EquipmentFailureConfig = {
  fireSuppressionFailed: false,
  gasIsolationFailed: false,
  ventilationFailed: false,
  securityDelay: false,
};

export interface ClosedLoopStepOutput {
  nextEnv: HazardEnvironment;
  nextEquipment: ProtectionEquipmentState;
  nextTeams: ResponseTeamsState;
  derivedTelemetry: SensorTelemetry;
  newEvents: EventLogItem[];
}

/**
 * Executes a single deterministic simulation step for closed-loop hazard evolution,
 * automatic countermeasure activation, response team dispatch, and physical mitigation.
 */
export function stepClosedLoopSimulation(
  currentEnv: HazardEnvironment,
  currentEquipment: ProtectionEquipmentState,
  currentTeams: ResponseTeamsState,
  failureConfig: EquipmentFailureConfig,
  currentTelemetry: SensorTelemetry,
  timestamp: number = Date.now()
): ClosedLoopStepOutput {
  const nextEnv: HazardEnvironment = {
    ...currentEnv,
    containmentStatus: { ...currentEnv.containmentStatus },
    inspectionCountdown: { ...currentEnv.inspectionCountdown },
    inspectionStatus: { ...currentEnv.inspectionStatus },
  };
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
  const nextTeams: ResponseTeamsState = {
    fireTeam: { ...currentTeams.fireTeam },
    hazmatTeam: { ...currentTeams.hazmatTeam },
    securityTeam: { ...currentTeams.securityTeam },
  };

  const newEvents: EventLogItem[] = [];

  // ==================== 1. FIRE HAZARD & COUNTERMEASURES ====================
  if (nextEnv.fireIgnited || nextEnv.fireIntensity > 0) {
    // 1.1 Automatic Protection Controller Activation
    if (nextEquipment.evacuationAlarm.state !== 'OPERATING') {
      nextEquipment.evacuationAlarm.state = 'OPERATING';
      nextEquipment.evacuationAlarm.details = 'Evacuation strobe and directional audible horns operating.';
    }

    if (nextEquipment.labEquipmentShutdown.state !== 'OPERATING') {
      nextEquipment.labEquipmentShutdown.state = 'OPERATING';
      nextEquipment.labEquipmentShutdown.details = 'Non-essential laboratory apparatus power tripped.';
      newEvents.push({
        id: `EVT-EQ-PWR-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ACTIVATED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Research Laboratory electrical interlock opened. Equipment power isolated.',
        severity: 'info',
      });
    }

    if (nextEquipment.fireVentIsolation.state !== 'ISOLATED') {
      nextEquipment.fireVentIsolation.state = 'ISOLATED';
      nextEquipment.fireVentIsolation.details = 'Smoke containment dampers sealed in research zone.';
    }

    // Fire Suppression System evaluation
    if (nextEquipment.fireSuppression.state === 'STANDBY' || nextEquipment.fireSuppression.state === 'ACTIVATION_REQUESTED') {
      if (failureConfig.fireSuppressionFailed) {
        nextEquipment.fireSuppression.state = 'FAILED';
        nextEquipment.fireSuppression.health = 'fault';
        nextEquipment.fireSuppression.details = 'Discharge pump pressure fault. Deluge manifold failed to open.';
        newEvents.push({
          id: `EVT-EQ-FS-FAIL-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_FAILED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'CRITICAL FAILURE: Foam/Mist Fire Suppression failed to discharge in Research Laboratory.',
          severity: 'critical',
        });
      } else {
        nextEquipment.fireSuppression.state = 'OPERATING';
        nextEquipment.fireSuppression.health = 'nominal';
        nextEquipment.fireSuppression.details = 'High-pressure foam mist actively discharging across thermal zone.';
        newEvents.push({
          id: `EVT-EQ-FS-ACT-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_ACTIVATED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'Foam/Mist Fire Suppression System activated. Automated mitigation underway.',
          severity: 'info',
        });
      }
    }

    // 1.2 Fire Team Initial Dispatch Trigger (if on standby)
    if (nextTeams.fireTeam.stage === 'STANDBY') {
      nextTeams.fireTeam.stage = 'NOTIFICATION_INITIATED';
      nextTeams.fireTeam.progress = 15;
      nextTeams.fireTeam.etaSeconds = 25;
      nextTeams.fireTeam.details = 'Automated dispatch message transmitted to Internal Fire Brigade.';
      newEvents.push({
        id: `EVT-TM-FIR-NOT-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Simulated Fire Response Team notified. Dispatch confirmation received.',
        severity: 'info',
      });
    }

    // 1.3 Physical Hazard Consequences
    if (nextEquipment.fireSuppression.state === 'OPERATING') {
      // Suppression working: fire intensity decreases rapidly
      nextEnv.fireIntensity = Math.max(0, nextEnv.fireIntensity - 18);
      nextEnv.smokeConcentration = Math.max(0, nextEnv.smokeConcentration - 20);
      nextEnv.ambientTemperature = Math.max(25, nextEnv.ambientTemperature - 14);
      nextEnv.containmentStatus.fire = 'MITIGATING';

      if (nextEnv.fireIntensity === 0 && nextEnv.ambientTemperature <= 55 && nextEnv.smokeConcentration < 30) {
        nextEnv.fireIgnited = false;
        nextEnv.ambientTemperature = 25;
        nextEnv.smokeConcentration = 0;
        nextEnv.containmentStatus.fire = 'CONTAINED';
        nextEquipment.fireSuppression.state = 'COMPLETED';
        nextEquipment.fireSuppression.details = 'Foam mist discharge cycle completed. Thermal runaway extinguished.';

        newEvents.push({
          id: `EVT-HZ-FIR-CONT-${timestamp}`,
          timestamp,
          type: 'HAZARD_CONTAINED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'Research Laboratory fire extinguished. Temperature and optical smoke returned to safe baseline.',
          severity: 'success',
        });
      }
    } else if (nextEquipment.fireSuppression.state === 'FAILED') {
      // Suppression failed: check if brigade has reached intervention underway
      if (nextTeams.fireTeam.stage === 'INTERVENTION_UNDERWAY' || nextTeams.fireTeam.stage === 'ON_SITE') {
        // Fire brigade auxiliary manual line intervention
        nextEnv.fireIntensity = Math.max(0, nextEnv.fireIntensity - 10);
        nextEnv.ambientTemperature = Math.max(25, nextEnv.ambientTemperature - 8);
        nextEnv.smokeConcentration = Math.max(0, nextEnv.smokeConcentration - 10);
        nextEnv.containmentStatus.fire = 'MITIGATING';

        if (nextEnv.fireIntensity === 0 && nextEnv.ambientTemperature <= 55) {
          nextEnv.fireIgnited = false;
          nextEnv.ambientTemperature = 25;
          nextEnv.smokeConcentration = 0;
          nextEnv.containmentStatus.fire = 'CONTAINED';
          newEvents.push({
            id: `EVT-HZ-FIR-BRIG-${timestamp}`,
            timestamp,
            type: 'HAZARD_CONTAINED',
            category: 'FIRE',
            zoneId: 'RESEARCH_LAB',
            message: 'Fire Response Team successfully brought fire under control using manual intervention.',
            severity: 'success',
          });
        }
      } else {
        // Uncontrolled thermal runaway
        nextEnv.fireIntensity = Math.min(100, Math.max(75, nextEnv.fireIntensity));
        nextEnv.ambientTemperature = Math.min(110, Math.max(78, nextEnv.ambientTemperature));
        nextEnv.smokeConcentration = Math.min(100, Math.max(80, nextEnv.smokeConcentration));
        nextEnv.containmentStatus.fire = 'UNCONTROLLED';
      }
    }
  } else {
    // No active fire
    if (nextEnv.containmentStatus.fire !== 'CONTAINED') {
      nextEnv.containmentStatus.fire = 'SAFE';
    }
    if (nextEquipment.fireSuppression.state === 'OPERATING') {
      nextEquipment.fireSuppression.state = 'COMPLETED';
      nextEquipment.fireSuppression.details = 'Suppression discharge cycle completed.';
    }
  }

  // ==================== 2. GAS LEAK HAZARD & COUNTERMEASURES ====================
  if (nextEnv.gasSourceActive || nextEnv.gasConcentration >= 100) {
    // 2.1 Automatic Protection Controller Activation
    if (nextEquipment.chemicalEquipmentShutdown.state !== 'OPERATING') {
      nextEquipment.chemicalEquipmentShutdown.state = 'OPERATING';
      nextEquipment.chemicalEquipmentShutdown.details = 'Chemical process power cutoff engaged.';
      newEvents.push({
        id: `EVT-EQ-CHM-PWR-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ACTIVATED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Chemical synthesis reactor power tripped. Chemical delivery pumps offline.',
        severity: 'info',
      });
    }

    // Emergency Gas Shutoff Valve evaluation
    if (nextEquipment.gasIsolationValve.state === 'STANDBY' || nextEquipment.gasIsolationValve.state === 'ACTIVATION_REQUESTED') {
      if (failureConfig.gasIsolationFailed) {
        nextEquipment.gasIsolationValve.state = 'FAILED';
        nextEquipment.gasIsolationValve.health = 'fault';
        nextEquipment.gasIsolationValve.details = 'Pneumatic actuator jammed. Supply valve remained open.';
        newEvents.push({
          id: `EVT-EQ-GV-FAIL-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_FAILED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'CRITICAL FAILURE: Emergency Gas Isolation Valve failed to seal. Continuous leak ongoing.',
          severity: 'critical',
        });
      } else {
        nextEquipment.gasIsolationValve.state = 'ISOLATED';
        nextEquipment.gasIsolationValve.health = 'nominal';
        nextEquipment.gasIsolationValve.details = 'Pneumatic valve sealed shut. Source supply isolated.';
        newEvents.push({
          id: `EVT-EQ-GV-ISO-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_ISOLATED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'Emergency Gas Isolation Valve closed. Reagent supply pipeline successfully isolated.',
          severity: 'info',
        });
      }
    }

    // Emergency Ventilation & Extraction evaluation
    if (nextEquipment.emergencyVentilation.state === 'STANDBY' || nextEquipment.emergencyVentilation.state === 'ACTIVATION_REQUESTED') {
      if (failureConfig.ventilationFailed) {
        nextEquipment.emergencyVentilation.state = 'FAILED';
        nextEquipment.emergencyVentilation.health = 'fault';
        nextEquipment.emergencyVentilation.details = 'Exhaust duct fan motor electrical trip.';
        newEvents.push({
          id: `EVT-EQ-EV-FAIL-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_FAILED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'CRITICAL FAILURE: Emergency Ventilation extraction fans failed to start.',
          severity: 'critical',
        });
      } else {
        nextEquipment.emergencyVentilation.state = 'OPERATING';
        nextEquipment.emergencyVentilation.health = 'nominal';
        nextEquipment.emergencyVentilation.details = 'Full-capacity chemical scrubber exhaust extraction active.';
        newEvents.push({
          id: `EVT-EQ-EV-ACT-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_ACTIVATED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'Emergency Extraction & Chemical Scrubbers operating at maximum flow rate.',
          severity: 'info',
        });
      }
    }

    // HazMat Initial Dispatch Trigger (if on standby)
    if (nextTeams.hazmatTeam.stage === 'STANDBY') {
      nextTeams.hazmatTeam.stage = 'NOTIFICATION_INITIATED';
      nextTeams.hazmatTeam.progress = 15;
      nextTeams.hazmatTeam.etaSeconds = 30;
      nextTeams.hazmatTeam.details = 'HazMat emergency protocol transmitted to chemical safety team.';
      newEvents.push({
        id: `EVT-TM-HAZ-NOT-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Hazardous Materials Response Team dispatched with atmospheric detection gear.',
        severity: 'info',
      });
    }

    // 2.3 Physical Hazard Consequences
    if (nextEquipment.gasIsolationValve.state === 'ISOLATED') {
      // Gas source is cut off!
      nextEnv.gasReleaseRate = 0;

      if (nextEquipment.emergencyVentilation.state === 'OPERATING') {
        // Ventilation extracts residual gas rapidly
        nextEnv.gasConcentration = Math.max(20, nextEnv.gasConcentration - 28);
        nextEnv.containmentStatus.gas = 'MITIGATING';

        if (nextEnv.gasConcentration <= 40) {
          nextEnv.gasConcentration = Math.min(20, nextEnv.gasConcentration);
          nextEnv.gasSourceActive = false;
          nextEnv.containmentStatus.gas = 'CONTAINED';
          nextEquipment.emergencyVentilation.state = 'COMPLETED';
          nextEquipment.emergencyVentilation.details = 'Purge cycle complete. Residual toxic gas neutralized below 40/255.';

          newEvents.push({
            id: `EVT-HZ-GAS-CONT-${timestamp}`,
            timestamp,
            type: 'HAZARD_CONTAINED',
            category: 'GAS_LEAKAGE',
            zoneId: 'CHEMICAL_LAB',
            message: 'Chemical Laboratory atmosphere purged below 40/255 safe threshold. Residual gas neutralized.',
            severity: 'success',
          });
        }
      } else {
        // Ventilation failed or standby: concentration remains elevated
        nextEnv.gasConcentration = Math.max(145, nextEnv.gasConcentration - 0.5);
        nextEnv.containmentStatus.gas = 'UNCONTROLLED';
      }
    } else if (nextEquipment.gasIsolationValve.state === 'FAILED') {
      // Valve failed: gas continues entering room unless HazMat intervenes
      if (nextTeams.hazmatTeam.stage === 'INTERVENTION_UNDERWAY' || nextTeams.hazmatTeam.stage === 'ON_SITE') {
        nextEquipment.gasIsolationValve.state = 'ISOLATED';
        nextEquipment.gasIsolationValve.details = 'Manual bypass valve isolated by HazMat technician.';
        nextEnv.gasReleaseRate = 0;
        newEvents.push({
          id: `EVT-HZ-GAS-MAN-ISO-${timestamp}`,
          timestamp,
          type: 'EQUIPMENT_ISOLATED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'HazMat technician manually closed manual secondary valve on chemical manifold.',
          severity: 'info',
        });
      } else {
        nextEnv.gasReleaseRate = 75;
        nextEnv.gasConcentration = Math.min(240, Math.max(160, nextEnv.gasConcentration));
        nextEnv.containmentStatus.gas = 'UNCONTROLLED';
      }
    }
  } else {
    if (nextEnv.containmentStatus.gas !== 'CONTAINED') {
      nextEnv.containmentStatus.gas = 'SAFE';
    }
    if (nextEquipment.emergencyVentilation.state === 'OPERATING' && nextEnv.gasConcentration <= 40) {
      nextEquipment.emergencyVentilation.state = 'COMPLETED';
      nextEquipment.emergencyVentilation.details = 'Purge cycle complete. Residual toxic gas neutralized below 40/255.';
    }
  }

  // ==================== 3. INTRUSION HAZARD & COUNTERMEASURES ====================
  if (nextEnv.intrusionBreachActive) {
    if (nextEquipment.accessPointLockdown.state !== 'OPERATING') {
      nextEquipment.accessPointLockdown.state = 'OPERATING';
      nextEquipment.accessPointLockdown.details = 'Vault secondary magnetic lock energized. Emergency egress preserved.';
      newEvents.push({
        id: `EVT-EQ-SEC-LOCK-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ACTIVATED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Restricted Storage vault perimeter locked down. Access controls restricted.',
        severity: 'info',
      });
    }

    if (nextTeams.securityTeam.stage === 'STANDBY') {
      nextTeams.securityTeam.stage = 'NOTIFICATION_INITIATED';
      nextTeams.securityTeam.progress = 20;
      nextTeams.securityTeam.etaSeconds = failureConfig.securityDelay ? 45 : 15;
      nextTeams.securityTeam.details = 'Silent security alarm received at facility guard station.';
      newEvents.push({
        id: `EVT-TM-SEC-NOT-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Security Response Team dispatched to investigate Restricted Storage breach.',
        severity: 'info',
      });
    }

    if (nextEnv.containmentStatus.intrusion !== 'CONTAINED') {
      nextEnv.containmentStatus.intrusion = 'UNCONTROLLED';
    }
  } else {
    if (nextEnv.containmentStatus.intrusion !== 'CONTAINED') {
      nextEnv.containmentStatus.intrusion = 'SAFE';
    }
  }

  // ==================== 4. RESPONSE TEAMS AUTONOMOUS DISPATCH PROGRESSION ====================
  // 4.1 Internal Fire Brigade Lifecycle
  const ft = nextTeams.fireTeam;
  if (ft.stage === 'RESPONSE_COMPLETED') {
    ft.progress = 100;
    ft.etaSeconds = 0;
  } else if (ft.stage !== 'STANDBY') {
    const isFireContained = nextEnv.containmentStatus.fire === 'CONTAINED' || (!nextEnv.fireIgnited && nextEnv.fireIntensity === 0);
    const speed = ft.backupRequested ? 20 : 10;

    if (ft.stage === 'NOTIFICATION_INITIATED') {
      ft.progress = Math.min(100, ft.progress + speed);
      ft.etaSeconds = Math.max(1, Math.round(25 * (1 - ft.progress / 100)));
      if (ft.progress >= 35) {
        ft.stage = 'DISPATCH_CONFIRMED';
        ft.details = ft.backupRequested
          ? 'Primary and auxiliary backup fire teams confirmed. Rapid vehicle transit.'
          : 'Brigade turnout confirmed. En route to Research Facility.';
      }
    } else if (ft.stage === 'DISPATCH_CONFIRMED') {
      ft.progress = Math.min(100, ft.progress + speed);
      ft.etaSeconds = Math.max(1, Math.round(20 * (1 - ft.progress / 100)));
      if (ft.progress >= 60) {
        ft.stage = 'EN_ROUTE';
        ft.details = 'Vehicle transit through facility staging grounds.';
      }
    } else if (ft.stage === 'EN_ROUTE') {
      ft.progress = Math.min(100, ft.progress + speed);
      ft.etaSeconds = Math.max(1, Math.round(15 * (1 - ft.progress / 100)));
      if (ft.progress >= 85) {
        ft.stage = 'ON_SITE';
        ft.etaSeconds = 0;
        ft.details = 'Fire brigade arrived at Research Laboratory external staging bay.';
        newEvents.push({
          id: `EVT-TM-FIR-ARR-${timestamp}`,
          timestamp,
          type: 'TEAM_ARRIVED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'Fire Response Team arrived on site at Research Laboratory. Deploying backup lines.',
          severity: 'info',
        });
      }
    } else if (ft.stage === 'ON_SITE') {
      ft.progress = Math.min(100, ft.progress + 10);
      ft.etaSeconds = 0;
      if (ft.progress >= 95) {
        ft.stage = 'INTERVENTION_UNDERWAY';
        ft.details = isFireContained
          ? 'Fire brigade conducting post-containment thermal imaging and safety sweep.'
          : 'Personnel operating manual foam monitors and thermal imaging verification.';
      }
    } else if (ft.stage === 'INTERVENTION_UNDERWAY') {
      if (isFireContained) {
        ft.stage = 'RESPONSE_COMPLETED';
        ft.progress = 100;
        ft.etaSeconds = 0;
        ft.details = 'Thermal runaway extinguished and research area cleared.';
      } else {
        ft.progress = Math.min(99, ft.progress + 2);
        ft.etaSeconds = 0;
      }
    }
  }

  // 4.2 Hazardous Materials Team Lifecycle
  const ht = nextTeams.hazmatTeam;
  if (ht.stage === 'RESPONSE_COMPLETED') {
    ht.progress = 100;
    ht.etaSeconds = 0;
  } else if (ht.stage !== 'STANDBY') {
    const isGasContained = nextEnv.containmentStatus.gas === 'CONTAINED' || (!nextEnv.gasSourceActive && nextEnv.gasConcentration <= 40);
    const speed = ht.backupRequested ? 20 : 10;

    if (ht.stage === 'NOTIFICATION_INITIATED') {
      ht.progress = Math.min(100, ht.progress + speed);
      ht.etaSeconds = Math.max(1, Math.round(30 * (1 - ht.progress / 100)));
      if (ht.progress >= 35) {
        ht.stage = 'DISPATCH_CONFIRMED';
        ht.details = 'Specialist team donning Level-B chemical suits.';
      }
    } else if (ht.stage === 'DISPATCH_CONFIRMED') {
      ht.progress = Math.min(100, ht.progress + speed);
      ht.etaSeconds = Math.max(1, Math.round(20 * (1 - ht.progress / 100)));
      if (ht.progress >= 60) {
        ht.stage = 'EN_ROUTE';
        ht.details = 'HazMat vehicle arriving at chemical bay perimeter.';
      }
    } else if (ht.stage === 'EN_ROUTE') {
      ht.progress = Math.min(100, ht.progress + speed);
      ht.etaSeconds = Math.max(1, Math.round(10 * (1 - ht.progress / 100)));
      if (ht.progress >= 85) {
        ht.stage = 'ON_SITE';
        ht.etaSeconds = 0;
        ht.details = 'HazMat team stationed at decontamination airlock.';
        newEvents.push({
          id: `EVT-TM-HAZ-ARR-${timestamp}`,
          timestamp,
          type: 'TEAM_ARRIVED',
          category: 'GAS_LEAKAGE',
          zoneId: 'CHEMICAL_LAB',
          message: 'Hazardous Materials Team on site. Establishing perimeter sampling and air scrubbers.',
          severity: 'info',
        });
      }
    } else if (ht.stage === 'ON_SITE') {
      ht.progress = Math.min(100, ht.progress + 10);
      ht.etaSeconds = 0;
      if (ht.progress >= 95) {
        ht.stage = 'INTERVENTION_UNDERWAY';
        ht.details = isGasContained
          ? 'HazMat team verifying atmospheric safety and residual gas clearance.'
          : 'Atmospheric monitoring and manual mechanical manifold shutoff.';
      }
    } else if (ht.stage === 'INTERVENTION_UNDERWAY') {
      if (isGasContained) {
        ht.stage = 'RESPONSE_COMPLETED';
        ht.progress = 100;
        ht.etaSeconds = 0;
        ht.details = 'Atmospheric test verified safe breathing levels in Chemical Lab.';
      } else {
        ht.progress = Math.min(99, ht.progress + 2);
        ht.etaSeconds = 0;
      }
    }
  }

  // 4.3 Physical Security Team Dispatch Lifecycle (30s)
  const st = nextTeams.securityTeam;
  if (st.stage === 'RESPONSE_COMPLETED') {
    st.progress = 100;
    st.etaSeconds = 0;
  } else if (st.stage !== 'STANDBY') {
    const progressRate = st.backupRequested ? 25 : (failureConfig.securityDelay ? 10 : 20);

    if (st.stage === 'NOTIFICATION_INITIATED') {
      st.progress = Math.min(100, st.progress + progressRate);
      st.etaSeconds = Math.max(1, Math.round((failureConfig.securityDelay && !st.backupRequested ? 45 : 15) * (1 - st.progress / 100)));
      if (st.progress >= 35) {
        st.stage = 'DISPATCH_CONFIRMED';
        st.details = failureConfig.securityDelay && !st.backupRequested
          ? 'Security dispatch delayed due to perimeter gate lock check.'
          : 'Security team in rapid transit to Restricted Storage corridor.';
      }
    } else if (st.stage === 'DISPATCH_CONFIRMED') {
      st.progress = Math.min(100, st.progress + progressRate);
      st.etaSeconds = Math.max(1, Math.round((failureConfig.securityDelay && !st.backupRequested ? 30 : 10) * (1 - st.progress / 100)));
      if (st.progress >= 60) {
        st.stage = 'EN_ROUTE';
        st.details = 'Security officers approaching vault access checkpoint.';
      }
    } else if (st.stage === 'EN_ROUTE') {
      st.progress = Math.min(100, st.progress + progressRate);
      st.etaSeconds = Math.max(1, Math.round(5 * (1 - st.progress / 100)));
      if (st.progress >= 85) {
        st.stage = 'ON_SITE';
        st.etaSeconds = 0;
        st.details = 'Security officers arrived on site at Restricted Storage vault doorway.';
        newEvents.push({
          id: `EVT-TM-SEC-ARR-${timestamp}`,
          timestamp,
          type: 'TEAM_ARRIVED',
          category: 'INTRUSION',
          zoneId: 'RESTRICTED_STORAGE',
          message: 'Security officers on site at Restricted Storage vault. Ready for tactical area assessment.',
          severity: 'info',
        });
      }
    } else if (st.stage === 'ON_SITE') {
      st.progress = Math.min(100, st.progress + progressRate);
      st.etaSeconds = Math.max(0, Math.round(5 * (1 - st.progress / 100)));
      if (st.progress >= 95) {
        st.stage = 'INTERVENTION_UNDERWAY';
        st.details = 'Tactical security perimeter established. Officers stationed at vault entryway.';
      }
    } else if (st.stage === 'INTERVENTION_UNDERWAY') {
      st.progress = Math.min(100, st.progress + progressRate);
      st.etaSeconds = 0;
      if (st.progress >= 100) {
        st.stage = 'RESPONSE_COMPLETED';
        st.progress = 100;
        st.details = 'Security response team completed dispatch. On site and stationed at vault checkpoint.';
        nextEnv.intrusionBreachActive = false;
        nextEnv.containmentStatus.intrusion = 'CONTAINED';
      }
    }
  }

  // 4.4 Tactical Security Area Assessment Progression
  // Operates through central deterministic simulation scheduler independently of dispatch status
  if (st.assessmentUnderway && !st.assessmentCompleted) {
    if (!failureConfig.securityDelay || st.backupRequested) {
      const increment = st.backupRequested ? 25 : 20;
      st.assessmentProgress = Math.min(100, (st.assessmentProgress || 0) + increment);
      if (st.assessmentProgress >= 100) {
        st.assessmentProgress = 100;
        st.assessmentCompleted = true;
        st.assessmentUnderway = false;
        st.details = 'Tactical area assessment completed. Restricted Storage clear. Ready for safety verification inspection.';
        newEvents.push({
          id: `EVT-SEC-ASSESS-CMP-${timestamp}`,
          timestamp,
          type: 'SECURITY_VERIFIED',
          category: 'INTRUSION',
          zoneId: 'RESTRICTED_STORAGE',
          message: 'Tactical security assessment completed (100%). Area ready for physical security verification inspection.',
          severity: 'info',
        });
      } else {
        st.details = `Tactical area security assessment in progress: ${st.assessmentProgress}% completed.`;
      }
    } else {
      st.details = 'Tactical assessment delayed at vault checkpoint. Secondary squad backup required.';
    }
  }

  // 4.3 Safety Inspection Verification Countdown
  if (nextEnv.inspectionStatus) {
    const nextCountdowns = { ...(nextEnv.inspectionCountdown || {}) };
    const nextStatuses = { ...nextEnv.inspectionStatus };
    let inspectionChanged = false;

    const allZones: ZoneId[] = ['RESEARCH_LAB', 'CHEMICAL_LAB', 'RESTRICTED_STORAGE', 'CONTROL_ROOM'];
    for (const z of allZones) {
      if (nextStatuses[z] === 'IN_PROGRESS') {
        const cd = nextCountdowns[z] ?? 5;
        if (cd > 1) {
          nextCountdowns[z] = cd - 1;
          inspectionChanged = true;
        } else {
          nextCountdowns[z] = 0;
          let passed = true;
          if (z === 'RESTRICTED_STORAGE') {
            const hasBreach = Boolean(nextEnv.intrusionBreachActive || currentTelemetry.intrusionDetected);
            const assessmentDone = Boolean(nextTeams.securityTeam.assessmentCompleted || (nextTeams.securityTeam.assessmentProgress ?? 0) >= 100);
            passed = !hasBreach && assessmentDone;
          } else if (z === 'RESEARCH_LAB') {
            const fireClear = !nextEnv.fireIgnited && (nextEnv.fireIntensity ?? 0) === 0 && currentTelemetry.temperature < 45 && !currentTelemetry.smokeDetected;
            passed = fireClear;
          } else if (z === 'CHEMICAL_LAB') {
            const gasClear = !nextEnv.gasSourceActive && (nextEnv.gasReleaseRate ?? 0) === 0 && currentTelemetry.gasConcentration <= 40;
            passed = gasClear;
          } else if (z === 'CONTROL_ROOM') {
            const manualClear = !nextEnv.manualEmergencyActive && !currentTelemetry.manualEmergencyActive;
            passed = manualClear;
          }

          const eventCategory = z === 'CHEMICAL_LAB'
            ? 'GAS_LEAKAGE'
            : z === 'RESEARCH_LAB'
            ? 'FIRE'
            : z === 'CONTROL_ROOM'
            ? 'MANUAL_EMERGENCY'
            : 'INTRUSION';

          if (passed) {
            nextStatuses[z] = 'PASSED';
            if (z === 'RESTRICTED_STORAGE') {
              nextEnv.containmentStatus.intrusion = 'CONTAINED';
              nextEnv.securityAreaStatus = 'SECURED';
            } else if (z === 'CONTROL_ROOM') {
              nextEnv.containmentStatus.manual = 'CONTAINED';
            }
            newEvents.push({
              id: `EVT-INSP-PASS-${z}-${timestamp}`,
              timestamp,
              type: 'SAFETY_VERIFIED',
              category: eventCategory,
              zoneId: z,
              message: `Safety verification inspection PASSED for ${z}. Area verified safe for authorized emergency closure.`,
              severity: 'success',
            });
          } else {
            nextStatuses[z] = 'FAILED';
            newEvents.push({
              id: `EVT-INSP-FAIL-${z}-${timestamp}`,
              timestamp,
              type: 'INSPECTION_FAILED',
              category: eventCategory,
              zoneId: z,
              message: `Safety verification inspection FAILED for ${z}. Hazard conditions remain active or assessment incomplete.`,
              severity: 'critical',
            });
          }
          inspectionChanged = true;
        }
      }
    }

    if (inspectionChanged) {
      nextEnv.inspectionCountdown = nextCountdowns;
      nextEnv.inspectionStatus = nextStatuses;
    }
  }

  // ==================== 5. DERIVED SENSOR TELEMETRY ====================
  const derivedTelemetry: SensorTelemetry = {
    ...currentTelemetry,
    temperature: Math.min(255, Math.max(0, Math.round(nextEnv.ambientTemperature))),
    smokeDetected: nextEnv.smokeConcentration >= 40,
    gasConcentration: Math.min(255, Math.max(0, Math.round(nextEnv.gasConcentration))),
    intrusionDetected: Boolean(nextEnv.intrusionBreachActive),
    manualEmergencyActive: Boolean(nextEnv.manualEmergencyActive),
  };

  return {
    nextEnv,
    nextEquipment,
    nextTeams,
    derivedTelemetry,
    newEvents,
  };
}

/**
 * Authoritative manual intervention command handler.
 * Applies safety interlocks, updates simulation state, and logs audit events.
 */
export function executeManualCommand(
  currentEnv: HazardEnvironment,
  currentEquipment: ProtectionEquipmentState,
  currentTeams: ResponseTeamsState,
  failureConfig: EquipmentFailureConfig,
  currentTelemetry: SensorTelemetry,
  command: ManualInterventionCommandType,
  timestamp: number = Date.now()
): {
  nextEnv: HazardEnvironment;
  nextEquipment: ProtectionEquipmentState;
  nextTeams: ResponseTeamsState;
  nextFailureConfig: EquipmentFailureConfig;
  derivedTelemetry: SensorTelemetry;
  newEvents: EventLogItem[];
  result: ManualInterventionResult;
} {
  const nextEnv: HazardEnvironment = {
    ...currentEnv,
    containmentStatus: { ...currentEnv.containmentStatus },
  };
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
  const nextTeams: ResponseTeamsState = {
    fireTeam: { ...currentTeams.fireTeam },
    hazmatTeam: { ...currentTeams.hazmatTeam },
    securityTeam: { ...currentTeams.securityTeam },
  };
  const nextFailureConfig: EquipmentFailureConfig = { ...failureConfig };
  const newEvents: EventLogItem[] = [];

  let result: ManualInterventionResult = {
    success: true,
    message: 'Manual command processed.',
    commandType: command,
    zoneId: 'RESEARCH_LAB',
  };

  switch (command) {
    // ==================== FIRE COUNTERMEASURES ====================
    case 'RETRY_FIRE_SUPPRESSION':
    case 'MANUAL_FIRE_SUPPRESSION_ACTIVATE': {
      nextFailureConfig.fireSuppressionFailed = false;
      nextEquipment.fireSuppression = {
        ...nextEquipment.fireSuppression,
        state: 'OPERATING',
        health: 'nominal',
        controlMode: 'MANUAL_OVERRIDE',
        lastCommand: command,
        details: 'Operator manual override: auxiliary pump engaged. High-pressure foam mist discharging.',
      };

      // Direct mitigation impact
      nextEnv.fireIntensity = Math.max(0, nextEnv.fireIntensity - 25);
      nextEnv.ambientTemperature = Math.max(25, nextEnv.ambientTemperature - 15);
      nextEnv.smokeConcentration = Math.max(0, nextEnv.smokeConcentration - 25);
      nextEnv.containmentStatus.fire = 'MITIGATING';

      newEvents.push({
        id: `EVT-MAN-FS-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Operator manual override: Foam/Mist Fire Suppression pump restarted. Active deluge engaged.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Fire suppression pump fault cleared. Deluge manifold actively discharging.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'REQUEST_BACKUP_FIRE_BRIGADE': {
      nextTeams.fireTeam = {
        ...nextTeams.fireTeam,
        backupRequested: true,
        stage: 'ON_SITE',
        progress: 85,
        etaSeconds: 0,
        details: 'Secondary backup fire team deployed with auxiliary booster lines.',
      };

      newEvents.push({
        id: `EVT-MAN-FIR-BK-${timestamp}`,
        timestamp,
        type: 'BACKUP_DISPATCHED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Operator requested backup fire response. Secondary industrial fire brigade arrived on site.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Backup fire brigade dispatched. Priority vehicle transit confirmed on site.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'TRIP_RESEARCH_POWER': {
      nextEquipment.labEquipmentShutdown = {
        ...nextEquipment.labEquipmentShutdown,
        state: 'OPERATING',
        controlMode: 'MANUAL_OVERRIDE',
        lastCommand: command,
        details: 'Operator manual trip: research rig auxiliary power bus isolated.',
      };

      newEvents.push({
        id: `EVT-MAN-PWR-TRIP-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ISOLATED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Operator manual trip: Research equipment power interlock opened.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Research equipment power contactor opened. Experimental apparatus de-energized.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'RESTORE_RESEARCH_POWER': {
      // Safety Interlock
      if (nextEnv.fireIgnited || nextEnv.fireIntensity > 0 || currentTelemetry.temperature >= 50) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot restore research rig power while fire or thermal runaway is active.',
          commandType: command,
          zoneId: 'RESEARCH_LAB',
        };
        newEvents.push({
          id: `EVT-MAN-PWR-REJ-${timestamp}`,
          timestamp,
          type: 'COMMAND_REJECTED',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          message: 'Restoration command rejected by safety interlock: Active thermal hazard in zone.',
          severity: 'warning',
        });
        break;
      }

      nextEquipment.labEquipmentShutdown = {
        ...nextEquipment.labEquipmentShutdown,
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Research rig auxiliary power restored to nominal standby.',
      };

      newEvents.push({
        id: `EVT-MAN-PWR-RST-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_RECOVERED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Research equipment power interlock re-energized to nominal standby.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Research equipment power interlock closed. Experimental power bus re-energized.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'SEAL_FIRE_DAMPERS': {
      nextEquipment.fireVentIsolation = {
        ...nextEquipment.fireVentIsolation,
        state: 'ISOLATED',
        controlMode: 'MANUAL_OVERRIDE',
        details: 'Smoke containment dampers manually sealed.',
      };

      result = {
        success: true,
        message: 'HVAC fire & smoke containment dampers manually sealed.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'REOPEN_FIRE_DAMPERS': {
      if (nextEnv.fireIgnited || currentTelemetry.smokeDetected || nextEnv.smokeConcentration > 20) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot reopen dampers while smoke or fire is active.',
          commandType: command,
          zoneId: 'RESEARCH_LAB',
        };
        break;
      }

      nextEquipment.fireVentIsolation = {
        ...nextEquipment.fireVentIsolation,
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'HVAC fire & smoke dampers reopened to normal air exchange.',
      };

      result = {
        success: true,
        message: 'HVAC dampers reopened to normal ventilation mode.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'RECOVER_FIRE_SYSTEMS': {
      if (nextEnv.fireIgnited || nextEnv.containmentStatus.fire === 'UNCONTROLLED') {
        result = {
          success: false,
          message: 'Safety Interlock: Fire must be contained prior to suppression recovery.',
          commandType: command,
          zoneId: 'RESEARCH_LAB',
        };
        break;
      }

      nextEquipment.fireSuppression = {
        ...nextEquipment.fireSuppression,
        state: 'STANDBY',
        health: 'nominal',
        controlMode: 'RECOVERY',
        details: 'Foam mist manifold drained, recharged, and armed in standby.',
      };
      nextEquipment.fireVentIsolation.state = 'STANDBY';
      nextEquipment.labEquipmentShutdown.state = 'STANDBY';
      nextTeams.fireTeam = {
        ...nextTeams.fireTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        backupRequested: false,
        details: 'Internal Fire Brigade returned to standby status.',
      };

      newEvents.push({
        id: `EVT-MAN-FS-REC-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_RECOVERED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Research Laboratory fire protection systems recovered to nominal operational standby.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Research Laboratory fire systems recovered and recharged to nominal standby.',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    // ==================== GAS COUNTERMEASURES ====================
    case 'RETRY_GAS_ISOLATION':
    case 'MANUAL_GAS_ISOLATE': {
      nextFailureConfig.gasIsolationFailed = false;
      nextEquipment.gasIsolationValve = {
        ...nextEquipment.gasIsolationValve,
        state: 'ISOLATED',
        health: 'nominal',
        controlMode: 'MANUAL_OVERRIDE',
        lastCommand: command,
        details: 'Emergency shutoff valve sealed closed via manual override.',
      };
      nextEnv.gasReleaseRate = 0;

      newEvents.push({
        id: `EVT-MAN-GV-ISO-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ISOLATED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Operator manual override: Gas isolation valve sealed. Reagent feedline isolated.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Gas supply isolation valve closed. Chemical feedline isolated successfully.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'ACTIVATE_EMERGENCY_VENTILATION': {
      nextFailureConfig.ventilationFailed = false;
      nextEquipment.emergencyVentilation = {
        ...nextEquipment.emergencyVentilation,
        state: 'OPERATING',
        health: 'nominal',
        controlMode: 'MANUAL_OVERRIDE',
        lastCommand: command,
        details: 'Emergency extraction fans & carbon scrubbers operating at maximum flow rate.',
      };

      // Direct mitigation impact
      nextEnv.gasConcentration = Math.max(20, nextEnv.gasConcentration - 35);
      nextEnv.containmentStatus.gas = 'MITIGATING';

      newEvents.push({
        id: `EVT-MAN-EV-ACT-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ACTIVATED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Operator manual start: Emergency extraction fans & chemical scrubbers operating.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Emergency extraction ventilation started. Active scrubbing initiated.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'REQUEST_HAZMAT_BACKUP': {
      nextTeams.hazmatTeam = {
        ...nextTeams.hazmatTeam,
        backupRequested: true,
        stage: 'ON_SITE',
        progress: 85,
        etaSeconds: 0,
        details: 'Specialist Level-A HazMat atmospheric intervention unit on site.',
      };

      newEvents.push({
        id: `EVT-MAN-HAZ-BK-${timestamp}`,
        timestamp,
        type: 'BACKUP_DISPATCHED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Operator requested priority HazMat backup. Chemical safety specialist unit on site.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Priority HazMat response unit stationed on site at Chemical Laboratory.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'TRIP_CHEMICAL_POWER': {
      nextEquipment.chemicalEquipmentShutdown = {
        ...nextEquipment.chemicalEquipmentShutdown,
        state: 'OPERATING',
        controlMode: 'MANUAL_OVERRIDE',
        details: 'Chemical synthesis reactor power tripped manually.',
      };

      result = {
        success: true,
        message: 'Chemical synthesis reactor power cut off.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'RESTORE_CHEMICAL_POWER': {
      if (currentTelemetry.gasConcentration >= 75 || nextEnv.gasSourceActive) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot re-energize reactor while gas concentration exceeds safe baseline.',
          commandType: command,
          zoneId: 'CHEMICAL_LAB',
        };
        break;
      }

      nextEquipment.chemicalEquipmentShutdown = {
        ...nextEquipment.chemicalEquipmentShutdown,
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Chemical reactor power restored to operational standby.',
      };

      result = {
        success: true,
        message: 'Chemical synthesis reactor power restored to nominal standby.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'PURGE_AND_RECOVER_GAS': {
      if (currentTelemetry.gasConcentration > 30 || nextEnv.gasReleaseRate > 0) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot reset gas systems while concentration is elevated.',
          commandType: command,
          zoneId: 'CHEMICAL_LAB',
        };
        break;
      }

      nextEquipment.gasIsolationValve.state = 'STANDBY';
      nextEquipment.gasIsolationValve.details = 'Pneumatic isolation valve armed in standby.';
      nextEquipment.emergencyVentilation.state = 'STANDBY';
      nextEquipment.chemicalEquipmentShutdown.state = 'STANDBY';
      nextTeams.hazmatTeam = {
        ...nextTeams.hazmatTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        backupRequested: false,
        details: 'Hazardous Materials Team returned to standby.',
      };

      newEvents.push({
        id: `EVT-MAN-GAS-REC-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_RECOVERED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Chemical Laboratory gas safety systems recovered to nominal operational standby.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Chemical Laboratory gas systems recovered to operational standby.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'RESTORE_GAS_SUPPLY': {
      if (currentTelemetry.gasConcentration > 40 || nextEnv.gasSourceActive || (nextEnv.gasReleaseRate ?? 0) > 0) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot reopen gas supply valve while gas concentration is elevated (> 40) or release is active.',
          commandType: command,
          zoneId: 'CHEMICAL_LAB',
        };
        break;
      }

      nextEquipment.gasIsolationValve = {
        ...nextEquipment.gasIsolationValve,
        state: 'STANDBY',
        controlMode: 'AUTOMATIC',
        lastCommand: command,
        details: 'Gas reagent feedline manifold reopened following authorized recovery procedure.',
      };

      newEvents.push({
        id: `EVT-MAN-GAS-RESTORE-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_ACTIVATED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Chemical gas supply manifold re-opened and normalized under authorized recovery protocol.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Chemical gas reagent supply valve safely reopened to operational standby.',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    // ==================== SECURITY COUNTERMEASURES ====================
    case 'REQUEST_SECURITY_DISPATCH': {
      nextTeams.securityTeam = {
        ...nextTeams.securityTeam,
        stage: 'NOTIFICATION_INITIATED',
        progress: 25,
        etaSeconds: 15,
        details: 'Security Response Team dispatched to investigate Restricted Storage breach.',
      };

      result = {
        success: true,
        message: 'Security response team dispatched.',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    case 'REQUEST_BACKUP_SECURITY': {
      nextFailureConfig.securityDelay = false;
      nextTeams.securityTeam = {
        ...nextTeams.securityTeam,
        backupRequested: true,
        stage: 'ON_SITE',
        progress: 85,
        etaSeconds: 0,
        details: 'Backup tactical security squad on site at Restricted Storage vault.',
      };

      newEvents.push({
        id: `EVT-MAN-SEC-BK-${timestamp}`,
        timestamp,
        type: 'BACKUP_DISPATCHED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Operator requested backup security response. Secondary tactical squad arrived on site.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Backup tactical security unit deployed and stationed on site at Restricted Storage.',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    case 'START_SECURITY_ASSESSMENT': {
      const allowedStages: TeamDispatchStage[] = ['ON_SITE', 'INTERVENTION_UNDERWAY', 'RESPONSE_COMPLETED'];
      if (!allowedStages.includes(nextTeams.securityTeam.stage)) {
        result = {
          success: false,
          message: 'Safety Protocol: Area security assessment requires security personnel on site.',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      if (nextTeams.securityTeam.assessmentCompleted) {
        result = {
          success: false,
          message: 'Tactical security assessment already completed (100%).',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      nextTeams.securityTeam = {
        ...nextTeams.securityTeam,
        assessmentUnderway: true,
        assessmentProgress: Math.max(20, nextTeams.securityTeam.assessmentProgress || 20),
        details: 'Tactical area security sweep and vault verification underway.',
      };

      newEvents.push({
        id: `EVT-MAN-SEC-ASMT-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Authorised area security assessment initiated. Tactical sweep underway.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Area security assessment initiated. Officers conducting tactical sweep.',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    case 'CONFIRM_AREA_SECURED': {
      const isAssessmentDone = Boolean(nextTeams.securityTeam.assessmentCompleted || (nextTeams.securityTeam.assessmentProgress ?? 0) >= 100);
      if (!isAssessmentDone) {
        result = {
          success: false,
          message: 'Prerequisite Unmet: Tactical area assessment must reach 100% before initiating physical safety verification.',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      nextEnv.inspectionStatus = {
        ...(nextEnv.inspectionStatus || {}),
        RESTRICTED_STORAGE: 'IN_PROGRESS',
      };
      nextEnv.inspectionCountdown = {
        ...(nextEnv.inspectionCountdown || {}),
        RESTRICTED_STORAGE: 5,
      };

      newEvents.push({
        id: `EVT-MAN-SEC-INSP-${timestamp}`,
        timestamp,
        type: 'INSPECTION_REQUESTED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Operator initiated 5-second physical safety verification inspection for Restricted Storage.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Physical safety verification inspection initiated (5s duration).',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    case 'RESTORE_VAULT_ACCESS':
    case 'REARM_OPTICAL_PERIMETER': {
      if (nextEnv.intrusionBreachActive || nextEnv.containmentStatus.intrusion === 'UNCONTROLLED') {
        result = {
          success: false,
          message: 'Safety Protocol: Cannot restore access control while active perimeter breach is uncontained.',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      nextEquipment.accessPointLockdown = {
        ...nextEquipment.accessPointLockdown,
        state: 'STANDBY',
        controlMode: 'RECOVERY',
        details: 'Fail-secure magnetic barrier in nominal access mode. Egress verified non-obstructed.',
      };
      nextTeams.securityTeam = {
        ...nextTeams.securityTeam,
        stage: 'STANDBY',
        progress: 0,
        etaSeconds: 0,
        backupRequested: false,
        assessmentUnderway: false,
        details: 'Physical Security Team returned to station standby.',
      };

      newEvents.push({
        id: `EVT-MAN-SEC-REC-${timestamp}`,
        timestamp,
        type: 'EQUIPMENT_RECOVERED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Vault access control restored to normal operation. Emergency egress verified.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Vault magnetic lock restored to normal access mode. Emergency egress routes verified.',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    // ==================== SAFETY VERIFICATION INSPECTIONS ====================
    case 'REQUEST_GAS_INSPECTION': {
      if (nextEnv.inspectionStatus?.CHEMICAL_LAB === 'IN_PROGRESS') {
        result = {
          success: false,
          message: 'Safety inspection is already in progress for Chemical Laboratory.',
          commandType: command,
          zoneId: 'CHEMICAL_LAB',
        };
        break;
      }

      if (nextEnv.gasSourceActive || (nextEnv.gasReleaseRate ?? 0) > 0 || nextEquipment.gasIsolationValve.state !== 'ISOLATED' || currentTelemetry.gasConcentration > 40) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot initiate gas safety verification until gas release is inactive, source isolated, and concentration <= 40/255.',
          commandType: command,
          zoneId: 'CHEMICAL_LAB',
        };
        break;
      }

      nextEnv.inspectionStatus = {
        ...nextEnv.inspectionStatus,
        CHEMICAL_LAB: 'IN_PROGRESS',
      };
      nextEnv.inspectionCountdown = {
        ...nextEnv.inspectionCountdown,
        CHEMICAL_LAB: 5,
      };

      newEvents.push({
        id: `EVT-INSP-INIT-GAS-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Certified HazMat safety inspection initiated for Chemical Laboratory. 5-second physical verification in progress.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Safety verification inspection initiated for Chemical Laboratory (5s countdown).',
        commandType: command,
        zoneId: 'CHEMICAL_LAB',
      };
      break;
    }

    case 'REQUEST_FIRE_INSPECTION': {
      if (nextEnv.inspectionStatus?.RESEARCH_LAB === 'IN_PROGRESS') {
        result = {
          success: false,
          message: 'Safety verification inspection is already in progress for Research Laboratory.',
          commandType: command,
          zoneId: 'RESEARCH_LAB',
        };
        break;
      }

      if (nextEnv.fireIgnited || nextEnv.fireIntensity > 0 || currentTelemetry.temperature >= 50 || currentTelemetry.smokeDetected) {
        result = {
          success: false,
          message: 'Safety Interlock: Cannot initiate fire safety verification until fire is extinguished, temperature < 50°C, and smoke cleared.',
          commandType: command,
          zoneId: 'RESEARCH_LAB',
        };
        break;
      }

      nextEnv.inspectionStatus = {
        ...nextEnv.inspectionStatus,
        RESEARCH_LAB: 'IN_PROGRESS',
      };
      nextEnv.inspectionCountdown = {
        ...nextEnv.inspectionCountdown,
        RESEARCH_LAB: 5,
      };

      newEvents.push({
        id: `EVT-INSP-INIT-FIR-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Certified Fire Safety inspection initiated for Research Laboratory. 5-second thermal sweep in progress.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Safety verification inspection initiated for Research Laboratory (5s countdown).',
        commandType: command,
        zoneId: 'RESEARCH_LAB',
      };
      break;
    }

    case 'REQUEST_SECURITY_INSPECTION': {
      if (nextEnv.inspectionStatus?.RESTRICTED_STORAGE === 'IN_PROGRESS') {
        result = {
          success: false,
          message: 'Safety verification inspection is already in progress for Restricted Storage.',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      const isAssessmentDone = Boolean(nextTeams.securityTeam.assessmentCompleted || (nextTeams.securityTeam.assessmentProgress ?? 0) >= 100);
      if (!isAssessmentDone) {
        result = {
          success: false,
          message: 'Safety Protocol: Area security tactical assessment must reach 100% before initiating physical safety verification.',
          commandType: command,
          zoneId: 'RESTRICTED_STORAGE',
        };
        break;
      }

      nextEnv.inspectionStatus = {
        ...nextEnv.inspectionStatus,
        RESTRICTED_STORAGE: 'IN_PROGRESS',
      };
      nextEnv.inspectionCountdown = {
        ...nextEnv.inspectionCountdown,
        RESTRICTED_STORAGE: 5,
      };

      newEvents.push({
        id: `EVT-INSP-INIT-SEC-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Security inspection initiated for Restricted Storage vault. Verification in progress.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Safety verification inspection initiated for Restricted Storage (5s countdown).',
        commandType: command,
        zoneId: 'RESTRICTED_STORAGE',
      };
      break;
    }

    case 'REQUEST_MANUAL_EMERGENCY_INSPECTION': {
      if (nextEnv.inspectionStatus?.CONTROL_ROOM === 'IN_PROGRESS') {
        result = {
          success: false,
          message: 'Safety verification inspection is already in progress for Control Room.',
          commandType: command,
          zoneId: 'CONTROL_ROOM',
        };
        break;
      }

      const isTripActive = Boolean(nextEnv.manualEmergencyActive || currentTelemetry.manualEmergencyActive);
      if (isTripActive) {
        result = {
          success: false,
          message: 'Safety Verification Unavailable — Manual Emergency Trip Still Active in Control Room.',
          commandType: command,
          zoneId: 'CONTROL_ROOM',
        };
        break;
      }

      nextEnv.inspectionStatus = {
        ...nextEnv.inspectionStatus,
        CONTROL_ROOM: 'IN_PROGRESS',
      };
      nextEnv.inspectionCountdown = {
        ...nextEnv.inspectionCountdown,
        CONTROL_ROOM: 5,
      };

      newEvents.push({
        id: `EVT-INSP-INIT-MAN-${timestamp}`,
        timestamp,
        type: 'MANUAL_OVERRIDE',
        category: 'MANUAL_EMERGENCY',
        zoneId: 'CONTROL_ROOM',
        message: 'Safety verification inspection initiated for Control Room station. 5-second verification in progress.',
        severity: 'info',
      });

      result = {
        success: true,
        message: 'Safety verification inspection initiated for Control Room (5s countdown).',
        commandType: command,
        zoneId: 'CONTROL_ROOM',
      };
      break;
    }
  }

  const derivedTelemetry: SensorTelemetry = {
    ...currentTelemetry,
    temperature: Math.min(255, Math.max(0, Math.round(nextEnv.ambientTemperature))),
    smokeDetected: nextEnv.smokeConcentration >= 40,
    gasConcentration: Math.min(255, Math.max(0, Math.round(nextEnv.gasConcentration))),
    intrusionDetected: Boolean(nextEnv.intrusionBreachActive),
    manualEmergencyActive: Boolean(nextEnv.manualEmergencyActive),
  };

  return {
    nextEnv,
    nextEquipment,
    nextTeams,
    nextFailureConfig,
    derivedTelemetry,
    newEvents,
    result,
  };
}
