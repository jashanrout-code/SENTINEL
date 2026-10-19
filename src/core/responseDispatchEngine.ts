import type {
  ResponseTeam,
  ResponseTeamsState,
  TeamDispatchStage,
  EventLogItem,
  ZoneId,
} from '../types';

export interface DispatchStepOutput {
  nextTeams: ResponseTeamsState;
  newEvents: EventLogItem[];
}

/**
 * Pure deterministic advancement of a single emergency response team
 * according to the exact 30-second industrial dispatch schedule.
 */
export function advanceTeamDispatch(
  currentTeam: ResponseTeam,
  zoneId: ZoneId,
  timestamp: number = Date.now()
): { nextTeam: ResponseTeam; event?: EventLogItem } {
  // If team is in terminal or inactive states, do not advance timer
  if (currentTeam.stage === 'STANDBY' || currentTeam.stage === 'FAILED' || currentTeam.stage === 'UNAVAILABLE') {
    return { nextTeam: currentTeam };
  }

  if (currentTeam.stage === 'RESPONSE_COMPLETED') {
    return {
      nextTeam: {
        ...currentTeam,
        progress: 100,
        etaSeconds: 0,
      },
    };
  }

  const elapsed = (currentTeam.dispatchElapsedSeconds ?? 0) + 1;
  const progress = Math.min(100, Math.round((elapsed / 30) * 100));
  const etaSeconds = Math.max(0, 30 - elapsed);

  let stage: TeamDispatchStage = currentTeam.stage;
  let details = currentTeam.details;
  let event: EventLogItem | undefined;

  if (elapsed < 3) {
    stage = 'NOTIFICATION_INITIATED';
    details = currentTeam.backupRequested
      ? 'Backup response notification initiated. Turnout in progress.'
      : 'Automated dispatch notification initiated. Turnout in progress.';
  } else if (elapsed < 6) {
    stage = 'DISPATCH_CONFIRMED';
    details = currentTeam.backupRequested
      ? 'Backup team turnout confirmed. Response unit mobilizing.'
      : 'Turnout confirmed. Response vehicle departing dispatch bay.';
  } else if (elapsed < 18) {
    stage = 'EN_ROUTE';
    details = currentTeam.backupRequested
      ? 'Backup team en route via priority facility service corridors.'
      : 'Response vehicle en route to incident staging sector.';
  } else if (elapsed < 22) {
    if (stage !== 'ON_SITE') {
      stage = 'ON_SITE';
      event = {
        id: `EVT-TM-ARR-${currentTeam.id}-${timestamp}`,
        timestamp,
        type: 'TEAM_ARRIVED',
        category: currentTeam.type === 'FIRE' ? 'FIRE' : currentTeam.type === 'HAZMAT' ? 'GAS_LEAKAGE' : 'INTRUSION',
        zoneId,
        message: `${currentTeam.name} arrived on site at ${zoneId.replace('_', ' ')}. Establishing operational perimeter.`,
        severity: 'info',
      };
    }
    details = `${currentTeam.name} on site. Deploying safety equipment and staging area lines.`;
  } else if (elapsed < 30) {
    stage = 'INTERVENTION_UNDERWAY';
    details = `${currentTeam.name} conducting active tactical intervention and hazard mitigation.`;
  } else {
    // 30 seconds reached: completed
    stage = 'RESPONSE_COMPLETED';
    details = `${currentTeam.name} response procedures completed on site.`;
  }

  const nextTeam: ResponseTeam = {
    ...currentTeam,
    stage,
    progress: stage === 'RESPONSE_COMPLETED' ? 100 : progress,
    etaSeconds: stage === 'RESPONSE_COMPLETED' ? 0 : etaSeconds,
    dispatchElapsedSeconds: elapsed,
    details,
  };

  return { nextTeam, event };
}

export function stepResponseDispatchEngine(
  currentTeams: ResponseTeamsState,
  activeHazardTypes: { fire: boolean; gas: boolean; security: boolean },
  timestamp: number = Date.now()
): DispatchStepOutput {
  const newEvents: EventLogItem[] = [];

  let nextFireTeam = { ...currentTeams.fireTeam };
  let nextHazmatTeam = { ...currentTeams.hazmatTeam };
  let nextSecurityTeam = { ...currentTeams.securityTeam };

  // Fire Team dispatch trigger & advancement
  if (activeHazardTypes.fire) {
    if (nextFireTeam.stage === 'STANDBY') {
      nextFireTeam.stage = 'NOTIFICATION_INITIATED';
      nextFireTeam.dispatchElapsedSeconds = 0;
      nextFireTeam.etaSeconds = 30;
      nextFireTeam.progress = 0;
      newEvents.push({
        id: `EVT-DISP-FIRE-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'FIRE',
        zoneId: 'RESEARCH_LAB',
        message: 'Internal Fire Brigade dispatched automatically to Research Laboratory.',
        severity: 'info',
      });
    } else {
      const { nextTeam, event } = advanceTeamDispatch(nextFireTeam, 'RESEARCH_LAB', timestamp);
      nextFireTeam = nextTeam;
      if (event) newEvents.push(event);
    }
  }

  // HazMat Team dispatch trigger & advancement
  if (activeHazardTypes.gas) {
    if (nextHazmatTeam.stage === 'STANDBY') {
      nextHazmatTeam.stage = 'NOTIFICATION_INITIATED';
      nextHazmatTeam.dispatchElapsedSeconds = 0;
      nextHazmatTeam.etaSeconds = 30;
      nextHazmatTeam.progress = 0;
      newEvents.push({
        id: `EVT-DISP-GAS-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'GAS_LEAKAGE',
        zoneId: 'CHEMICAL_LAB',
        message: 'Hazardous Materials Team dispatched automatically to Chemical Laboratory.',
        severity: 'info',
      });
    } else {
      const { nextTeam, event } = advanceTeamDispatch(nextHazmatTeam, 'CHEMICAL_LAB', timestamp);
      nextHazmatTeam = nextTeam;
      if (event) newEvents.push(event);
    }
  }

  // Security Team dispatch trigger & advancement
  if (activeHazardTypes.security) {
    if (nextSecurityTeam.stage === 'STANDBY') {
      nextSecurityTeam.stage = 'NOTIFICATION_INITIATED';
      nextSecurityTeam.dispatchElapsedSeconds = 0;
      nextSecurityTeam.etaSeconds = 30;
      nextSecurityTeam.progress = 0;
      newEvents.push({
        id: `EVT-DISP-SEC-${timestamp}`,
        timestamp,
        type: 'TEAM_DISPATCHED',
        category: 'INTRUSION',
        zoneId: 'RESTRICTED_STORAGE',
        message: 'Tactical Security Unit dispatched automatically to Restricted Storage.',
        severity: 'info',
      });
    } else {
      const { nextTeam, event } = advanceTeamDispatch(nextSecurityTeam, 'RESTRICTED_STORAGE', timestamp);
      nextSecurityTeam = nextTeam;
      if (event) newEvents.push(event);
    }
  }

  return {
    nextTeams: {
      fireTeam: nextFireTeam,
      hazmatTeam: nextHazmatTeam,
      securityTeam: nextSecurityTeam,
    },
    newEvents,
  };
}
