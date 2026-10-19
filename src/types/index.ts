export type ZoneId = 'RESEARCH_LAB' | 'CHEMICAL_LAB' | 'RESTRICTED_STORAGE' | 'CONTROL_ROOM';

export type EmergencyCategory = 'FIRE' | 'GAS_LEAKAGE' | 'INTRUSION' | 'MANUAL_EMERGENCY';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';

export type AlarmLifecycleState =
  | 'ACTIVE_UNACKNOWLEDGED'
  | 'ACTIVE_ACKNOWLEDGED'
  | 'CONDITION_CLEARED'
  | 'RESOLVED';

export type SimulationOperatingMode = 'CLOSED_LOOP' | 'MANUAL_TEST' | 'MANUAL_SENSOR_TEST' | 'AUTOMATED_SCENARIO';

export type OperationalView =
  | 'command-centre'
  | 'incident-management'
  | 'operations'
  | 'diagnostics'
  | 'COMMAND_CENTRE'
  | 'INCIDENT_MANAGEMENT'
  | 'OPERATIONS'
  | 'DIAGNOSTICS';

export interface ZoneMetadata {
  id: ZoneId;
  code: string;
  name: string;
  type: string;
  description?: string;
  areaSqm: number;
  equipmentCount: number;
  status: 'NORMAL' | 'WARNING' | 'EMERGENCY';
}

export const ZONES: Record<ZoneId, ZoneMetadata> = {
  RESEARCH_LAB: {
    id: 'RESEARCH_LAB',
    code: 'ZN-01',
    name: 'Research Laboratory',
    type: 'High-Voltage Laser & Power Rig',
    description: 'High-power experimental laboratory containing high-voltage research benches, laser arrays, and deluge foam fire suppression.',
    areaSqm: 180,
    equipmentCount: 14,
    status: 'NORMAL',
  },
  CHEMICAL_LAB: {
    id: 'CHEMICAL_LAB',
    code: 'ZN-02',
    name: 'Chemical Laboratory',
    type: 'Hazardous Vapor Synthesis & Reactor',
    description: 'Specialized chemical synthesis facility equipped with toxic gas detection, emergency isolation manifolds, and high-velocity scrubbers.',
    areaSqm: 110,
    equipmentCount: 9,
    status: 'NORMAL',
  },
  RESTRICTED_STORAGE: {
    id: 'RESTRICTED_STORAGE',
    code: 'ZN-03',
    name: 'Restricted Storage',
    type: 'Class-IV Vault & Archive',
    description: 'High-security materials storage vault with perimeter optical detection beams and biometric magnetic interlocks.',
    areaSqm: 65,
    equipmentCount: 6,
    status: 'NORMAL',
  },
  CONTROL_ROOM: {
    id: 'CONTROL_ROOM',
    code: 'ZN-04',
    name: 'Control Room',
    type: 'Central Operations Command Station',
    description: 'Primary facility supervisory command station equipped with telemetry monitoring wall and manual alarm activation consoles.',
    areaSqm: 85,
    equipmentCount: 12,
    status: 'NORMAL',
  },
};

export const CATEGORY_PRIORITY: Record<EmergencyCategory, { priority: number; title: string; color: string; badge: string }> = {
  MANUAL_EMERGENCY: {
    priority: 1,
    title: 'Manual Alarm',
    color: '#a855f7',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  FIRE: {
    priority: 2,
    title: 'Fire Emergency',
    color: '#ef4444',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  GAS_LEAKAGE: {
    priority: 3,
    title: 'Gas Leakage',
    color: '#f97316',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  INTRUSION: {
    priority: 4,
    title: 'Security Breach',
    color: '#eab308',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

export interface AutomaticResponses {
  fireAlarm: boolean;
  evacuationWarning: boolean;
  gasAlarm: boolean;
  emergencyVentilation: boolean;
  zoneIsolation: boolean;
  securityAlarm: boolean;
  areaCompromised: boolean;
  accessControlWarning: boolean;
  generalEmergency: boolean;
  operatorAssessmentRequested: boolean;
}

export type InspectionState = 'NONE' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';

export interface ClosureConditionItem {
  id: string;
  label: string;
  status: 'SATISFIED' | 'PENDING' | 'FAILED';
  details: string;
}

export interface ClosureValidationResult {
  canClose: boolean;
  eligible?: boolean;
  conditions: ClosureConditionItem[];
  unmetReasons: string[];
}

export type IncidentAcknowledgement = {
  acknowledgedAt: number | null;
  acknowledgedBy: string | null;
};

export function isIncidentAcknowledged(
  incident?: { acknowledgedAt?: number | null } | null
): boolean {
  return typeof incident?.acknowledgedAt === 'number' && !isNaN(incident.acknowledgedAt) && incident.acknowledgedAt > 0;
}

export interface IncidentRecord {
  id: string;
  category: EmergencyCategory;
  zoneId: ZoneId;
  zoneCode?: string;
  zoneName?: string;
  severity?: SeverityLevel;
  title?: string;
  priority: number;
  detectedAt: number;
  acknowledgedAt: number | null;
  acknowledgedBy?: string | null;
  resolvedAt: number | null;
  state: AlarmLifecycleState;
  conditionActive: boolean;
  details: string;
  description?: string;
  responses: Partial<AutomaticResponses>;
  operatorAcknowledged?: boolean;
  inspectionState?: InspectionState;
  manualAssessmentState?: 'PENDING' | 'CONFIRMED_REAL' | 'CONFIRMED_FALSE_ALARM';
  closureAuthorizedBy?: string;
  closureAuthorizedAt?: number;
  closureValidationSnapshot?: ClosureValidationResult;
}

export interface SensorTelemetry {
  temperature: number; // 0 - 255 unsigned 8-bit scale, displayed in °C
  smokeDetected: boolean;
  gasConcentration: number; // 0 - 255 fictional scale
  intrusionDetected: boolean;
  manualEmergencyActive: boolean;
  manualEmergencyZone: ZoneId;
  sensorFaults: {
    temperature: boolean;
    smoke: boolean;
    gas: boolean;
    intrusion: boolean;
  };
}

export type EventSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface EventLogItem {
  id: string;
  timestamp: number;
  type:
  | 'EMERGENCY_DETECTED'
  | 'ALARM_ACTIVATED'
  | 'RESPONSE_ACTIVATED'
  | 'ALARM_ACKNOWLEDGED'
  | 'RESET_COMPLETED'
  | 'RESET_REJECTED'
  | 'SENSOR_FAULT'
  | 'SIMULATION_RESET'
  | 'SIMULATION_MODE_CHANGED'
  | 'MANUAL_INTERVENTION'
  | 'TEAM_DISPATCHED'
  | 'TEAM_ARRIVED'
  | 'SUPPRESSION_FAILED'
  | 'ISOLATION_FAILED'
  | 'VENTILATION_FAILED'
  | 'SECURITY_VERIFIED'
  | 'RECOVERY_COMPLETED'
  | 'COUNTERMEASURE_ACTIVATED'
  | 'MANUAL_EMERGENCY_INITIATED'
  | 'MANUAL_ASSESSMENT_CONFIRMED'
  | 'INSPECTION_REQUESTED'
  | 'INSPECTION_PASSED'
  | 'SAFETY_VERIFIED'
  | 'INSPECTION_FAILED'
  | 'INCIDENT_RESOLVED'
  | 'WARNING_CONDITION'
  | 'COMMAND_REJECTED'
  | 'EQUIPMENT_RECOVERED'
  | 'BACKUP_DISPATCHED'
  | 'EQUIPMENT_ISOLATED'
  | 'EQUIPMENT_ACTIVATED'
  | 'EQUIPMENT_FAILED'
  | 'HAZARD_CONTAINED'
  | 'MANUAL_OVERRIDE'
  | 'CONDITION_CLEARED';
  category?: EmergencyCategory;
  zoneId?: ZoneId;
  message: string;
  severity: EventSeverity;
}

export type EquipmentOperatingState =
  | 'STANDBY'
  | 'ACTIVATION_REQUESTED'
  | 'OPERATING'
  | 'ISOLATED'
  | 'FAULT'
  | 'FAILED'
  | 'COMPLETED'
  | 'OVERRIDE'
  | 'RECOVERY';

export type EquipmentControlMode = 'AUTOMATIC' | 'MANUAL_OVERRIDE' | 'RECOVERY';

export interface ProtectionEquipmentItem {
  id: string;
  name: string;
  type?: 'SUPPRESSION' | 'SHUTDOWN' | 'VENTILATION' | 'ISOLATION' | 'ACCESS_CONTROL' | 'ALARM';
  zoneId: ZoneId;
  state: EquipmentOperatingState;
  health?: 'nominal' | 'fault';
  details: string;
  controlMode?: EquipmentControlMode;
  lastCommand?: string;
}

export interface ProtectionEquipmentState {
  fireSuppression: ProtectionEquipmentItem;
  labEquipmentShutdown: ProtectionEquipmentItem;
  fireVentIsolation: ProtectionEquipmentItem;
  gasIsolationValve: ProtectionEquipmentItem;
  emergencyVentilation: ProtectionEquipmentItem;
  chemicalEquipmentShutdown: ProtectionEquipmentItem;
  accessPointLockdown: ProtectionEquipmentItem;
  evacuationAlarm: ProtectionEquipmentItem;
}

export type TeamDispatchStage =
  | 'STANDBY'
  | 'NOTIFICATION_INITIATED'
  | 'DISPATCH_CONFIRMED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'INTERVENTION_UNDERWAY'
  | 'RESPONSE_COMPLETED'
  | 'FAILED'
  | 'UNAVAILABLE';

export interface ResponseTeam {
  id: string;
  name: string;
  type: 'FIRE' | 'HAZMAT' | 'SECURITY';
  stage: TeamDispatchStage;
  progress: number; // 0 - 100%
  etaSeconds: number;
  details: string;
  dispatchElapsedSeconds?: number;
  backupRequested?: boolean;
  assessmentUnderway?: boolean;
  assessmentProgress?: number;
  assessmentCompleted?: boolean;
}

export interface ResponseTeamsState {
  fireTeam: ResponseTeam;
  hazmatTeam: ResponseTeam;
  securityTeam: ResponseTeam;
}

export type ContainmentStatus = 'SAFE' | 'UNCONTROLLED' | 'MITIGATING' | 'CONTAINED';

export interface HazardEnvironment {
  fireIntensity: number; // 0 - 100%
  fireIgnited: boolean;
  ambientTemperature: number; // °C
  smokeConcentration: number; // 0 - 100%
  gasReleaseRate: number; // 0 - 100
  gasSourceActive: boolean;
  gasConcentration: number; // 0 - 255
  intrusionBreachActive: boolean;
  manualEmergencyActive?: boolean;
  smokeClearCountdown?: number;
  gasIsolationCountdown?: number;
  securityAreaStatus?: 'BREACHED' | 'PENDING_VERIFICATION' | 'SECURED_PENDING_VERIFICATION' | 'SECURED';
  inspectionCountdown: Partial<Record<ZoneId, number>>;
  inspectionStatus: Partial<Record<ZoneId, InspectionState>>;
  containmentStatus: {
    fire: ContainmentStatus;
    gas: ContainmentStatus;
    intrusion: ContainmentStatus;
    manual: ContainmentStatus;
  };
}

export interface EquipmentFailureConfig {
  fireSuppressionFailed: boolean;
  gasIsolationFailed: boolean;
  ventilationFailed: boolean;
  securityDelay: boolean;
}

export type ManualInterventionCommandType =
  // Fire countermeasures
  | 'RETRY_FIRE_SUPPRESSION'
  | 'MANUAL_FIRE_SUPPRESSION_ACTIVATE'
  | 'REQUEST_BACKUP_FIRE_BRIGADE'
  | 'TRIP_RESEARCH_POWER'
  | 'RESTORE_RESEARCH_POWER'
  | 'SEAL_FIRE_DAMPERS'
  | 'REOPEN_FIRE_DAMPERS'
  | 'RECOVER_FIRE_SYSTEMS'
  // Gas countermeasures
  | 'RETRY_GAS_ISOLATION'
  | 'MANUAL_GAS_ISOLATE'
  | 'ACTIVATE_EMERGENCY_VENTILATION'
  | 'REQUEST_HAZMAT_BACKUP'
  | 'TRIP_CHEMICAL_POWER'
  | 'RESTORE_CHEMICAL_POWER'
  | 'PURGE_AND_RECOVER_GAS'
  // Security countermeasures
  | 'REQUEST_SECURITY_DISPATCH'
  | 'REQUEST_BACKUP_SECURITY'
  | 'START_SECURITY_ASSESSMENT'
  | 'CONFIRM_AREA_SECURED'
  | 'RESTORE_VAULT_ACCESS'
  | 'REARM_OPTICAL_PERIMETER'
  // Safety Verification & Closure Commands
  | 'REQUEST_FIRE_INSPECTION'
  | 'REQUEST_GAS_INSPECTION'
  | 'REQUEST_SECURITY_INSPECTION'
  | 'REQUEST_MANUAL_EMERGENCY_INSPECTION'
  | 'RESTORE_GAS_SUPPLY';

export interface ManualInterventionResult {
  success: boolean;
  message: string;
  commandType: ManualInterventionCommandType;
  zoneId: ZoneId;
}

export type ZoneHazardState = 'NORMAL' | 'ACTIVE' | 'MITIGATING' | 'CONTAINED' | 'VERIFIED_SAFE';

export type IncidentLifecycleStatus =
  | 'NONE'
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'CONTAINMENT_CONFIRMED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED_AWAITING_CLOSURE'
  | 'RESOLVED';

export type ZoneEquipmentState =
  | 'OPERATIONAL'
  | 'AUTOMATICALLY_ACTIVATED'
  | 'ISOLATED'
  | 'SHUTDOWN'
  | 'FAULTED'
  | 'RECOVERY_PENDING'
  | 'RESTORING'
  | 'RESTORED';

export type ZoneOperationalStatus =
  | 'ACTIVE_HAZARD'
  | 'RESPONSE_IN_PROGRESS'
  | 'HAZARD_CONTAINED'
  | 'AWAITING_SAFETY_VERIFICATION'
  | 'VERIFIED_SAFE_AWAITING_CLOSURE'
  | 'INCIDENT_RESOLVED_RECOVERY_PENDING'
  | 'ALARM_RETAINED'
  | 'RESET_REQUIRED'
  | 'EQUIPMENT_RECOVERY_REQUIRED'
  | 'NORMAL'
  | 'DIAGNOSTIC_FAULT';

export type ZoneRecoveryLifecycleState =
  | 'RECOVERY_LOCKED'
  | 'RECOVERY_PERMITTED'
  | 'RESTORING'
  | 'RESTORED'
  | 'RECOVERY_FAILED';

export interface ZoneRecoveryRecord {
  state: ZoneRecoveryLifecycleState;
  progress: number;
  lastRestoredAt?: number;
  failureReason?: string;
  gasSupplyAuthorised?: boolean;
}

export interface ZoneOperationalState {
  status: ZoneOperationalStatus;
  label: string;
  badgeClass: string;
  dotColor: string;
  details: string;
  hazardState: ZoneHazardState;
  incidentState: IncidentLifecycleStatus;
  equipmentState: ZoneEquipmentState;
  recoveryLifecycleState: ZoneRecoveryLifecycleState;
  canRestoreEquipment: boolean;
  recoveryUnmetReasons: string[];
}

export type GuidedActionStage =
  | 'ACKNOWLEDGEMENT'
  | 'CLEAR_MANUAL_TRIP'
  | 'SECURITY_ASSESSMENT'
  | 'SAFETY_INSPECTION'
  | 'CLOSURE'
  | 'ALARM_RESET'
  | 'EQUIPMENT_RECOVERY';

export interface PendingOperatorAction {
  id: string;
  priority: number; // 1 (Manual), 2 (Fire), 3 (Gas), 4 (Security)
  incidentId?: string;
  zoneId: ZoneId;
  category: EmergencyCategory;
  stage: GuidedActionStage;
  badgeType: 'critical' | 'action_required' | 'info';
  title: string;
  description: string;
  actionLabel: string;
  destinationView: OperationalView;
  sectionId?: string;
  targetControlId: string;
  unmetPrerequisites?: string[];
}

export interface GuidedNavigationTarget {
  destinationView: OperationalView;
  zoneId?: ZoneId;
  incidentId?: string;
  sectionId?: string;
  targetControlId?: string;
  timestamp?: number;
}
